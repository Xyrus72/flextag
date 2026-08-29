const express = require('express')
const router  = express.Router()
const SSLCommerzPayment = require('sslcommerz-lts')
const BrandLedger = require('../models/BrandLedger')
const User = require('../models/User')
const { requireAuth, requireRole } = require('../middleware/auth')
const wallet = require('../services/brandWallet')
const audit = require('../services/audit')
const { notifySafe } = require('../services/notifications')

/**
 * Brand funding — money INTO FlexTag.
 *
 * Two ways in, because Bangladeshi D2C brands actually use both:
 *   1. Card / bKash / Nagad through SSLCommerz (instant, self-serve)
 *   2. Bank transfer — the brand declares it, an admin confirms it against the
 *      statement. Nothing is credited until a human confirms.
 *
 * A declared-but-unconfirmed transfer sits as a `pending` funding row: visible
 * to both sides, spendable by neither.
 */

const STORE_ID   = process.env.SSLCZ_STORE_ID
const STORE_PASS = process.env.SSLCZ_STORE_PASSWORD
const IS_LIVE    = process.env.SSLCZ_IS_LIVE === 'true'
const FRONTEND   = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
const BACKEND    = (process.env.BACKEND_URL  || `http://localhost:${process.env.PORT || 1643}`).replace(/\/$/, '')
const gatewayReady = () => !!(STORE_ID && STORE_PASS)
const genTranId = () => 'FUND-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)

