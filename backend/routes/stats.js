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

    const [creators, brands, verifiedBrands, approvedPosts, activeCampaigns, cashback] = await Promise.all([
      User.countDocuments({ role: 'creator' }),
      User.countDocuments({ role: 'brand' }),
      User.countDocuments({ role: 'brand', isVerified: true }),
      Post.countDocuments({ status: 'approved' }),
      Campaign.countDocuments({ status: 'active' }),
      Transaction.aggregate([
        { $match: { type: 'cashback', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ])

    const data = {
      creators,
      brands,
      verifiedBrands,
      approvedPosts,
      activeCampaigns,
      cashbackPaid: cashback[0]?.total || 0,
      payouts: cashback[0]?.count || 0,
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
