const express = require('express')
const router = express.Router()

const Campaign = require('../models/Campaign')
const User = require('../models/User')

const {
  requireAuth,
  requireRole
} = require('../middleware/auth')


// ============================================================
// GET /api/campaigns
// PUBLIC CAMPAIGN CATALOG
//
// - Only ACTIVE campaigns
// - PRIVATE campaigns are NEVER shown here
// - Supports category, brandId, status and search
// ============================================================

router.get('/', async (req, res) => {
  try {

    const {
      category,
      brandId,
      status,
      q
    } = req.query

    const filter = {}

    // Category filter
    if (category && category !== 'All') {
      filter.category = category
    }

    // Brand filter
    if (brandId) {
      filter.brandId = brandId
    }

    // Status filter
    if (status && status !== 'all') {
      filter.status = status
    } else {
      filter.status = 'active'
    }

    // IMPORTANT:
    // Public catalog NEVER shows private campaigns.
    filter.isPrivate = false

    // Search by title
    if (q) {
      filter.title = {
        $regex: q,
        $options: 'i'
      }
    }

    const campaigns = await Campaign.find(filter)
      .populate(
        'brandId',
        'companyName name isVerified avatar website'
      )
      .sort({ createdAt: -1 })

    res.json({
      campaigns
    })

  } catch (err) {

    console.error('[campaigns GET]', err)

    res.status(500).json({
      message: 'Server error.'
    })
  }
})


// ============================================================
// GET /api/campaigns/invited
//
// CREATOR:
// GET PRIVATE CAMPAIGNS THEY WERE INVITED TO
// ============================================================

