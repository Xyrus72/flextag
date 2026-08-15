const express = require('express')
const router = express.Router()

const Post = require('../models/Post')
const Order = require('../models/Order')
const Campaign = require('../models/Campaign')
const Transaction = require('../models/Transaction')
const User = require('../models/User')

const { requireAuth, requireRole } = require('../middleware/auth')


// ============================================================
// GET /api/posts
// Get posts
// ============================================================

router.get('/', requireAuth, async (req, res) => {

  try {

    const { status, campaignId } = req.query

    const filter = {}

    // Creator can only see own posts
    if (req.user.role === 'creator') {
      filter.creatorId = req.user._id
    }

    // Filter by campaign
    if (campaignId) {
      filter.campaignId = campaignId
    }

    // Filter by status
    if (status && status !== 'all') {
      filter.status = status
    }

    const posts = await Post.find(filter)

      .populate(
        'creatorId',
        'name instagramHandle avatar followersCount tier'
      )

      .populate(
        'campaignId',
        'title brand retentionDays cashbackRate price budgetCap'
      )

      .populate(
        'orderId',
        'orderId cashbackAmount'
      )

      .sort({ createdAt: -1 })


    res.json({ posts })

  } catch (err) {

    console.error('[posts GET]', err)

    res.status(500).json({
      message: 'Server error.'
    })

  }

})


// ============================================================
// POST /api/posts
// Creator submits post
// ============================================================

router.post(
  '/',
  requireAuth,
  requireRole('creator'),
  async (req, res) => {

    try {

      const {
        orderId,
        campaignId,
        postUrl,
        platform,

        // Analytics values
        likes,
        comments,
        views,
        estimatedReach

      } = req.body


      if (!campaignId || !postUrl) {

        return res.status(400).json({
          message: 'campaignId and postUrl required.'
        })

      }


      const campaign = await Campaign.findById(campaignId)

      if (!campaign) {

        return res.status(404).json({
          message: 'Campaign not found.'
        })

      }


      // ========================================================
      // CHECK DUPLICATE SUBMISSION
      // ========================================================

      if (orderId) {

        const existing = await Post.findOne({
          orderId,
          creatorId: req.user._id
        })

        if (existing) {

          return res.status(409).json({
            message: 'Post already submitted for this order.'
          })

        }

      }


      // ========================================================
      // RETENTION DEADLINE
      // ========================================================

      const retentionDeadline = new Date()

      retentionDeadline.setDate(
        retentionDeadline.getDate() +
        (campaign.retentionDays || 7)
      )


      // ========================================================
      // CREATE POST
      // ========================================================

      const post = await Post.create({

        creatorId: req.user._id,

        campaignId,

        orderId: orderId || undefined,

        postUrl,

        platform: platform || 'instagram',

        retentionDeadline,

        // Analytics
        likes: Number(likes) || 0,

        comments: Number(comments) || 0,

        views: Number(views) || 0,

        estimatedReach: Number(estimatedReach) || 0

      })


      // ========================================================
      // UPDATE CAMPAIGN CREATOR COUNT
      // ========================================================

      campaign.totalCreators =
        (campaign.totalCreators || 0) + 1

      await campaign.save()


      res.status(201).json({

        post,

        message: 'Post submitted for review.'

      })

    } catch (err) {

      console.error('[posts POST]', err)

      res.status(500).json({
        message: 'Server error.'
      })

    }

  }
)


// ============================================================
// PUT /api/posts/:id/approve
// Admin / Brand approves post
// ============================================================

router.put(
  '/:id/approve',
  requireAuth,
  requireRole('admin', 'brand'),
  async (req, res) => {

    try {

      const post = await Post.findById(req.params.id)

        .populate('campaignId')

        .populate('orderId')


      if (!post) {

        return res.status(404).json({
          message: 'Post not found.'
        })

      }


      if (post.status !== 'pending') {

        return res.status(400).json({
          message: 'Post is not pending.'
        })

      }


      post.status = 'approved'

      await post.save()


      // ========================================================
      // RELEASE CASHBACK
      // ========================================================

      if (post.orderId) {

        const order = post.orderId

        if (!order.cashbackReleased) {

          await Transaction.create({

            userId: post.creatorId,

            type: 'cashback',

            amount: order.cashbackAmount,

            desc:
              `Cashback for ${
                post.campaignId?.title || 'campaign'
              }`,

            status: 'completed',

            orderId: order._id,

            postId: post._id

          })


          // Update order
          await Order.findByIdAndUpdate(
            order._id,
            {
              cashbackReleased: true
            }
          )


          // Update creator earnings
          await User.findByIdAndUpdate(
            post.creatorId,
            {
              $inc: {
                totalEarnings: order.cashbackAmount,
                completedCampaigns: 1
              }
            }
          )

        }

      }


      res.json({

        post,

        message:
          'Post approved and cashback released.'

      })

    } catch (err) {

      console.error(
        '[posts approve]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })

    }

  }
)


// ============================================================
// PUT /api/posts/:id/reject
// Admin / Brand rejects post
// ============================================================

router.put(
  '/:id/reject',
  requireAuth,
  requireRole('admin', 'brand'),
  async (req, res) => {

    try {

      const { reason } = req.body

      const post =
        await Post.findById(req.params.id)


      if (!post) {

        return res.status(404).json({
          message: 'Post not found.'
        })

      }


      post.status = 'rejected'

      post.rejectionReason =
        reason ||
        'Does not meet campaign requirements.'


      await post.save()


      res.json({

        post,

        message: 'Post rejected.'

      })

    } catch (err) {

      console.error(
        '[posts reject]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })

    }

  }
)


module.exports = router