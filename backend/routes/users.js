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
      'logoUrl', 'address',
      // admin only
      'isVerified', 'igVerified', 'tier', 'role',
    ]

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        // Non-admin cannot change role / verification flags / tier
        if (['isVerified', 'igVerified', 'tier', 'role'].includes(k) && req.user.role !== 'admin') return
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

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING ADDRESSES  (creator only, stored in User.shippingAddresses)
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/users/:id/addresses — list all addresses
router.get('/:id/addresses', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString())
      return res.status(403).json({ message: 'Access denied.' })
    const user = await User.findById(req.params.id).select('shippingAddresses')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json({ addresses: user.shippingAddresses })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/users/:id/addresses — add a new address
router.post('/:id/addresses', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString())
      return res.status(403).json({ message: 'Access denied.' })
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    const { label, fullName, phone, street, city, state, zip, country, isDefault } = req.body
    if (!street) return res.status(400).json({ message: 'Street is required.' })

    // If new address is default → clear existing defaults
    if (isDefault) user.shippingAddresses.forEach(a => { a.isDefault = false })
    // If this is the first address, auto-default it
    const makeDefault = isDefault || user.shippingAddresses.length === 0

    user.shippingAddresses.push({ label, fullName, phone, street, city, state, zip, country, isDefault: makeDefault })
    await user.save()
    res.status(201).json({ addresses: user.shippingAddresses })
  } catch (err) {
    console.error('[addresses POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// PUT  /api/users/:id/addresses/:addrId — update an address
router.put('/:id/addresses/:addrId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString())
      return res.status(403).json({ message: 'Access denied.' })
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    const addr = user.shippingAddresses.id(req.params.addrId)
    if (!addr) return res.status(404).json({ message: 'Address not found.' })

    const { label, fullName, phone, street, city, state, zip, country, isDefault } = req.body
    if (label     !== undefined) addr.label    = label
    if (fullName  !== undefined) addr.fullName = fullName
    if (phone     !== undefined) addr.phone    = phone
    if (street    !== undefined) addr.street   = street
    if (city      !== undefined) addr.city     = city
    if (state     !== undefined) addr.state    = state
    if (zip       !== undefined) addr.zip      = zip
    if (country   !== undefined) addr.country  = country
    if (isDefault) {
      user.shippingAddresses.forEach(a => { a.isDefault = false })
      addr.isDefault = true
    }

    await user.save()
    res.json({ addresses: user.shippingAddresses })
  } catch (err) {
    console.error('[addresses PUT]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// DELETE /api/users/:id/addresses/:addrId — remove an address
router.delete('/:id/addresses/:addrId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString())
      return res.status(403).json({ message: 'Access denied.' })
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    const addr = user.shippingAddresses.id(req.params.addrId)
    if (!addr) return res.status(404).json({ message: 'Address not found.' })

    const wasDefault = addr.isDefault
    addr.deleteOne()

    // If deleted address was default, auto-promote next one
    if (wasDefault && user.shippingAddresses.length > 0) {
      user.shippingAddresses[0].isDefault = true
    }
    await user.save()
    res.json({ addresses: user.shippingAddresses })
  } catch (err) {
    console.error('[addresses DELETE]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// PUT  /api/users/:id/addresses/:addrId/default — set as default
router.put('/:id/addresses/:addrId/default', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString())
      return res.status(403).json({ message: 'Access denied.' })
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found.' })

    const addr = user.shippingAddresses.id(req.params.addrId)
    if (!addr) return res.status(404).json({ message: 'Address not found.' })

    user.shippingAddresses.forEach(a => { a.isDefault = a._id.equals(addr._id) })
    await user.save()
    res.json({ addresses: user.shippingAddresses })
  } catch (err) {
    console.error('[addresses default]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
