const express = require('express')
const router = express.Router()
const http = require('http')

const User = require('../models/User')
const Campaign = require('../models/Campaign')
const Order = require('../models/Order')
const Post = require('../models/Post')
const Product = require('../models/Product')
const Transaction = require('../models/Transaction')

const { requireAuth, requireRole } = require('../middleware/auth')

// ============================================================
// Helper: proxy request to Python bot
// ============================================================

function proxyToPythonBot(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)

    const options = {
      hostname: '127.0.0.1',
      port: 8000,
      path: '/scrape',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = http.request(options, (res) => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
          })
        } catch {
          resolve({
            status: res.statusCode,
            body: {
              error: 'Bad response from bot',
            },
          })
        }
      })
    })

    req.on('error', err => reject(err))

    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('Bot request timed out'))
    })

    req.write(body)
    req.end()
  })
}

// ============================================================
// GET /api/admin/stats
// Platform-wide KPIs
// ============================================================

router.get(
  '/stats',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
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

        User.countDocuments({
          role: 'brand',
          isVerified: true,
        }),

        Campaign.countDocuments({
          status: 'active',
        }),

        Post.countDocuments({
          status: 'pending',
        }),

        Transaction.aggregate([
          {
            $match: {
              type: 'cashback',
              status: 'completed',
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ]),

        Transaction.aggregate([
          {
            $match: {
              type: 'cashback',
              status: 'pending',
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ]),

        Transaction.aggregate([
          {
            $match: {
              type: 'cashback',
              status: 'completed',
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ['$amount', 0.10],
                },
              },
            },
          },
        ]),
      ])

      res.json({
        totalCreators,
        totalBrands,
        verifiedBrands,
        activeCampaigns,
        pendingPosts,

        totalGMV:
          txResult[0]?.total || 0,

        cashbackLiability:
          escrowResult[0]?.total || 0,

        commissionRevenue:
          commissionResult[0]?.total || 0,
      })

    } catch (err) {
      console.error('[admin stats]', err)

      res.status(500).json({
        message: 'Server error.',
      })
    }
  }
)

// ============================================================
// GET /api/admin/analytics
// Monthly metrics
// ============================================================

router.get(
  '/analytics',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {

      const monthlyGMV =
        await Transaction.aggregate([
          {
            $match: {
              type: 'cashback',
              status: 'completed',
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              gmv: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1,
            },
          },
          {
            $limit: 12,
          },
        ])

      const monthlyCreators =
        await User.aggregate([
          {
            $match: {
              role: 'creator',
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1,
            },
          },
        ])

      const monthlyCampaigns =
        await Campaign.aggregate([
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1,
            },
          },
        ])

      const categoryBreakdown =
        await Campaign.aggregate([
          {
            $match: {
              status: 'active',
            },
          },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
            },
          },
          {
            $sort: {
              count: -1,
            },
          },
        ])

      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ]

      const formatMonthly = (arr) =>
        arr.map(d => ({
          month:
            monthNames[(d._id.month || 1) - 1],

          value:
            d.gmv ||
            d.count ||
            0,
        }))

      res.json({
        monthlyGMV:
          formatMonthly(monthlyGMV),

        monthlyCreators:
          formatMonthly(monthlyCreators),

        monthlyCampaigns:
          formatMonthly(monthlyCampaigns),

        categoryBreakdown,
      })

    } catch (err) {
      console.error('[admin analytics]', err)

      res.status(500).json({
        message: 'Server error.',
      })
    }
  }
)

// ============================================================
// GET /api/admin/financial
// ============================================================

router.get(
  '/financial',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {

      const campaignEscrow =
        await Order.aggregate([
          {
            $match: {
              cashbackReleased: false,
              status: {
                $ne: 'cancelled',
              },
            },
          },
          {
            $group: {
              _id: '$campaignId',

              escrow: {
                $sum: '$cashbackAmount',
              },

              creators: {
                $addToSet: '$creatorId',
              },

              totalOrders: {
                $sum: 1,
              },
            },
          },
        ])

      const enriched =
        await Promise.all(
          campaignEscrow.map(
            async e => {

              const campaign =
                await Campaign.findById(
                  e._id
                ).select(
                  'title brand budgetCap'
                )

              return {
                campaign:
                  campaign?.title ||
                  'Unknown',

                brand:
                  campaign?.brand ||
                  'Unknown',

                escrow: e.escrow,

                budget:
                  campaign?.budgetCap ||
                  0,

                creators:
                  e.creators.length,
              }
            }
          )
        )

      const now = new Date()

      const fourWeeks =
        new Date(
          now.getTime() +
          28 * 24 * 60 * 60 * 1000
        )

      const upcomingPayouts =
        await Post.aggregate([
          {
            $match: {
              status: 'approved',
              cashbackReleased: false,
              retentionDeadline: {
                $lte: fourWeeks,
              },
            },
          },
          {
            $group: {
              _id: {
                week: {
                  $week:
                    '$retentionDeadline',
                },
              },

              payouts: {
                $sum: 1,
              },
            },
          },
        ])

      const totalEscrow =
        enriched.reduce(
          (sum, item) =>
            sum + item.escrow,
          0
        )

      const commissionTx =
        await Transaction.aggregate([
          {
            $match: {
              type: 'cashback',
              status: 'completed',
            },
          },
          {
            $group: {
              _id: null,

              total: {
                $sum: {
                  $multiply: [
                    '$amount',
                    0.10,
                  ],
                },
              },
            },
          },
        ])

      res.json({
        campaignEscrow: enriched,

        totalEscrow,

        commissionRevenue:
          commissionTx[0]?.total ||
          0,

        upcomingPayouts,
      })

    } catch (err) {
      console.error(
        '[admin financial]',
        err
      )

      res.status(500).json({
        message: 'Server error.',
      })
    }
  }
)

