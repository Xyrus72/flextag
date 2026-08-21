const express = require('express')
const router = express.Router()

const Post = require('../models/Post')
const Order = require('../models/Order')
const Campaign = require('../models/Campaign')
const Transaction = require('../models/Transaction')

const { requireAuth, requireRole } = require('../middleware/auth')


// ============================================================
// GET /api/posts
// Get submitted posts
// ============================================================

router.get('/', requireAuth, async (req, res) => {

  try {

    const { status, campaignId } = req.query

    const filter = {}


    // Creator only sees their own posts
    if (req.user.role === 'creator') {
      filter.creatorId = req.user._id
    }


    // Optional campaign filter
    if (campaignId) {
      filter.campaignId = campaignId
    }


    // Optional status filter
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
        'orderId cashbackAmount cashbackReleased'
      )

      .sort({
        createdAt: -1
      })


    res.json({
      posts
    })


  } catch (err) {

    console.error(
      '[posts GET]',
      err
    )


    res.status(500).json({
      message: 'Server error.'
    })

  }

})


// ============================================================
// POST /api/posts
// Creator submits Instagram post/reel
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

        // Existing analytics fields
        likes,

        comments,

        views,

        estimatedReach

      } = req.body


      // --------------------------------------------------------
      // Validation
      // --------------------------------------------------------

      if (!campaignId || !postUrl) {

        return res.status(400).json({
          message: 'campaignId and postUrl required.'
        })

      }


      // --------------------------------------------------------
      // Find campaign
      // --------------------------------------------------------

      const campaign =
        await Campaign.findById(campaignId)


      if (!campaign) {

        return res.status(404).json({
          message: 'Campaign not found.'
        })

      }


      // --------------------------------------------------------
      // Prevent duplicate post submission for same order
      // --------------------------------------------------------

      if (orderId) {

        const existing =
          await Post.findOne({

            orderId,

            creatorId: req.user._id

          })


        if (existing) {

          return res.status(409).json({
            message:
              'Post already submitted for this order.'
          })

        }

      }


      // ========================================================
      // CREATE POST
      // ========================================================
      //
      // IMPORTANT:
      //
      // Retention countdown does NOT start here.
      //
      // It begins only after the post is approved.
      // ========================================================

      const post =
        await Post.create({

          creatorId: req.user._id,

          campaignId,

          orderId:
            orderId || undefined,

          postUrl,

          platform:
            platform || 'instagram',

          retentionDeadline: null,

          cashbackReleased: false,

          // Keep existing analytics functionality
          likes:
            Number(likes) || 0,

          comments:
            Number(comments) || 0,

          views:
            Number(views) || 0,

          estimatedReach:
            Number(estimatedReach) || 0

        })


      // --------------------------------------------------------
      // Update campaign creator count
      // --------------------------------------------------------

      campaign.totalCreators =
        (campaign.totalCreators || 0) + 1


      await campaign.save()


      res.status(201).json({

        post,

        message:
          'Post submitted for review.'

      })


    } catch (err) {

      console.error(
        '[posts POST]',
        err
      )


      res.status(500).json({
        message: 'Server error.'
      })

    }

  }
)


// ============================================================
// PUT /api/posts/:id/approve
//
// MODULE 3 - MEMBER 4
//
// Admin / Brand approves creator post.
//
// New flow:
//
// 1. Approve post
// 2. Start retention countdown
// 3. Create PENDING cashback transaction
// 4. Cashback stays in escrow
//
// The escrow service will release it later.
// ============================================================

router.put(
  '/:id/approve',
  requireAuth,
  requireRole('admin', 'brand'),
  async (req, res) => {

    try {

      const post =
        await Post.findById(req.params.id)

          .populate('campaignId')

          .populate('orderId')


      // --------------------------------------------------------
      // Post must exist
      // --------------------------------------------------------

      if (!post) {

        return res.status(404).json({
          message: 'Post not found.'
        })

      }


      // --------------------------------------------------------
      // Only pending posts can be approved
      // --------------------------------------------------------

      if (post.status !== 'pending') {

        return res.status(400).json({
          message:
            'Post is not pending.'
        })

      }


      // --------------------------------------------------------
      // Brand security check
      //
      // Brand can only approve a post from its own campaign.
      // Admin can approve any campaign post.
      // --------------------------------------------------------

      if (
        req.user.role === 'brand' &&
        post.campaignId?.brandId &&
        post.campaignId.brandId.toString()
          !== req.user._id.toString()
      ) {

        return res.status(403).json({
          message:
            'You cannot approve posts from another brand.'
        })

      }


      // ========================================================
      // START RETENTION COUNTDOWN
      // ========================================================

      const retentionDays =
        post.campaignId?.retentionDays || 7


      const retentionDeadline =
        new Date()


      retentionDeadline.setDate(

        retentionDeadline.getDate()
        + retentionDays

      )


      // --------------------------------------------------------
      // Approve post
      // --------------------------------------------------------

      post.status =
        'approved'


      // Save release deadline
      post.retentionDeadline =
        retentionDeadline


      // Money is NOT released yet
      post.cashbackReleased =
        false


      await post.save()


      // ========================================================
      // CREATE PENDING ESCROW TRANSACTION
      // ========================================================

      if (post.orderId) {

        const order =
          post.orderId


        // ------------------------------------------------------
        // Prevent duplicate cashback transactions
        // ------------------------------------------------------

        const existingTransaction =
          await Transaction.findOne({

            userId:
              post.creatorId,

            orderId:
              order._id,

            postId:
              post._id,

            type:
              'cashback'

          })


        // ------------------------------------------------------
        // Create pending cashback
        // ------------------------------------------------------

        if (!existingTransaction) {

          await Transaction.create({

            userId:
              post.creatorId,

            type:
              'cashback',

            amount:
              order.cashbackAmount,

            desc:
              `Cashback in escrow for ${
                post.campaignId?.title ||
                'campaign'
              }`,

            status:
              'pending',

            orderId:
              order._id,

            postId:
              post._id

          })

        }


        // ------------------------------------------------------
        // Keep order cashback locked
        // ------------------------------------------------------

        await Order.findByIdAndUpdate(

          order._id,

          {
            cashbackReleased: false
          }

        )

      }


      // --------------------------------------------------------
      // Response
      // --------------------------------------------------------

      res.json({

        post,

        message:
          `Post approved. Cashback is now in escrow for ${retentionDays} day(s).`

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
// Admin / Brand rejects creator post
// ============================================================

router.put(
  '/:id/reject',
  requireAuth,
  requireRole('admin', 'brand'),
  async (req, res) => {

    try {

      const { reason } =
        req.body


      const post =
        await Post.findById(
          req.params.id
        )


      // --------------------------------------------------------
      // Post must exist
      // --------------------------------------------------------

      if (!post) {

        return res.status(404).json({
          message:
            'Post not found.'
        })

      }


      // --------------------------------------------------------
      // Only pending posts can be rejected
      // --------------------------------------------------------

      if (post.status !== 'pending') {

        return res.status(400).json({
          message:
            'Only pending posts can be rejected.'
        })

      }


      // --------------------------------------------------------
      // Reject post
      // --------------------------------------------------------

      post.status =
        'rejected'


      post.rejectionReason =
        reason ||
        'Does not meet campaign requirements.'


      await post.save()


      res.json({

        post,

        message:
          'Post rejected.'

      })


    } catch (err) {

      console.error(
        '[posts reject]',
        err
      )


      res.status(500).json({
        message:
          'Server error.'
      })

    }

  }
)


module.exports = router