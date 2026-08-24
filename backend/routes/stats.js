const express  = require('express')
const router   = express.Router()
const User     = require('../models/User')
const Post     = require('../models/Post')
const Campaign = require('../models/Campaign')
const Transaction = require('../models/Transaction')

// Landing-page stats are read on every visit — cache briefly so a traffic spike
// can't hammer Mongo. Numbers are REAL counts (no inflation): honesty is the point.
let cache = { at: 0, data: null }
const TTL_MS = 60_000

// ── GET /api/stats/public — live headline numbers for the landing page ───────
router.get('/public', async (_req, res) => {
  try {
    if (cache.data && Date.now() - cache.at < TTL_MS) return res.json(cache.data)

    const [creators, brands, verifiedBrands, approvedPosts, activeCampaigns, cashback, clawback, recentTx] = await Promise.all([
      User.countDocuments({ role: 'creator' }),
      User.countDocuments({ role: 'brand' }),
      User.countDocuments({ role: 'brand', isVerified: true }),
      Post.countDocuments({ status: 'approved' }),
      Campaign.countDocuments({ status: 'active' }),
      Transaction.aggregate([
        { $match: { type: 'cashback', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { type: 'clawback', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Payout ticker: recent real cashback releases, names masked ("Ta****")
      Transaction.find({ type: 'cashback', status: 'completed' })
        .populate('userId', 'name').populate('orderId', 'cashbackClawedBack')
        .sort({ createdAt: -1 }).limit(16).lean(),
    ])

    const maskName = (n) => { const s = String(n || 'Creator').trim(); return s.slice(0, 2) + '*'.repeat(Math.min(6, Math.max(3, s.length - 2))) }
    const recentPayouts = recentTx
      .filter(t => !t.orderId?.cashbackClawedBack)   // don't showcase payouts that were reversed
      .slice(0, 8)
      .map(t => ({ name: maskName(t.userId?.name), amount: t.amount, at: t.createdAt }))

    const data = {
      creators,
      brands,
      verifiedBrands,
      approvedPosts,
      activeCampaigns,
      cashbackPaid: Math.max(0, (cashback[0]?.total || 0) - (clawback[0]?.total || 0)),   // net of reversals
      payouts: cashback[0]?.count || 0,
      recentPayouts,
      updatedAt: new Date().toISOString(),
    }
    cache = { at: Date.now(), data }
    res.json(data)
  } catch (err) {
    console.error('[stats public]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
