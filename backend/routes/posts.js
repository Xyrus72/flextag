const express = require('express')
const router = express.Router()
const Post = require('../models/Post')
const Order = require('../models/Order')
const Campaign = require('../models/Campaign')
const Product = require('../models/Product')
const Transaction = require('../models/Transaction')
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
        message: 'Meta Instagram Graph API Audit Failed: Invalid post URL. Post URL must be a valid public Instagram post or reel (e.g. https://www.instagram.com/p/CODE/)'
      })
    }

    const post = await Post.create({
      creatorId: req.user._id,
      campaignId: campaignId || undefined,
      orderId: orderId || undefined,
      postUrl,
      platform: platform || 'instagram',
      status: 'monitoring',
      retentionDeadline: auditData.retentionDeadline,
      retentionDaysRemaining: auditData.retentionDaysRemaining,
      auditStatus: 'passed',
      auditResults: auditData.auditResults
    })

    if (post.orderId) {
      const order = await Order.findById(post.orderId)
      if (order && !post.cashbackReleased) {
        await Transaction.create({
          userId: post.creatorId,
          type: 'cashback',
          amount: order.cashbackAmount || 500,
          desc: 'Cashback held in escrow during retention period',
          status: 'pending',
          orderId: order._id,
          postId: post._id,
        })
      }
    }

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

    post.status = 'monitoring'
    post.auditStatus = 'monitoring'
    if (!post.retentionDeadline) {
      post.retentionDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      post.retentionDaysRemaining = 7
    }
    await post.save()

    if (post.orderId && !post.cashbackReleased && !(await Transaction.exists({ postId: post._id, type: 'cashback' }))) {
      await Transaction.create({
        userId: post.creatorId,
        type: 'cashback',
        amount: post.orderId.cashbackAmount || 500,
        desc: 'Cashback held in escrow during retention period',
        status: 'pending',
        orderId: post.orderId._id,
        postId: post._id,
      })
    }

    res.json({ post, message: 'Post approved and cashback placed in escrow for retention monitoring.' })
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