router.get(
  '/invited',
  requireAuth,
  requireRole('creator'),
  async (req, res) => {

    try {

      const campaigns = await Campaign.find({
        isPrivate: true,
        status: 'active',
        invitedCreators: req.user._id
      })
        .populate(
          'brandId',
          'companyName name isVerified avatar website'
        )
        .sort({ createdAt: -1 })

      res.json({
        campaigns
      })

    } catch (err) {

      console.error(
        '[campaigns invited GET]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })
    }
  }
)


// ============================================================
// GET /api/campaigns/creators
//
// BRAND / ADMIN:
// GET CREATOR LIST
//
// Used by Private Campaign Invites page
// ============================================================

router.get(
  '/creators',
  requireAuth,
  requireRole('brand', 'admin'),
  async (req, res) => {

    try {

      const creators = await User.find({
        role: 'creator'
      })
        .select(
          'name email instagramHandle followersCount engagementRate tier totalEarnings completedCampaigns avatar isVerified igVerified'
        )
        .sort({
          followersCount: -1
        })

      res.json({
        users: creators
      })

    } catch (err) {

      console.error(
        '[campaign creators GET]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })
    }
  }
)


// ============================================================
// GET /api/campaigns/my-private
//
// BRAND:
// GET OWN ACTIVE PRIVATE CAMPAIGNS
// ============================================================

router.get(
  '/my-private',
  requireAuth,
  requireRole('brand'),
  async (req, res) => {

    try {

      const campaigns = await Campaign.find({
        brandId: req.user._id,
        isPrivate: true,
        status: 'active'
      })
        .populate(
          'brandId',
          'companyName name isVerified avatar website'
        )
        .sort({ createdAt: -1 })

      res.json({
        campaigns
      })

    } catch (err) {

      console.error(
        '[campaigns my-private GET]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })
    }
  }
)


// ============================================================
// GET /api/campaigns/:id
//
// GET SINGLE CAMPAIGN
// ============================================================

router.get(
  '/:id',
  async (req, res) => {

    try {

      const campaign = await Campaign.findById(
        req.params.id
      )
        .populate(
          'brandId',
          'companyName name isVerified avatar website'
        )

      // Campaign not found
      if (!campaign) {

        return res.status(404).json({
          message: 'Campaign not found.'
        })
      }


      // ========================================================
      // Only ACTIVE campaigns are available
      // ========================================================

      if (campaign.status !== 'active') {

        return res.status(404).json({
          message: 'Campaign not available.'
        })
      }


      // ========================================================
      // PRIVATE CAMPAIGN
      //
      // Only:
      // 1. Admin
      // 2. Campaign owner
      // 3. Invited creator
      //
      // can access it.
      // ========================================================

      if (campaign.isPrivate) {

        // No logged-in user
        if (!req.session?.userId) {

          return res.status(403).json({
            message: 'This is a private campaign.'
          })
        }


        // Get logged-in user
        const user = await User.findById(
          req.session.userId
        ).select('-password')


        if (!user) {

          return res.status(401).json({
            message: 'Authentication required.'
          })
        }


        // ------------------------------------------------------
        // ADMIN CAN ACCESS
        // ------------------------------------------------------

        if (user.role === 'admin') {

          return res.json({
            campaign
          })
        }


        // ------------------------------------------------------
        // BRAND OWNER CAN ACCESS
        // ------------------------------------------------------

        if (
          user.role === 'brand' &&
          campaign.brandId?._id?.toString() ===
            user._id.toString()
        ) {

          return res.json({
            campaign
          })
        }


        // ------------------------------------------------------
        // CREATOR MUST BE INVITED
        // ------------------------------------------------------

        if (user.role === 'creator') {

          const invited = (
            campaign.invitedCreators || []
          ).some(
            id =>
              id.toString() ===
              user._id.toString()
          )


          if (!invited) {

            return res.status(403).json({
              message:
                'You are not invited to this private campaign.'
            })
          }
        }
      }


      // Normal public campaign
      res.json({
        campaign
      })

    } catch (err) {

      console.error(
        '[campaigns GET by id]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })
    }
  }
)


// ============================================================
// POST /api/campaigns
//
// BRAND CREATES CAMPAIGN
//
// New campaigns start as PENDING.
// Admin must approve them before creators can see them.
// ============================================================

router.post(
  '/',
  requireAuth,
  requireRole('brand'),
  async (req, res) => {

    try {

      const {
        title,
        product,
        category,
        price,
        cashbackRate,
        stock,
        minFollowers,
        hashtags,
        handles,
        deadline,
        retentionDays,
        budgetCap,
        isPrivate
      } = req.body


      // ========================================================
      // Validation
      // ========================================================

      if (
        !title ||
        !product ||
        !price ||
        !cashbackRate
      ) {

        return res.status(400).json({
          message:
            'title, product, price and cashbackRate are required.'
        })
      }


      // ========================================================
      // Create campaign
      // ========================================================

      const campaign = await Campaign.create({

        title,

        brand:
          req.user.companyName ||
          req.user.name,

        brandId:
          req.user._id,

        product,

        category:
          category || 'Beauty',

        price:
          Number(price),

        cashbackRate:
          Number(cashbackRate),

        stock:
          Number(stock) || 100,

        stockLeft:
          Number(stock) || 100,

        minFollowers:
          Number(minFollowers) || 1000,

        hashtags:
          hashtags || '',

        handles:
          handles || '',

        deadline:
          deadline
            ? new Date(deadline)
            : undefined,

        retentionDays:
          Number(retentionDays) || 7,

        budgetCap:
          Number(budgetCap) || 0,

        isPrivate:
          !!isPrivate,

        // IMPORTANT:
        // Admin approval is required.
        status:
          'pending',

        // No creators invited initially.
        invitedCreators: []

      })


      // ========================================================
      // Update brand campaign count
      // ========================================================

      try {

        await User.findByIdAndUpdate(
          req.user._id,
          {
            $inc: {
              totalCampaigns: 1
            }
          }
        )

      } catch (updateErr) {

        console.warn(
          '[campaigns] Could not update brand campaign count:',
          updateErr.message
        )
      }


      res.status(201).json({

        campaign,

        message:
          'Campaign submitted successfully. Waiting for admin approval.'
      })

    } catch (err) {

      console.error(
        '[campaigns POST]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })
    }
  }
)


// ============================================================
// GET /api/campaigns/:id/invites
//
// BRAND / ADMIN:
// GET CURRENT INVITED CREATORS
// ============================================================

router.get(
  '/:id/invites',
  requireAuth,
  requireRole('brand', 'admin'),
  async (req, res) => {

    try {

      const campaign =
        await Campaign.findById(
          req.params.id
        )
          .populate(
            'invitedCreators',
            'name email instagramHandle followersCount engagementRate tier totalEarnings completedCampaigns avatar'
          )


      if (!campaign) {

        return res.status(404).json({
          message: 'Campaign not found.'
        })
      }


      // Brand can only manage own campaign
      if (
        req.user.role === 'brand' &&
        campaign.brandId.toString() !==
          req.user._id.toString()
      ) {

        return res.status(403).json({
          message: 'Access denied.'
        })
      }


      res.json({

        campaign,

        creators:
          campaign.invitedCreators || []

      })

    } catch (err) {

      console.error(
        '[campaign invites GET]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })
    }
  }
)


// ============================================================
// PUT /api/campaigns/:id/invites
//
// BRAND / ADMIN:
// SAVE INVITED CREATORS
//
// Body:
//
// {
//   "creatorIds": ["id1", "id2"]
// }
// ============================================================

router.put(
  '/:id/invites',
  requireAuth,
  requireRole('brand', 'admin'),
  async (req, res) => {

    try {

      const {
        creatorIds
      } = req.body


      const campaign =
        await Campaign.findById(
          req.params.id
        )


      if (!campaign) {

        return res.status(404).json({
          message: 'Campaign not found.'
        })
      }


      // Brand can only edit own campaign
      if (
        req.user.role === 'brand' &&
        campaign.brandId.toString() !==
          req.user._id.toString()
      ) {

        return res.status(403).json({
          message: 'Access denied.'
        })
      }


      // ========================================================
      // Validate creatorIds
      // ========================================================

      if (
        !Array.isArray(creatorIds)
      ) {

        return res.status(400).json({
          message:
            'creatorIds must be an array.'
        })
      }


      // ========================================================
      // Make sure all IDs belong to creators
      // ========================================================

      if (creatorIds.length > 0) {

        const validCreators =
          await User.find({
            _id: {
              $in: creatorIds
            },
            role: 'creator'
          })
            .select('_id')


        const validIds =
          validCreators.map(
            creator =>
              creator._id.toString()
          )


        const invalidIds =
          creatorIds.filter(
            id =>
              !validIds.includes(
                id.toString()
              )
          )


        if (invalidIds.length > 0) {

          return res.status(400).json({
            message:
              'One or more creator IDs are invalid.'
          })
        }
      }


      // ========================================================
      // Save invitations
      // ========================================================

      campaign.invitedCreators =
        creatorIds


      // Count private campaign creators
      campaign.totalCreators =
        campaign.isPrivate
          ? creatorIds.length
          : 0


      await campaign.save()


      res.json({

        campaign,

        message:
          `${creatorIds.length} creator(s) invited successfully.`

      })

    } catch (err) {

      console.error(
        '[campaign invites PUT]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })
    }
  }
)


// ============================================================
// PUT /api/campaigns/:id
//
// BRAND / ADMIN:
// UPDATE CAMPAIGN
// ============================================================

router.put(
  '/:id',
  requireAuth,
  requireRole('brand', 'admin'),
  async (req, res) => {

    try {

      const campaign =
        await Campaign.findById(
          req.params.id
        )


      if (!campaign) {

        return res.status(404).json({
          message: 'Campaign not found.'
        })
      }


      // ========================================================
      // Brand can only edit own campaign
      // ========================================================

      if (
        req.user.role === 'brand' &&
        campaign.brandId.toString() !==
          req.user._id.toString()
      ) {

        return res.status(403).json({
          message: 'Access denied.'
        })
      }


      // ========================================================
      // Allowed fields
      // ========================================================

      const allowed = [

        'title',

        'status',

        'stock',

        'stockLeft',

        'hashtags',

        'handles',

        'deadline',

        'budgetCap',

        'isPrivate',

        'retentionDays',

        'cashbackRate'

      ]


      allowed.forEach(field => {

        if (
          req.body[field] !== undefined
        ) {

          campaign[field] =
            req.body[field]
        }
      })


      // ========================================================
      // If campaign becomes public,
      // remove private invitations.
      // ========================================================

      if (
        campaign.isPrivate === false
      ) {

        campaign.invitedCreators = []

        campaign.totalCreators = 0
      }


      await campaign.save()


      res.json({

        campaign,

        message:
          'Campaign updated successfully.'

      })

    } catch (err) {

      console.error(
        '[campaigns PUT]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })
    }
  }
)


// ============================================================
// DELETE /api/campaigns/:id
//
// BRAND / ADMIN:
// DELETE CAMPAIGN
// ============================================================

router.delete(
  '/:id',
  requireAuth,
  requireRole('brand', 'admin'),
  async (req, res) => {

    try {

      const campaign =
        await Campaign.findById(
          req.params.id
        )


      if (!campaign) {

        return res.status(404).json({
          message: 'Campaign not found.'
        })
      }


      // Brand can only delete own campaign
      if (
        req.user.role === 'brand' &&
        campaign.brandId.toString() !==
          req.user._id.toString()
      ) {

        return res.status(403).json({
          message: 'Access denied.'
        })
      }


      await campaign.deleteOne()


      res.json({
        message:
          'Campaign deleted successfully.'
      })

    } catch (err) {

      console.error(
        '[campaigns DELETE]',
        err
      )

      res.status(500).json({
        message: 'Server error.'
      })
    }
  }
)


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router