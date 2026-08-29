const express     = require('express')
const router      = express.Router()
const Transaction = require('../models/Transaction')
const { requireAuth, requireRole } = require('../middleware/auth')
const { computeBalance, walletBalance } = require('../utils/balance')
const { normalizeBdMobile, isValidBdMobile, maskMobile } = require('../utils/phone')
const payouts = require('../services/payouts')
const audit = require('../services/audit')
const fraud = require('../services/fraud')
const { notifySafe } = require('../services/notifications')
const { getSettingsMap } = require('../utils/settings')
const User = require('../models/User')

const PAYOUT_METHODS = ['bkash', 'nagad', 'rocket']

/**
 * The withdrawal floor is an admin setting (Commission & Settings), with the env
 * var as the fallback — it used to be a constant here AND a setting there,
 * which meant the admin panel showed a number the API ignored.
 */
async function minWithdrawal() {
  const m = await getSettingsMap().catch(() => ({}))
  const fromSettings = Number(m.minWithdrawal)
  if (Number.isFinite(fromSettings) && fromSettings > 0) return fromSettings
  return Number(process.env.MIN_WITHDRAWAL) || 500
}

// ── GET /api/transactions — creator's own transactions + balances ──────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {}
    if (req.user.role === 'creator') filter.userId = req.user._id
    // admin sees all

    const transactions = await Transaction.find(filter)
      .populate('orderId', 'orderId product')
      .sort({ createdAt: -1 })

    // Balance math lives in utils/balance.js so the Wallet, the withdraw check
    // and the payout send can never disagree about what is spendable.
    const balance = req.user.role === 'creator'
      ? computeBalance(await Transaction.find({ userId: req.user._id }).select('type status amount').lean())
      : { totalEarnings: 0, pendingEscrow: 0, available: 0 }

    res.json({
      transactions,
      totalEarnings: balance.totalEarnings,
      pendingEscrow: balance.pendingEscrow,
      available:     balance.available,
      reserved:      balance.reserved || 0,
      minWithdrawal: await minWithdrawal(),
      payoutMethods: PAYOUT_METHODS,
      blocked:       !!req.user.blocked,
      blockReason:   req.user.blockReason || '',
    })
  } catch (err) {
    console.error('[transactions GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/transactions/withdraw — creator requests a payout ────────────
router.post('/withdraw', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { amount, bkashNumber, account, method } = req.body
    const rawAccount = account || bkashNumber
    const payoutMethod = PAYOUT_METHODS.includes(String(method || '').toLowerCase()) ? String(method).toLowerCase() : 'bkash'
    if (!amount || !rawAccount) {
      return res.status(400).json({ message: 'amount and a payout number are required.' })
    }
    if (!isValidBdMobile(rawAccount)) {
      return res.status(400).json({ message: 'That does not look like a Bangladeshi mobile number (e.g. 01712345678).' })
    }
    const floor = await minWithdrawal()
    if (Number(amount) < floor) {
      return res.status(400).json({ message: `Minimum withdrawal is ৳${floor}.` })
    }

    // A held account should hear it here, not silently sit in a queue that will
    // refuse them later.
    const gate = await fraud.guard(req.user, { action: 'payout' })
    if (!gate.allowed && req.user.blocked) {
      return res.status(403).json({ message: gate.reason })
    }

    // One pending payout at a time — stops accidental double requests and keeps
    // the queue readable for whoever settles it.
    const openRequest = await Transaction.exists({ userId: req.user._id, type: 'withdrawal', status: 'pending' })
    if (openRequest) {
      return res.status(400).json({ message: 'You already have a payout in the queue. It will be sent shortly.' })
    }

    const balance = await walletBalance(req.user._id)
    if (Number(amount) > balance.available) {
      return res.status(400).json({ message: `Insufficient available balance (৳${balance.available.toLocaleString()}).` })
    }

    const normalized = normalizeBdMobile(rawAccount)
    const tx = await Transaction.create({
      userId:      req.user._id,
      type:        'withdrawal',
      amount:      Number(amount),
      desc:        `${payoutMethod === 'bkash' ? 'bKash' : payoutMethod === 'nagad' ? 'Nagad' : 'Rocket'} payout to ${maskMobile(normalized)}`,
      status:      'pending',
      payoutMethod,
      payoutAccount: normalized,
      payoutStatus: 'queued',
      bkashNumber:  normalized,   // legacy field kept in sync for old readers
    })

    audit.record({
      actor: req.user, action: audit.ACTIONS.PAYOUT_REQUESTED, targetType: 'transaction', targetId: tx._id,
      amount: tx.amount, summary: `Requested ৳${tx.amount} to ${maskMobile(normalized)} (${payoutMethod})`, req,
    })
    // Re-score on the way out: a payout request is when a ring's shared number
    // becomes visible, and the queue reads the score at send time.
    fraud.assessInBackground(req.user._id)
    // Somebody has to know money is waiting — silent queues are how creators end
    // up waiting a week.
    User.find({ role: 'admin' }).select('_id').lean()
      .then(admins => admins.forEach(a => notifySafe(a._id, {
        type: 'payout', icon: '💸', title: 'Payout requested',
        body: `${req.user.name} asked for ৳${tx.amount.toLocaleString()} (${payoutMethod}).`,
        link: '/admin/payouts',
      })))
      .catch(() => {})

    res.status(201).json({
      transaction: tx,
      message: 'Payout requested — you will get a notification the moment it is sent.',
    })
  } catch (err) {
    console.error('[withdraw POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/transactions/topup — creator adds money to wallet ────────────
router.post('/topup', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Valid amount is required.' })
    }

    const tx = await Transaction.create({
      userId:      req.user._id,
      type:        'top_up',
      amount:      Number(amount),
      desc:        `Wallet Top-Up via ${paymentMethod || 'Gateway'}`,
      status:      'completed',
    })

    res.status(201).json({ transaction: tx, message: 'Wallet topped up successfully.' })
  } catch (err) {
    console.error('[topup POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── Payout queue (admin) ─────────────────────────────────────────────────
 * The disbursement itself — claiming, balance re-checks, provider calls,
 * receipts — lives in services/payouts. These routes are just the door.
 */

// GET /api/transactions/payouts?status=queued
router.get('/payouts', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query
    const filter = { type: 'withdrawal' }
    if (status && status !== 'all') {
      filter.payoutStatus = status === 'queued' ? { $in: ['queued', null] } : status
    }
    const [rows, summary] = await Promise.all([
      Transaction.find(filter)
        .populate('userId', 'name email phone instagramHandle tier igVerified')
        .sort({ createdAt: 1 })
        .limit(200)
        .lean(),
      payouts.queueSummary(),
    ])
    // Each row carries the requester's live balance so an admin can spot a
    // request that has gone underwater since it was made.
    const payoutRows = await Promise.all(rows.map(async (r) => ({
      ...r,
      payoutStatus: r.payoutStatus || 'queued',
      balance: r.status === 'pending' ? (await walletBalance(r.userId?._id || r.userId, { excludeTxId: r._id })).available : null,
    })))
    res.json({ payouts: payoutRows, summary, ...payouts.providerInfo(), minWithdrawal: MIN_WITHDRAWAL })
  } catch (err) {
    console.error('[payouts GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/transactions/payouts/:id/send
router.post('/payouts/:id/send', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await payouts.sendPayout(req.params.id, { actorId: req.user._id })
    res.json({
      transaction: result.transaction,
      status: result.status,
      message: result.status === 'paid' ? 'Payout sent.' : result.message || `Payout is ${result.status}.`,
    })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error.' })
  }
})

// POST /api/transactions/payouts/:id/reject  { reason }
router.post('/payouts/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tx = await payouts.rejectPayout(req.params.id, { reason: req.body?.reason, actorId: req.user._id })
    res.json({ transaction: tx, message: 'Request returned to the creator\'s balance.' })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error.' })
  }
})

// POST /api/transactions/payouts/:id/reconcile  { reference }
router.post('/payouts/:id/reconcile', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tx = await payouts.reconcilePayout(req.params.id, { reference: req.body?.reference, actorId: req.user._id })
    res.json({ transaction: tx, message: 'Payout marked as settled.' })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error.' })
  }
})

// POST /api/transactions/payouts/run — send the whole queue
router.post('/payouts/run', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const results = await payouts.processQueue({ actorId: req.user._id, limit: Number(req.body?.limit) || 25, ids: req.body?.ids })
    const paid = results.filter(r => r.status === 'paid').length
    res.json({
      results,
      message: results.length === 0 ? 'Nothing in the queue.' : `${paid}/${results.length} payouts sent.`,
    })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error.' })
  }
})

