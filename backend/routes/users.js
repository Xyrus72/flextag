const express = require('express')
const router  = express.Router()
const User    = require('../models/User')
const { requireAuth, requireRole } = require('../middleware/auth')

// ── GET /api/users/brand/ratings — creator reviews for current brand ────────
router.get('/brand/ratings', requireAuth, requireRole('brand'), async (req, res) => {
  try {
    const Order   = require('../models/Order')
    // Ratings are stored in orders as creatorRating object
    const orders  = await Order.find({ brandId: req.user._id, 'creatorRating.quality': { $exists: true } })
      .populate('creatorId', 'name instagramHandle')
      .select('product creatorId creatorRating createdAt')
      .sort({ createdAt: -1 })

    const ratings = orders.map(o => ({
      _id:       o._id,
      orderId:   { product: o.product },
      creatorId: o.creatorId,
      quality:   o.creatorRating?.quality  || 0,
      shipping:  o.creatorRating?.shipping || 0,
      support:   o.creatorRating?.support  || 0,
      comment:   o.creatorRating?.comment  || '',
      createdAt: o.createdAt,
    }))

    res.json({ ratings })
  } catch (err) {
    console.error('[brand ratings]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/users/leaderboard ─────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const creators = await User.find({ role: 'creator' })
      .select('name instagramHandle followersCount engagementRate tier totalEarnings completedCampaigns avatar')
      .sort({ totalEarnings: -1 })
      .limit(50)

    res.json({ creators })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/users/me/stats — dashboard stats for current user ─────────────
router.get('/me/stats', requireAuth, async (req, res) => {
  try {
    const user = req.user

    if (user.role === 'creator') {
      const Order  = require('../models/Order')
      const Post   = require('../models/Post')
      const Transaction = require('../models/Transaction')

      const [orders, posts, txResult] = await Promise.all([
        Order.find({ creatorId: user._id }),
        Post.find({ creatorId: user._id }),
        Transaction.aggregate([
          { $match: { userId: user._id, type: 'cashback', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ])

      const activeOrders    = orders.filter(o => !['delivered','cancelled'].includes(o.status))
      const completedPosts  = posts.filter(p => p.status === 'approved')
      const totalEarned     = txResult[0]?.total || 0

      return res.json({
        totalEarned,
        activeCampaigns: activeOrders.length,
        completedPosts: completedPosts.length,
        engagementRate: user.engagementRate,
      })
    }

    if (user.role === 'brand') {
      const Campaign = require('../models/Campaign')
      const Order    = require('../models/Order')
      const Transaction = require('../models/Transaction')

      const [campaigns, orders, txResult] = await Promise.all([
        Campaign.find({ brandId: user._id, status: 'active' }),
        Order.find({ brandId: user._id }),
        Transaction.aggregate([
          { $match: { type: 'cashback', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ])

      const uniqueCreators = [...new Set(orders.map(o => o.creatorId.toString()))].length

      return res.json({
        activeCampaigns:    campaigns.length,
        totalCreators:      uniqueCreators,
        cashbackDisbursed:  txResult[0]?.total || 0,
        recentOrders:       orders.slice(0, 5),
      })
    }

    res.json({})
  } catch (err) {
    console.error('[users stats]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/users — admin list users ─────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, isVerified, q } = req.query
    const filter = {}
    if (role)       filter.role = role
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true'
    if (q) filter.$or = [
      { name:  { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { companyName: { $regex: q, $options: 'i' } },
    ]

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })

    res.json({ users })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/users/:id ─────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json({ user })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/users/:id — update own profile or admin update ───────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    // Non-admin can only edit themselves
    if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' })
    }

    const allowed = [
      'name', 'phone', 'instagramHandle', 'tiktokHandle', 'followersCount',
      'engagementRate', 'companyName', 'website', 'productCategory', 'avatar',
      // admin only
      'isVerified', 'tier', 'role',
    ]

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        // Non-admin cannot change role/isVerified/tier
        if (['isVerified', 'tier', 'role'].includes(k) && req.user.role !== 'admin') return
        user[k] = req.body[k]
      }
    })

    await user.save()
    const obj = user.toObject()
    delete obj.password
    res.json({ user: obj })
  } catch (err) {
    console.error('[users PUT]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/users/:id/verify — admin verifies brand ──────────────────────
router.put('/:id/verify', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { isVerified } = req.body
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: !!isVerified },
      { new: true }
    ).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json({ user, message: isVerified ? 'Brand verified.' : 'Brand rejected.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
