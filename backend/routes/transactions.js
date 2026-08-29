const express     = require('express')
const router      = express.Router()
const Transaction = require('../models/Transaction')
const { requireAuth, requireRole } = require('../middleware/auth')
const { computeBalance, walletBalance } = require('../utils/balance')
const { normalizeBdMobile, isValidBdMobile, maskMobile } = require('../utils/phone')
const payouts = require('../services/payouts')

const MIN_WITHDRAWAL = Number(process.env.MIN_WITHDRAWAL) || 500
const PAYOUT_METHODS = ['bkash', 'nagad', 'rocket']

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
      minWithdrawal: MIN_WITHDRAWAL,
      payoutMethods: PAYOUT_METHODS,
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
    if (Number(amount) < MIN_WITHDRAWAL) {
      return res.status(400).json({ message: `Minimum withdrawal is ৳${MIN_WITHDRAWAL}.` })
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
