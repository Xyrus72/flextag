const express     = require('express')
const router      = express.Router()
const Transaction = require('../models/Transaction')
const User        = require('../models/User')
const { requireAuth, requireRole } = require('../middleware/auth')

// ── GET /api/transactions — creator's own transactions ────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {}
    if (req.user.role === 'creator') filter.userId = req.user._id
    // admin sees all

    const transactions = await Transaction.find(filter)
      .populate('orderId', 'orderId product')
      .sort({ createdAt: -1 })

    // Compute balances for creator
    let totalEarnings = 0, pendingEscrow = 0, available = 0, topUps = 0
    if (req.user.role === 'creator') {
      const allTx = await Transaction.find({ userId: req.user._id })
      allTx.forEach(t => {
        if (t.type === 'cashback' && t.status === 'completed') totalEarnings += t.amount
        if (t.type === 'cashback' && t.status === 'pending')   pendingEscrow += t.amount
        // Pending withdrawals are RESERVED (subtracted) so a clawback can't race a payout.
        if (t.type === 'withdrawal' && (t.status === 'completed' || t.status === 'pending')) available -= t.amount
        // Subtract once — it flows into `available` via totalEarnings below.
        if (t.type === 'clawback' && t.status === 'completed') totalEarnings -= t.amount
        if (t.type === 'top_up' && t.status === 'completed') topUps += t.amount
      })
      if (totalEarnings < 0) totalEarnings = 0
      available = totalEarnings + topUps + available
      if (available < 0) available = 0
    }

    res.json({ transactions, totalEarnings, pendingEscrow, available })
  } catch (err) {
    console.error('[transactions GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/transactions/withdraw — creator requests withdrawal ──────────
router.post('/withdraw', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { amount, bkashNumber } = req.body
    if (!amount || !bkashNumber) {
      return res.status(400).json({ message: 'amount and bkashNumber required.' })
    }

    const minWithdrawal = 500
    if (Number(amount) < minWithdrawal) {
      return res.status(400).json({ message: `Minimum withdrawal is ৳${minWithdrawal}.` })
    }

    // Verify available balance (pending withdrawals count — they're reserved)
    const completedCashbacks  = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'cashback', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const completedWithdrawals = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'withdrawal', status: { $in: ['completed', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    // Same formula as GET /api/transactions (which the Wallet shows): cashback + top-ups − withdrawals − clawbacks
    const completedTopUps = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'top_up', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const completedClawbacks = await Transaction.aggregate([
      { $match: { userId: req.user._id, type: 'clawback', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const earned    = completedCashbacks[0]?.total   || 0
    const toppedUp  = completedTopUps[0]?.total      || 0
    const withdrawn = completedWithdrawals[0]?.total || 0
    const clawed    = completedClawbacks[0]?.total   || 0
    const available = earned + toppedUp - withdrawn - clawed

    if (Number(amount) > available) {
      return res.status(400).json({ message: 'Insufficient available balance.' })
    }

    const tx = await Transaction.create({
      userId:      req.user._id,
      type:        'withdrawal',
      amount:      Number(amount),
      desc:        `bKash withdrawal to ${bkashNumber}`,
      status:      'pending',
      bkashNumber,
    })

    res.status(201).json({ transaction: tx, message: 'Withdrawal request submitted.' })
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

// ── PUT /api/transactions/:id/complete — admin approves withdrawal ─────────
router.put('/:id/complete', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id)
    if (!tx) return res.status(404).json({ message: 'Transaction not found.' })

    // A clawback may have landed since the withdrawal was requested — re-check
    // the balance before paying out (this pending tx itself is excluded).
    if (tx.type === 'withdrawal' && tx.status === 'pending') {
      const sums = await Transaction.aggregate([
        { $match: { userId: tx.userId, status: 'completed', type: { $in: ['cashback', 'top_up', 'withdrawal', 'clawback'] } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ])
      const by = Object.fromEntries(sums.map(s => [s._id, s.total]))
      const available = (by.cashback || 0) + (by.top_up || 0) - (by.withdrawal || 0) - (by.clawback || 0)
      if (tx.amount > available) {
        return res.status(400).json({ message: `Insufficient balance: the creator's available balance is now ৳${Math.max(0, available).toLocaleString()} (a clawback may have reduced it). Reject the request or wait for new earnings.` })
      }
    }

    tx.status = 'completed'
    await tx.save()
    res.json({ transaction: tx, message: 'Transaction completed.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