// ============================================================
// GET /api/admin/campaigns/pending
// Get campaigns waiting for admin approval
// ============================================================

router.get(
  '/campaigns/pending',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {

      const campaigns =
        await Campaign.find({
          status: 'pending',
        })
        .populate(
          'brandId',
          'name companyName email isVerified avatar'
        )
        .sort({
          createdAt: -1,
        })

      res.json({
        campaigns,
      })

    } catch (err) {

      console.error(
        '[admin pending campaigns]',
        err
      )

      res.status(500).json({
        message: 'Server error.',
      })
    }
  }
)

// ============================================================
// PUT /api/admin/campaigns/:id/approve
// Approve pending campaign
// ============================================================

router.put(
  '/campaigns/:id/approve',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {

      const campaign =
        await Campaign.findById(
          req.params.id
        )

      if (!campaign) {
        return res.status(404).json({
          message:
            'Campaign not found.',
        })
      }

      if (campaign.status !== 'pending') {
        return res.status(400).json({
          message:
            `Campaign is already ${campaign.status}.`,
        })
      }

      campaign.status = 'active'

      await campaign.save()

      res.json({
        message:
          'Campaign approved successfully.',

        campaign,
      })

    } catch (err) {

      console.error(
        '[admin campaign approve]',
        err
      )

      res.status(500).json({
        message: 'Server error.',
      })
    }
  }
)

// ============================================================
// PUT /api/admin/campaigns/:id/reject
// Reject pending campaign
// ============================================================

router.put(
  '/campaigns/:id/reject',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {

      const campaign =
        await Campaign.findById(
          req.params.id
        )

      if (!campaign) {
        return res.status(404).json({
          message:
            'Campaign not found.',
        })
      }

      if (campaign.status !== 'pending') {
        return res.status(400).json({
          message:
            `Campaign is already ${campaign.status}.`,
        })
      }

      campaign.status = 'rejected'

      await campaign.save()

      res.json({
        message:
          'Campaign rejected.',

        campaign,
      })

    } catch (err) {

      console.error(
        '[admin campaign reject]',
        err
      )

      res.status(500).json({
        message: 'Server error.',
      })
    }
  }
)

// ============================================================
// GET /api/admin/products
// ============================================================

router.get(
  '/products',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {

      const { status } =
        req.query

      const filter =
        status
          ? { status }
          : {}

      const products =
        await Product.find(filter)
          .populate(
            'brandId',
            'name companyName email'
          )
          .sort({
            createdAt: -1,
          })

      res.json({
        products,
      })

    } catch (err) {

      console.error(
        '[admin products GET]',
        err
      )

      res.status(500).json({
        message: 'Server error.',
      })
    }
  }
)

// ============================================================
// PUT /api/admin/products/:id/approve
// ============================================================

router.put(
  '/products/:id/approve',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {

      const product =
        await Product.findById(
          req.params.id
        )

      if (!product) {
        return res.status(404).json({
          message:
            'Product not found.',
        })
      }

      product.status = 'approved'

      product.rejectionReason = ''

      await product.save()

      res.json({
        product,
      })

    } catch (err) {

      console.error(
        '[admin products approve]',
        err
      )

      res.status(500).json({
        message: 'Server error.',
      })
    }
  }
)

// ============================================================
// PUT /api/admin/products/:id/reject
// ============================================================

router.put(
  '/products/:id/reject',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {

      const product =
        await Product.findById(
          req.params.id
        )

      if (!product) {
        return res.status(404).json({
          message:
            'Product not found.',
        })
      }

      product.status = 'rejected'

      product.rejectionReason =
        req.body.reason ||
        'Does not meet listing requirements.'

      await product.save()

      res.json({
        product,
      })

    } catch (err) {

      console.error(
        '[admin products reject]',
        err
      )

      res.status(500).json({
        message: 'Server error.',
      })
    }
  }
)

// ============================================================
// PUT /api/admin/creators/:id/ig-verify
// ============================================================

router.put(
  '/creators/:id/ig-verify',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {

      const {
        igVerified,
      } = req.body

      const user =
        await User.findByIdAndUpdate(
          req.params.id,

          {
            igVerified:
              !!igVerified,
          },

          {
            new: true,
          }
        ).select('-password')

      if (!user) {
        return res.status(404).json({
          message:
            'Creator not found.',
        })
      }

      res.json({
        user,

        message:
          igVerified
            ? 'Instagram identity verified.'
            : 'Instagram verification revoked.',
      })

    } catch (err) {

      console.error(
        '[admin ig-verify]',
        err
      )

      res.status(500).json({
        message: 'Server error.',
      })
    }
  }
)

// ============================================================
// POST /api/admin/instagram-lookup
// ============================================================

router.post(
  '/instagram-lookup',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {

    const {
      username,
      max_posts = 10,
    } = req.body

    if (!username) {
      return res.status(400).json({
        error:
          'Username is required.',
      })
    }

    try {

      const result =
        await proxyToPythonBot({
          username,
          max_posts,
        })

      return res
        .status(result.status)
        .json(result.body)

    } catch (err) {

      console.error(
        '[admin instagram-lookup]',
        err.message
      )

      if (
        err.message.includes(
          'timed out'
        )
      ) {
        return res.status(504).json({
          error:
            'Scraper timed out. Make sure bot/server.py is running on port 8000.',
        })
      }

      return res.status(503).json({
        error:
          'Could not reach scraper bot. Make sure bot/server.py is running on port 8000.',
      })
    }
  }
)

module.exports = router