// ── GET /api/brand-wallet — balance + ledger ───────────────────────────────
router.get('/', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const brandId = req.user.role === 'admin' && req.query.brandId ? req.query.brandId : req.user._id
    const [rows, config] = await Promise.all([
      BrandLedger.find({ brandId }).sort({ createdAt: -1 }).limit(200).lean(),
      wallet.settings(),
    ])
    res.json({
      ...wallet.computeBrandBalance(rows),
      entries: rows,
      gatewayReady: gatewayReady(),
      ...config,
    })
  } catch (err) {
    console.error('[brand wallet GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/brand-wallet/fund/init — start a gateway payment ─────────────
router.post('/fund/init', requireAuth, requireRole('brand'), async (req, res) => {
  try {
    if (!gatewayReady()) {
      return res.status(503).json({ message: 'Card payment is not configured yet — use a bank transfer, or ask FlexTag to enable the gateway.' })
    }
    const config = await wallet.settings()
    const amount = Math.round(Number(req.body?.amount) || 0)
    if (amount < config.minFunding) {
      return res.status(400).json({ message: `Minimum top-up is ৳${config.minFunding.toLocaleString()}.` })
    }

    const tran_id = genTranId()
    // The row exists BEFORE the gateway session, so a payment that succeeds
    // while the browser dies is still reconcilable from the transaction id.
    const entry = await BrandLedger.create({
      brandId: req.user._id, type: 'funding', amount, status: 'pending',
      method: 'sslcommerz', transactionId: tran_id,
      desc: `Campaign funding — ৳${amount.toLocaleString()}`,
    })

    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASS, IS_LIVE)
    const apiResponse = await sslcz.init({
      total_amount: amount, currency: 'BDT', tran_id,
      success_url: `${BACKEND}/api/brand-wallet/fund/success`,
      fail_url:    `${BACKEND}/api/brand-wallet/fund/fail`,
      cancel_url:  `${BACKEND}/api/brand-wallet/fund/fail`,
      ipn_url:     `${BACKEND}/api/brand-wallet/fund/ipn`,
      shipping_method: 'NO', product_name: 'FlexTag campaign funding',
      product_category: 'service', product_profile: 'non-physical-goods',
      cus_name: req.user.companyName || req.user.name, cus_email: req.user.email,
      cus_add1: req.user.address || 'Dhaka', cus_city: 'Dhaka', cus_postcode: '1000',
      cus_country: 'Bangladesh', cus_phone: req.user.phone || '01700000000',
    })

    if (!apiResponse?.GatewayPageURL) {
      await BrandLedger.deleteOne({ _id: entry._id })
      console.error('[brand fund init] SSLCommerz error:', apiResponse?.failedreason || apiResponse)
      return res.status(502).json({ message: 'Payment gateway error. Check the SSLCommerz credentials.' })
    }
    res.json({ url: apiResponse.GatewayPageURL, tran_id })
  } catch (err) {
    console.error('[brand fund init]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

/** Confirm a pending gateway funding row exactly once. */
async function settleFunding(tran_id, val_id, details = {}) {
  const entry = await BrandLedger.findOneAndUpdate(
    { transactionId: tran_id, type: 'funding', status: 'pending' },
    { $set: { status: 'completed', valId: val_id || '', paymentDetails: details } },
    { new: true },
  )
  if (!entry) return null   // already settled (success + IPN both fired) or unknown
  notifySafe(entry.brandId, {
    type: 'wallet', icon: '💳', title: 'Funding received',
    body: `৳${entry.amount.toLocaleString()} is now available for your campaigns.`,
    link: '/brand/wallet',
  })
  audit.record({
    actor: entry.brandId, action: audit.ACTIONS.BRAND_FUNDED, targetType: 'user', targetId: entry.brandId,
    amount: entry.amount, summary: `Funded ৳${entry.amount} via SSLCommerz (${tran_id})`,
  })
  return entry
}

// ── POST /api/brand-wallet/fund/success ────────────────────────────────────
router.post('/fund/success', async (req, res) => {
  try {
    const { tran_id, val_id } = req.body
    if (!tran_id || !val_id) return res.redirect(`${FRONTEND}/brand/wallet?funded=missing_data`)
    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASS, IS_LIVE)
    const validation = await sslcz.validate({ val_id })
    if (validation?.status !== 'VALID' && validation?.status !== 'VALIDATED') {
      return res.redirect(`${FRONTEND}/brand/wallet?funded=validation_failed`)
    }
    await settleFunding(tran_id, val_id, {
      bank_tran_id: req.body.bank_tran_id, card_type: req.body.card_type, store_amount: req.body.store_amount,
    })
    res.redirect(`${FRONTEND}/brand/wallet?funded=ok`)
  } catch (err) {
    console.error('[brand fund success]', err)
    res.redirect(`${FRONTEND}/brand/wallet?funded=error`)
  }
})

// ── POST /api/brand-wallet/fund/fail ───────────────────────────────────────
router.post('/fund/fail', async (req, res) => {
  try {
    if (req.body?.tran_id) {
      await BrandLedger.updateOne({ transactionId: req.body.tran_id, status: 'pending' }, { $set: { status: 'failed' } })
    }
    res.redirect(`${FRONTEND}/brand/wallet?funded=failed`)
  } catch {
    res.redirect(`${FRONTEND}/brand/wallet?funded=failed`)
  }
})

// ── POST /api/brand-wallet/fund/ipn — server-to-server backup ──────────────
router.post('/fund/ipn', async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body
    if (status === 'VALID' || status === 'VALIDATED') {
      const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASS, IS_LIVE)
      const validation = await sslcz.validate({ val_id })
      if (validation?.status === 'VALID' || validation?.status === 'VALIDATED') await settleFunding(tran_id, val_id, { via: 'ipn' })
    }
    res.status(200).json({ message: 'IPN received.' })
  } catch (err) {
    console.error('[brand fund IPN]', err)
    res.status(200).json({ message: 'IPN received.' })
  }
})

// ── POST /api/brand-wallet/fund/declare — "I sent a bank transfer" ─────────
router.post('/fund/declare', requireAuth, requireRole('brand'), async (req, res) => {
  try {
    const config = await wallet.settings()
    const amount = Math.round(Number(req.body?.amount) || 0)
    const reference = String(req.body?.reference || '').slice(0, 120)
    if (amount < config.minFunding) {
      return res.status(400).json({ message: `Minimum top-up is ৳${config.minFunding.toLocaleString()}.` })
    }
    const entry = await BrandLedger.create({
      brandId: req.user._id, type: 'funding', amount, status: 'pending', method: 'bank_transfer',
      transactionId: reference, desc: `Bank transfer declared${reference ? ` — ref ${reference}` : ''}`,
    })
    User.find({ role: 'admin' }).select('_id').lean()
      .then(admins => admins.forEach(a => notifySafe(a._id, {
        type: 'wallet', icon: '🏦', title: 'Bank transfer to confirm',
        body: `${req.user.companyName || req.user.name} says they sent ৳${amount.toLocaleString()}${reference ? ` (ref ${reference})` : ''}.`,
        link: '/admin/financial',
      })))
      .catch(() => {})
    res.status(201).json({ entry, message: 'Recorded. It becomes spendable once FlexTag confirms the transfer.' })
  } catch (err) {
    console.error('[brand fund declare]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── Admin ───────────────────────────────────────────────────────────────── */

// GET /api/brand-wallet/admin/overview — platform float + who is running dry
router.get('/admin/overview', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [totals, pending, brands] = await Promise.all([
      BrandLedger.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      BrandLedger.find({ status: 'pending', type: 'funding' })
        .populate('brandId', 'companyName name email')
        .sort({ createdAt: -1 }).limit(50).lean(),
      BrandLedger.aggregate([
        { $match: { status: 'completed' } },
        { $group: {
          _id: '$brandId',
          funded:   { $sum: { $cond: [{ $in: ['$type', ['funding', 'refund']] }, '$amount', 0] } },
          spent:    { $sum: { $cond: [{ $in: ['$type', ['spend', 'fee']] }, '$amount', 0] } },
        } },
      ]),
    ])
    const by = Object.fromEntries(totals.map(t => [t._id, t.total]))
    const float = (by.funding || 0) + (by.refund || 0) - (by.spend || 0) - (by.fee || 0)
    const withNames = await User.find({ _id: { $in: brands.map(b => b._id) } }).select('companyName name email').lean()
    const nameOf = Object.fromEntries(withNames.map(u => [String(u._id), u.companyName || u.name]))
    res.json({
      float,
      funded: by.funding || 0,
      spent: by.spend || 0,
      refunded: by.refund || 0,
      fees: by.fee || 0,
      pendingTransfers: pending,
      balances: brands
        .map(b => ({ brandId: b._id, name: nameOf[String(b._id)] || 'Brand', balance: b.funded - b.spent }))
        .sort((a, b) => a.balance - b.balance),
    })
  } catch (err) {
    console.error('[brand wallet overview]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/brand-wallet/admin/confirm/:id — confirm a declared bank transfer
router.post('/admin/confirm/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const entry = await BrandLedger.findOneAndUpdate(
      { _id: req.params.id, type: 'funding', status: 'pending' },
      { $set: { status: 'completed', confirmedBy: req.user._id } },
      { new: true },
    )
    if (!entry) return res.status(409).json({ message: 'That transfer is not pending confirmation.' })
    notifySafe(entry.brandId, {
      type: 'wallet', icon: '💳', title: 'Transfer confirmed',
      body: `৳${entry.amount.toLocaleString()} is now available for your campaigns.`,
      link: '/brand/wallet',
    })
    audit.record({
      actor: req.user, action: audit.ACTIONS.BRAND_FUNDED, targetType: 'user', targetId: entry.brandId,
      amount: entry.amount, summary: `Confirmed a ৳${entry.amount} bank transfer`, req,
    })
    res.json({ entry, message: 'Transfer confirmed and credited.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/brand-wallet/admin/credit — manual adjustment, always on the record
router.post('/admin/credit', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { brandId, amount, reason, type = 'funding' } = req.body || {}
    const value = Math.round(Number(amount) || 0)
    if (!brandId || value <= 0) return res.status(400).json({ message: 'brandId and a positive amount are required.' })
    if (!['funding', 'refund', 'fee'].includes(type)) return res.status(400).json({ message: 'Unknown entry type.' })

    const entry = await BrandLedger.create({
      brandId, type, amount: value, status: 'completed', method: 'admin_credit',
      desc: String(reason || 'Manual adjustment by admin').slice(0, 200), confirmedBy: req.user._id,
    })
    audit.record({
      actor: req.user, action: audit.ACTIONS.BRAND_FUNDED, targetType: 'user', targetId: brandId,
      amount: value, summary: `${type} ৳${value} — ${reason || 'manual adjustment'}`, req,
    })
    res.status(201).json({ entry, message: 'Adjustment recorded.' })
  } catch (err) {
    console.error('[brand credit]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
