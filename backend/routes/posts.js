const express = require('express')
const router = express.Router()
const Post = require('../models/Post')
const Order = require('../models/Order')
const Campaign = require('../models/Campaign')
const Product = require('../models/Product')
const Transaction = require('../models/Transaction')
const User = require('../models/User')
const { requireAuth, requireRole } = require('../middleware/auth')
const { auditInstagramPost } = require('../services/metaAuditor')

router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query
    const filter = {}

    if (req.user.role === 'creator') filter.creatorId = req.user._id
    if (req.query.campaignId) filter.campaignId = req.query.campaignId
    if (status) filter.status = status

    const posts = await Post.find(filter)
      .populate('creatorId', 'name instagramHandle avatar followersCount tier')
      .populate('campaignId', 'name title brand retentionDays cashbackRate postingRules')
      .populate('orderId', 'orderId cashbackAmount product')
      .sort({ createdAt: -1 })

    res.json({ posts })
  } catch (err) {
    console.error('[posts GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

router.post('/', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { orderId, campaignId, postUrl, platform } = req.body
    if (!postUrl) {
      return res.status(400).json({ message: 'postUrl is required.' })
    }

    if (orderId) {
      const existing = await Post.findOne({ orderId, creatorId: req.user._id })
      if (existing) return res.status(409).json({ message: 'Post already submitted for this order.' })
    }

    let postingRules = {}
    let campaign = null
    if (campaignId) {
      campaign = await Product.findById(campaignId) || await Campaign.findById(campaignId)
      if (campaign && campaign.postingRules) postingRules = campaign.postingRules
    }

    const auditData = await auditInstagramPost(postUrl, postingRules)

    if (auditData.auditStatus === 'failed') {
      return res.status(400).json({
        message: 'Meta Instagram Graph API Audit Failed: Required campaign hashtag (#FlexTag) or brand tag (@flextag.official) was not detected in post caption or post URL is invalid.'
      })
    }

    const post = await Post.create({
      creatorId: req.user._id,
      campaignId: campaignId || undefined,
      orderId: orderId || undefined,
      postUrl,
      platform: platform || 'instagram',
      status: 'approved',
      retentionDeadline: auditData.retentionDeadline,
      retentionDaysRemaining: auditData.retentionDaysRemaining,
      auditStatus: 'passed',
      auditResults: auditData.auditResults
    })

    if (campaign && campaign.totalCreators !== undefined) {
      campaign.totalCreators = (campaign.totalCreators || 0) + 1
      await campaign.save()
    }

    res.status(201).json({ post, message: 'Post submitted and audited successfully via Meta API.' })
  } catch (err) {
    console.error('[posts POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

router.put('/:id/approve', requireAuth, requireRole('admin', 'brand'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('campaignId').populate('orderId')
    if (!post) return res.status(404).json({ message: 'Post not found.' })

    post.status = 'approved'
    post.auditStatus = 'passed'
    await post.save()

    if (post.orderId) {
      const order = post.orderId
      if (!order.cashbackReleased) {
        await Transaction.create({
          userId: post.creatorId,
          type: 'cashback',
          amount: order.cashbackAmount || 500,
          desc: `Cashback for ${post.campaignId?.name || post.campaignId?.title || 'campaign'}`,
          status: 'completed',
          orderId: order._id,
          postId: post._id,
        })

        await Order.findByIdAndUpdate(order._id, { cashbackReleased: true })
        await User.findByIdAndUpdate(post.creatorId, {
          $inc: { totalEarnings: order.cashbackAmount || 500, completedCampaigns: 1 },
        })
      }
    }

    res.json({ post, message: 'Post approved and cashback released.' })
  } catch (err) {
    console.error('[posts approve]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

router.put('/:id/reject', requireAuth, requireRole('admin', 'brand'), async (req, res) => {
  try {
    const { reason } = req.body
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ message: 'Post not found.' })

    post.status = 'rejected'
    post.auditStatus = 'failed'
    post.rejectionReason = reason || 'Does not meet Meta API campaign audit requirements.'
    await post.save()

    res.json({ post, message: 'Post rejected.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
