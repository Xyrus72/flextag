const express  = require('express')
const router   = express.Router()
const Post     = require('../models/Post')
const Order    = require('../models/Order')
const Campaign = require('../models/Campaign')
const { requireAuth, requireRole } = require('../middleware/auth')
const { approvePost } = require('../services/postApproval')
const { parsePostUrl } = require('../services/instagram/endpoints')

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Orders in these states (incl. the fulfillment module's return flow) never earn cashback.
const NO_CASHBACK_STATUSES = ['cancelled', 'return_requested', 'returned']

// ── GET /api/posts ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query
    const filter = {}

    if (req.user.role === 'creator') filter.creatorId = req.user._id
    // brand/admin see all or filter by campaignId
    if (req.query.campaignId) filter.campaignId = req.query.campaignId
    if (status) filter.status = status

    const posts = await Post.find(filter)
      .populate('creatorId',  'name instagramHandle avatar followersCount tier igVerified igHealthScore igFakeFollowerPct')
      .populate('campaignId', 'title name brand brandId retentionDays cashbackRate hashtags handles contentType postingRules')
      .populate('orderId',    'orderId cashbackAmount createdAt status product')
      .sort({ createdAt: -1 })

    res.json({ posts })
  } catch (err) {
    console.error('[posts GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/posts — creator submits post ─────────────────────────────────
router.post('/', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { orderId, campaignId, postUrl, platform } = req.body
    if (!campaignId || !postUrl) {
      return res.status(400).json({ message: 'campaignId and postUrl required.' })
    }
    const plat = platform || 'instagram'
    const url = String(postUrl).trim()
    const shortcode = plat === 'instagram' ? parsePostUrl(url) : null
    if (plat === 'instagram' && !shortcode) {
      return res.status(400).json({ message: 'Paste the link of the Instagram post or reel (instagram.com/p/… or /reel/…).' })
    }

    const campaign = await Campaign.findById(campaignId)
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' })

    // The order must belong to this creator AND this campaign — it anchors the
    // verification date and decides how much cashback is released.
    if (orderId) {
      const order = await Order.findOne({ _id: orderId, creatorId: req.user._id, campaignId: campaign._id })
      if (!order) return res.status(404).json({ message: 'Order not found for this campaign.' })
      if (NO_CASHBACK_STATUSES.includes(order.status)) {
        return res.status(400).json({ message: `This order is ${order.status.replace('_', ' ')}, so no cashback can be claimed for it.` })
      }
      // One live submission per order; a rejected post may be fixed and resubmitted.
      const existing = await Post.findOne({ orderId, creatorId: req.user._id, status: { $ne: 'rejected' } })
      if (existing) return res.status(409).json({ message: 'Post already submitted for this order.' })
    }

    // The same Instagram post can't back two submissions (by anyone).
    if (shortcode) {
      const dup = await Post.findOne({
        status: { $in: ['pending', 'approved'] },
        postUrl: new RegExp(`/(?:p|reel|reels|tv)/${escapeRe(shortcode)}(?:[/?#]|$)`, 'i'),
      }).select('_id')
      if (dup) return res.status(409).json({ message: 'This Instagram post has already been submitted.' })
    }

    const retentionDeadline = new Date()
    retentionDeadline.setDate(retentionDeadline.getDate() + (campaign.retentionDays || 7))

    const post = await Post.create({
      creatorId:  req.user._id,
      campaignId,
      orderId:    orderId || undefined,
      postUrl:    url,
      platform:   plat,
      retentionDeadline,
    })

    // Increment campaign creator count
    campaign.totalCreators = (campaign.totalCreators || 0) + 1
    await campaign.save()

    res.status(201).json({ post, message: 'Post submitted for review.' })
  } catch (err) {
    console.error('[posts POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/posts/:id/approve — admin / owning brand approves post ────────
// Cashback release lives in services/postApproval.js (shared with automated
// Instagram verification) so the money path can't drift.
router.put('/:id/approve', requireAuth, requireRole('admin', 'brand'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('campaignId')
      .populate('orderId')
      .populate('creatorId', 'name instagramHandle igVerified')
    if (!post) return res.status(404).json({ message: 'Post not found.' })
    if (req.user.role === 'brand' && String(post.campaignId?.brandId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    if (post.status !== 'pending') return res.status(400).json({ message: 'Post is not pending.' })

    const { released } = await approvePost(post, { approvedBy: req.user._id })
    res.json({ post, message: released ? 'Post approved and cashback released.' : 'Post approved.' })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message })
    console.error('[posts approve]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/posts/:id/reject — admin / owning brand rejects post ──────────
router.put('/:id/reject', requireAuth, requireRole('admin', 'brand'), async (req, res) => {
  try {
    const { reason } = req.body
    const post = await Post.findById(req.params.id).populate('campaignId', 'brandId')
    if (!post) return res.status(404).json({ message: 'Post not found.' })
    if (req.user.role === 'brand' && String(post.campaignId?.brandId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    if (post.status === 'approved') {
      return res.status(400).json({ message: 'Approved posts cannot be rejected — cashback was already released. Open a dispute instead.' })
    }

    post.status = 'rejected'
    post.auditStatus = 'failed'
    post.rejectionReason = reason || 'Does not meet campaign requirements.'
    await post.save()

    res.json({ post, message: 'Post rejected.' })
  } catch (err) {
    console.error('[posts reject]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