// ── POST /api/transactions/withdraw/:id/cancel — creator changes their mind ─
// Their money, their call: while it is still queued they can pull it back
// (wrong number, wrong amount) without waiting for an admin.
router.post('/withdraw/:id/cancel', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, type: 'withdrawal', status: 'pending', payoutStatus: { $in: ['queued', null] } },
      { $set: { status: 'failed', payoutStatus: 'rejected', payoutError: 'Cancelled by the creator' } },
      { new: true },
    )
    if (!tx) return res.status(409).json({ message: 'That payout is already being processed — contact support to stop it.' })
    audit.record({ actor: req.user, action: audit.ACTIONS.PAYOUT_CANCELLED, targetType: 'transaction', targetId: tx._id, amount: tx.amount, summary: 'Creator cancelled their own request', req })
    res.json({ transaction: tx, message: 'Request cancelled — the money is back in your balance.' })
  } catch (err) {
    console.error('[withdraw cancel]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/transactions/export.csv — reconciliation export ───────────────
// Admins get the payout ledger; creators get their own statement.
router.get('/export.csv', requireAuth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? (req.query.type === 'payouts' ? { type: 'withdrawal' } : {})
      : { userId: req.user._id }
    const rows = await Transaction.find(filter)
      .populate('userId', 'name email instagramHandle')
      .sort({ createdAt: -1 }).limit(5000).lean()

    // Excel-safe: quote anything containing a comma, quote or newline.
    const esc = (v) => {
      const s = String(v ?? '')
      return /["\r\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = ['date', 'type', 'status', 'payout_status', 'amount_bdt', 'method', 'account', 'reference', 'description']
    if (req.user.role === 'admin') header.splice(1, 0, 'creator', 'email')
    const lines = [header.join(',')]
    for (const t of rows) {
      const base = [
        new Date(t.createdAt).toISOString(),
        ...(req.user.role === 'admin' ? [t.userId?.name || '', t.userId?.email || ''] : []),
        t.type, t.status, t.payoutStatus || '', t.amount,
        t.payoutMethod || '', t.payoutAccount || t.bkashNumber || '', t.payoutRef || '', t.desc || '',
      ]
      lines.push(base.map(esc).join(','))
    }
    res.set('Content-Type', 'text/csv; charset=utf-8')
    res.set('Content-Disposition', `attachment; filename="flextag-${req.user.role === 'admin' ? 'payouts' : 'wallet'}-${new Date().toISOString().slice(0, 10)}.csv"`)
    res.send(lines.join('\r\n'))
  } catch (err) {
    console.error('[transactions export]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/transactions/:id/complete — legacy "approve withdrawal" ───────
// Kept because older UI builds still call it; it now goes through the payout
// pipeline (claim → balance re-check → provider) instead of blindly flipping a
// status, so it can no longer pay out money the creator no longer has.
router.put('/:id/complete', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id)
    if (!tx) return res.status(404).json({ message: 'Transaction not found.' })
    if (tx.type !== 'withdrawal') {
      tx.status = 'completed'
      await tx.save()
      return res.json({ transaction: tx, message: 'Transaction completed.' })
    }
    const result = await payouts.sendPayout(tx._id, { actorId: req.user._id })
    if (result.status !== 'paid') {
      return res.status(400).json({ message: result.message || `Payout is ${result.status}.`, transaction: result.transaction })
    }
    res.json({ transaction: result.transaction, message: 'Payout sent.' })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error.' })
  }
})

module.exports = router
