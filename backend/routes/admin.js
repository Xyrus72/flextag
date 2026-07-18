const express  = require('express')
const router   = express.Router()
const User     = require('../models/User')
const Campaign = require('../models/Campaign')
const Order    = require('../models/Order')
const Post     = require('../models/Post')
const Transaction = require('../models/Transaction')
const { requireAuth, requireRole } = require('../middleware/auth')

// ── GET /api/admin/stats — platform-wide KPIs ─────────────────────────────
router.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const [
      totalCreators,
      totalBrands,
      verifiedBrands,
      activeCampaigns,
      pendingPosts,
      txResult,
      escrowResult,
      commissionResult,
    ] = await Promise.all([
      User.countDocuments({ role: 'creator' }),
      User.countDocuments({ role: 'brand' }),
      User.countDocuments({ role: 'brand', isVerified: true }),
      Campaign.countDocuments({ status: 'active' }),
      Post.countDocuments({ status: 'pending' }),
      Transaction.aggregate([
        { $match: { type: 'cashback', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { type: 'cashback', status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { type: 'cashback', status: 'completed' } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$amount', 0.10] } } } },
      ]),
    ])

    res.json({
      totalCreators,
      totalBrands,
      verifiedBrands,
      activeCampaigns,
      pendingPosts,
      totalGMV:          txResult[0]?.total      || 0,
      cashbackLiability: escrowResult[0]?.total  || 0,
      commissionRevenue: commissionResult[0]?.total || 0,
    })
  } catch (err) {
    console.error('[admin stats]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/admin/analytics — monthly metrics ────────────────────────────
router.get('/analytics', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Group transactions by month
    const monthlyGMV = await Transaction.aggregate([
      { $match: { type: 'cashback', status: 'completed' } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          gmv: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ])

    const monthlyCreators = await User.aggregate([
      { $match: { role: 'creator' } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ])

    const monthlyCampaigns = await Campaign.aggregate([
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ])

    // Category breakdown
    const categoryBreakdown = await Campaign.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const formatMonthly = (arr) => arr.map(d => ({
      month: monthNames[(d._id.month || 1) - 1],
      value: d.gmv || d.count || 0,
    }))

    res.json({
      monthlyGMV:      formatMonthly(monthlyGMV),
      monthlyCreators: formatMonthly(monthlyCreators),
      monthlyCampaigns: formatMonthly(monthlyCampaigns),
      categoryBreakdown,
    })
  } catch (err) {
    console.error('[admin analytics]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/admin/financial — escrow/solvency data ──────────────────────
router.get('/financial', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Per-campaign escrow liability
    const campaignEscrow = await Order.aggregate([
      { $match: { cashbackReleased: false, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$campaignId',
          escrow: { $sum: '$cashbackAmount' },
          creators: { $addToSet: '$creatorId' },
          totalOrders: { $sum: 1 },
        },
      },
    ])

    // Populate campaign details
    const Campaign = require('../models/Campaign')
    const enriched = await Promise.all(campaignEscrow.map(async e => {
      const campaign = await Campaign.findById(e._id).select('title brand budgetCap')
      return {
        campaign: campaign?.title || 'Unknown',
        brand:    campaign?.brand || 'Unknown',
        escrow:   e.escrow,
        budget:   campaign?.budgetCap || 0,
        creators: e.creators.length,
      }
    }))

    // Weekly projections (posts due to complete retention in next 4 weeks)
    const now = new Date()
    const fourWeeks = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)
    const upcomingPayouts = await Post.aggregate([
      { $match: { status: 'approved', cashbackReleased: false, retentionDeadline: { $lte: fourWeeks } } },
      {
        $group: {
          _id: {
            week: { $week: '$retentionDeadline' },
          },
          payouts: { $sum: 1 },
        },
      },
    ])

    const totalEscrow = enriched.reduce((s, e) => s + e.escrow, 0)
    const commissionTx = await Transaction.aggregate([
      { $match: { type: 'cashback', status: 'completed' } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$amount', 0.10] } } } },
    ])

    res.json({
      campaignEscrow: enriched,
      totalEscrow,
      commissionRevenue: commissionTx[0]?.total || 0,
      upcomingPayouts,
    })
  } catch (err) {
    console.error('[admin financial]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
