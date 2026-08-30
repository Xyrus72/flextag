const express  = require('express')
const router   = express.Router()
const User     = require('../models/User')
const Campaign = require('../models/Campaign')
const Order    = require('../models/Order')
const Post     = require('../models/Post')
const Product  = require('../models/Product')
const Transaction = require('../models/Transaction')
const { requireAuth, requireRole } = require('../middleware/auth')
const { runAudit } = require('../services/instagram/audit')
const fraud = require('../services/fraud')
const audit = require('../services/audit')
const commission = require('../services/commission')
const igClient = require('../services/instagram/client')

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
      clawbackResult,
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
      // REAL revenue: actual fee rows in the brand ledger, not an estimate.
      commission.platformRevenue(),
      Transaction.aggregate([
        { $match: { type: 'clawback', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ])

    const clawed = clawbackResult[0]?.total || 0
    res.json({
      totalCreators,
      totalBrands,
      verifiedBrands,
      activeCampaigns,
      pendingPosts,
      totalGMV:          Math.max(0, (txResult[0]?.total || 0) - clawed),           // net of clawbacks
      cashbackLiability: escrowResult[0]?.total  || 0,
      commissionRevenue: commissionResult.revenue,
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
      // Liability = orders that can still be paid: exclude cancelled AND the fulfillment module's return states
      { $match: { cashbackReleased: false, status: { $nin: ['cancelled', 'return_requested', 'returned'] } } },
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
    const platformBooks = await commission.platformRevenue()

    res.json({
      campaignEscrow: enriched,
      totalEscrow,
      commissionRevenue: platformBooks.revenue,
      commissionDetail: platformBooks,
      upcomingPayouts,
    })
  } catch (err) {
    console.error('[admin financial]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/admin/products — list products with optional status filter ───────
router.get('/products', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query
    const filter = status ? { status } : {}
    const products = await Product.find(filter)
      .populate('brandId', 'name companyName email')
      .sort({ createdAt: -1 })
    res.json({ products })
  } catch (err) {
    console.error('[admin products GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/admin/products/:id/approve ───────────────────────────────────────
router.put('/products/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    product.status = 'approved'
    product.rejectionReason = ''
    await product.save()
    res.json({ product })
  } catch (err) {
    console.error('[admin products approve]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/admin/products/:id/reject ────────────────────────────────────────
router.put('/products/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    product.status = 'rejected'
    product.rejectionReason = req.body.reason || 'Does not meet listing requirements.'
    await product.save()
    res.json({ product })
  } catch (err) {
    console.error('[admin products reject]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/admin/creators/:id/ig-verify — mark creator IG as verified ─────
router.put('/creators/:id/ig-verify', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { igVerified } = req.body
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'creator' },
      { igVerified: !!igVerified },
      { new: true }
    ).select('-password')
    if (!user) return res.status(404).json({ message: 'Creator not found.' })
    audit.record({ actor: req.user, action: audit.ACTIONS.USER_VERIFIED, targetType: 'user', targetId: user._id, targetName: user.name, summary: igVerified ? 'Instagram identity verified' : 'Instagram verification revoked', req })
    res.json({ user, message: igVerified ? 'Instagram identity verified.' : 'Instagram verification revoked.' })
  } catch (err) {
    console.error('[admin ig-verify]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/admin/instagram-lookup — run a fresh full audit for any handle ──
// (kept at the old path for compatibility; the general API lives in routes/instagram.js)
router.post('/instagram-lookup', requireAuth, requireRole('admin'), async (req, res) => {
  const { username } = req.body || {}
  if (!username) return res.status(400).json({ message: 'Username is required.' })
  try {
    const audit = await runAudit(username, { depth: 'full', force: true, maxAgeMs: 0 })
    return res.json({ audit })
  } catch (err) {
    if (err instanceof igClient.IgError) {
      const { status, message } = igClient.httpFor(err)
      return res.status(status).json({ message, code: err.code })
    }
    console.error('[admin instagram-lookup]', err)
    return res.status(500).json({ message: 'Server error.' })
  }
})

/* ── Fraud review ────────────────────────────────────────────────────────────
 * Risk scores are evidence for a human, so these routes are read-heavy: list
 * who is flagged, look at exactly WHY, then block, vouch for, or ignore.
 */

// GET /api/admin/fraud?level=high|medium|low|blocked|all
router.get('/fraud', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { level = 'flagged' } = req.query
    const filter = { role: 'creator' }
    if (level === 'blocked') filter.blocked = true
    else if (level === 'flagged') filter.riskScore = { $gt: 0 }
    else if (['high', 'medium', 'low', 'clear'].includes(level)) filter.riskLevel = level

    const [users, counts, thresholds] = await Promise.all([
      User.find(filter)
        .select('name email phone instagramHandle tier igVerified riskScore riskLevel riskFlags riskCheckedAt riskNote riskWhitelisted blocked blockReason signupIp createdAt totalEarnings completedCampaigns')
        .sort({ blocked: -1, riskScore: -1, createdAt: -1 })
        .limit(100)
        .lean(),
      User.aggregate([
        { $match: { role: 'creator' } },
        { $group: { _id: { $ifNull: ['$riskLevel', 'clear'] }, count: { $sum: 1 } } },
      ]),
      fraud.fraudSettings(),
    ])
    const blocked = await User.countDocuments({ role: 'creator', blocked: true })
    res.json({
      users,
      counts: { ...Object.fromEntries(counts.map(c => [c._id, c.count])), blocked },
      thresholds,
    })
  } catch (err) {
    console.error('[admin fraud]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// GET /api/admin/fraud/:id — recompute now and return the evidence behind the score
router.get('/fraud/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    const assessment = await fraud.assess(user)
    res.json({ user: await User.findById(req.params.id).select('-password'), assessment })
  } catch (err) {
    console.error('[admin fraud detail]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/admin/fraud/:id/block  { reason }
router.post('/fraud/:id/block', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').slice(0, 300) || 'Account under review for suspicious activity.'
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { blocked: true, blockReason: reason } }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    audit.record({ actor: req.user, action: audit.ACTIONS.USER_BLOCKED, targetType: 'user', targetId: user._id, targetName: user.name, summary: reason, req })
    res.json({ user, message: 'Account blocked — new orders and payouts are refused.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/admin/fraud/:id/unblock
router.post('/fraud/:id/unblock', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { blocked: false, blockReason: '' } }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    audit.record({ actor: req.user, action: audit.ACTIONS.USER_UNBLOCKED, targetType: 'user', targetId: user._id, targetName: user.name, req })
    res.json({ user, message: 'Account unblocked.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/admin/fraud/:id/vouch  { note, whitelisted }
// "I looked at this — the shared IP is a household, not a ring." Signals stay
// visible, they just stop scoring until someone revokes the vouch.
router.post('/fraud/:id/vouch', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const whitelisted = req.body?.whitelisted !== false
    const note = String(req.body?.note || '').slice(0, 300)
    const user = await User.findByIdAndUpdate(req.params.id, { $set: {
      riskWhitelisted: whitelisted,
      riskNote: note,
      ...(whitelisted ? { riskScore: 0, riskLevel: 'clear' } : {}),
    } }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    if (!whitelisted) await fraud.assess(user)
    audit.record({
      actor: req.user, action: audit.ACTIONS.USER_VOUCHED, targetType: 'user', targetId: user._id, targetName: user.name,
      summary: whitelisted ? `Vouched: ${note || 'no note'}` : 'Vouch revoked', req,
    })
    res.json({ user, message: whitelisted ? 'Vouched — flags stay visible but stop scoring.' : 'Vouch revoked — the account is scored again.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/admin/fraud/rescan — re-score every creator (bounded)
router.post('/fraud/rescan', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const creators = await User.find({ role: 'creator' }).select('_id').sort({ createdAt: -1 }).limit(300).lean()
    let flagged = 0
    for (const c of creators) {
      const r = await fraud.assess(c._id).catch(() => null)
      if (r && r.score > 0) flagged += 1
    }
    audit.record({ actor: req.user, action: audit.ACTIONS.FRAUD_RESCAN, summary: `Re-scored ${creators.length} creators, ${flagged} flagged`, meta: { scanned: creators.length, flagged }, req })
    res.json({ scanned: creators.length, flagged, message: `Re-scored ${creators.length} creators — ${flagged} carry at least one flag.` })
  } catch (err) {
    console.error('[admin fraud rescan]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/admin/audit — who did what, with filters ──────────────────────
router.get('/audit', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { action, actor, targetId, since, limit, skip } = req.query
    const [{ entries, total }, actions] = await Promise.all([
      audit.list({ action, actor, targetId, since, limit, skip }),
      audit.knownActions(),
    ])
    res.json({ entries, total, actions: actions.sort() })
  } catch (err) {
    console.error('[admin audit]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
