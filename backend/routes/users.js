const express = require('express')
const router  = express.Router()
const User    = require('../models/User')
const { requireAuth, requireRole } = require('../middleware/auth')
const { normalizeHandle, handleRegex } = require('../services/instagram/endpoints')
const { auditUserInBackground } = require('../services/instagram/audit')
const IgAudit = require('../models/IgAudit')
const { notifySafe } = require('../services/notifications')
const { generateReferralCode, REFERRAL_BONUS } = require('../services/referrals')

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

    res.json({ ratings, average: req.user.brandRatingAvg || 0, count: req.user.brandRatingCount || 0 })
  } catch (err) {
    console.error('[brand ratings]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/users/leaderboard ─────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const creators = await User.find({ role: 'creator' })
      .select('name instagramHandle followersCount engagementRate tier totalEarnings completedCampaigns avatar creatorRatingAvg creatorRatingCount')
      .sort({ totalEarnings: -1 })
      .limit(50)

    res.json({ creators })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/users/portfolio/:handle — PUBLIC creator portfolio ─────────────
// Safe, shareable subset (no email / no fake-follower %). Powers /u/:handle.
router.get('/portfolio/:handle', async (req, res) => {
  try {
    const handle = normalizeHandle(req.params.handle)
    if (!handle) return res.status(400).json({ message: 'Invalid handle.' })
    const creator = await User.findOne({ role: 'creator', instagramHandle: handleRegex(handle) })
      .select('name instagramHandle avatar tier followersCount engagementRate igHealthScore igVerified completedCampaigns createdAt creatorRatingAvg creatorRatingCount')
      .lean()
    if (!creator) return res.status(404).json({ message: 'Creator not found.' })

    const Post = require('../models/Post')
    const posts = await Post.find({ creatorId: creator._id, status: 'approved' })
      .populate('campaignId', 'title brand product')
      .sort({ approvedAt: -1, createdAt: -1 })
      .limit(24)
    const items = posts.map(p => {
      const s = (p.verification && p.verification.snapshot) || {}
      return {
        _id: p._id, permalink: s.permalink || p.postUrl, thumbnail: s.thumbnail || '', mediaType: s.mediaType || '',
        likes: s.likes ?? null, comments: s.comments ?? null, views: s.views ?? null,
        brand: p.campaignId?.brand, product: p.campaignId?.product,
      }
    })
    res.json({
      creator: {
        name: creator.name, instagramHandle: normalizeHandle(creator.instagramHandle), avatar: creator.avatar,
        tier: creator.tier, followersCount: creator.followersCount, engagementRate: creator.engagementRate,
        healthScore: creator.igHealthScore, igVerified: creator.igVerified, completedCampaigns: creator.completedCampaigns,
        memberSince: creator.createdAt,
      },
      posts: items,
    })
  } catch (err) {
    console.error('[users portfolio]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/users/me/referrals — current user's referral code + stats ──────
router.get('/me/referrals', requireAuth, async (req, res) => {
  try {
    let code = req.user.referralCode
    if (!code) { code = await generateReferralCode(); await User.updateOne({ _id: req.user._id }, { $set: { referralCode: code } }) }
    const [count, rewarded] = await Promise.all([
      User.countDocuments({ referredBy: req.user._id }),
      User.countDocuments({ referredBy: req.user._id, referralRewarded: true }),
    ])
    res.json({ code, count, rewarded, bonus: REFERRAL_BONUS })
  } catch (err) {
    console.error('[users referrals]', err)
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

// ── POST /api/users/:id/invite — brand invites a creator to a campaign ──────
router.post('/:id/invite', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const creator = await User.findOne({ _id: req.params.id, role: 'creator' }).select('_id name')
    if (!creator) return res.status(404).json({ message: 'Creator not found.' })
    const brandName = req.user.companyName || req.user.name
    const message = String(req.body?.message || '').trim().slice(0, 200)
    notifySafe(creator._id, {
      type: 'invite', icon: '📨',
      title: `${brandName} invited you to a campaign`,
      body: message || `${brandName} wants you to promote one of their products. Browse the catalog to get started.`,
      link: '/creator/catalog',
      meta: { brandId: String(req.user._id), campaignId: req.body?.campaignId || null },
    })
    res.json({ message: `Invite sent to ${creator.name}.` })
  } catch (err) {
    console.error('[users invite]', err)
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

    // Normalize the Instagram handle; a changed handle invalidates identity checks.
    const prevHandle = normalizeHandle(user.instagramHandle)
    let handleChanged = false
    if (req.body.instagramHandle !== undefined) {
      const raw = String(req.body.instagramHandle || '').trim()
      const next = normalizeHandle(raw)
      if (raw && !next) return res.status(400).json({ message: 'Enter a valid Instagram handle (letters, numbers, dots, underscores).' })
      req.body.instagramHandle = next
      handleChanged = next !== prevHandle
      if (handleChanged && next && await User.exists({ role: 'creator', instagramHandle: handleRegex(next), _id: { $ne: user._id } })) {
        return res.status(409).json({ message: `@${next} is already linked to another FlexTag account.` })
      }
    }

    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        // Non-admin cannot change role / verification flags / tier
        if (['isVerified', 'igVerified', 'tier', 'role'].includes(k) && req.user.role !== 'admin') return
        user[k] = req.body[k]
      }
    })

    if (handleChanged) {
      user.igVerified = false
      user.igVerifiedAt = null
      user.igVerifyCode = ''
      user.igVerifyCodeAt = null
      user.igPrecheck = 'pending'
      user.igAuditedAt = null
      user.igHealthScore = null
      user.igFakeFollowerPct = null
      user.igIsPrivate = null
    }

    await user.save()
    if (handleChanged && user.role === 'creator') {
      // The old handle's audit no longer describes this creator.
      await IgAudit.updateMany({ user: user._id }, { $set: { user: null } }).catch(() => {})
      auditUserInBackground(user)
    }
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

/* ── Wishlist ────────────────────────────────────────────────────────────────
 * Creators shop on a budget and campaigns come and go — a saved product is how
 * they come back when the cashback is right. Stored on the user (a short list
 * per person), deduped with $addToSet so a double tap is harmless.
 */

// GET /api/users/me/wishlist
router.get('/me/wishlist', requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .select('wishlist')
      .populate('wishlist', 'name brand brandId price cashbackRate instantSplitPct image category rating reviews inStock stock isActive status campaignBudget totalCashbackSpent creatorCriteria')
      .lean()
    // Products that were deleted or pulled from the catalog simply drop out.
    const products = (me?.wishlist || []).filter(p => p && p.isActive !== false && p.status !== 'rejected')
    res.json({ products, ids: products.map(p => String(p._id)) })
  } catch (err) {
    console.error('[wishlist GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/users/me/wishlist/:productId
router.post('/me/wishlist/:productId', requireAuth, async (req, res) => {
  try {
    const Product = require('../models/Product')
    const exists = await Product.exists({ _id: req.params.productId })
    if (!exists) return res.status(404).json({ message: 'Product not found.' })
    await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: req.params.productId } })
    const me = await User.findById(req.user._id).select('wishlist').lean()
    res.json({ ids: (me?.wishlist || []).map(String), message: 'Saved to your wishlist.' })
  } catch (err) {
    console.error('[wishlist POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// DELETE /api/users/me/wishlist/:productId
router.delete('/me/wishlist/:productId', requireAuth, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: req.params.productId } })
    const me = await User.findById(req.user._id).select('wishlist').lean()
    res.json({ ids: (me?.wishlist || []).map(String), message: 'Removed from your wishlist.' })
  } catch (err) {
    console.error('[wishlist DELETE]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── Creator earnings analytics ──────────────────────────────────────────────
 * "How much have I actually made, and where from?" — answered from the ledger
 * and the orders, never from a stored aggregate that could drift.
 */
router.get('/me/earnings', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const Transaction = require('../models/Transaction')
    const Order = require('../models/Order')
    const { computeBalance } = require('../utils/balance')
    const months = Math.min(24, Math.max(3, Number(req.query.months) || 6))
    const since = new Date()
    since.setMonth(since.getMonth() - (months - 1))
    since.setDate(1); since.setHours(0, 0, 0, 0)

    const [rows, series, byBrand, pendingOrders] = await Promise.all([
      Transaction.find({ userId: req.user._id }).select('type status amount').lean(),
      Transaction.aggregate([
        { $match: { userId: req.user._id, status: 'completed', type: { $in: ['cashback', 'clawback', 'refund'] }, createdAt: { $gte: since } } },
        { $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          cashback:  { $sum: { $cond: [{ $eq: ['$type', 'cashback'] }, '$amount', 0] } },
          clawback:  { $sum: { $cond: [{ $eq: ['$type', 'clawback'] }, '$amount', 0] } },
          refunds:   { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, '$amount', 0] } },
        } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      Order.aggregate([
        { $match: { creatorId: req.user._id, cashbackReleased: true } },
        { $group: { _id: '$brand', earned: { $sum: '$cashbackAmount' }, discounts: { $sum: '$instantDiscount' }, orders: { $sum: 1 } } },
        { $sort: { earned: -1 } },
        { $limit: 10 },
      ]),
      Order.aggregate([
        { $match: { creatorId: req.user._id, cashbackReleased: false, status: { $nin: ['cancelled', 'returned'] } } },
        { $group: { _id: null, waiting: { $sum: '$cashbackAmount' }, orders: { $sum: 1 } } },
      ]),
    ])

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    // Fill the gaps: a month with no earnings must still appear, or the chart lies.
    const monthly = []
    const cursor = new Date(since)
    for (let i = 0; i < months; i += 1) {
      const y = cursor.getFullYear(); const m = cursor.getMonth() + 1
      const hit = series.find(s => s._id.y === y && s._id.m === m)
      monthly.push({
        label: `${MONTHS[m - 1]} ${String(y).slice(2)}`,
        earned: Math.max(0, (hit?.cashback || 0) - (hit?.clawback || 0)),
        refunds: hit?.refunds || 0,
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }

    const balance = computeBalance(rows)
    res.json({
      ...balance,
      monthly,
      byBrand: byBrand.map(b => ({ brand: b._id || 'Unknown', earned: b.earned, discounts: b.discounts, orders: b.orders })),
      waitingOnPosts: pendingOrders[0]?.waiting || 0,
      openOrders: pendingOrders[0]?.orders || 0,
      lifetime: balance.totalEarnings,
    })
  } catch (err) {
    console.error('[me earnings]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── Activation checklist ────────────────────────────────────────────────────
 * The first-transaction funnel, made visible. Every step is DERIVED from data
 * that already exists — nothing to store, nothing to drift: the checklist is
 * simply the truth about how far this creator has actually got.
 */
router.get('/me/checklist', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const Transaction = require('../models/Transaction')
    const Post = require('../models/Post')
    const Order = require('../models/Order')
    const u = req.user

    const [hasOrder, deliveredWaiting, hasPost, firstCashback] = await Promise.all([
      Order.exists({ creatorId: u._id }),
      Order.exists({ creatorId: u._id, status: 'delivered', cashbackReleased: false }),
      Post.exists({ creatorId: u._id }),
      Transaction.exists({ userId: u._id, type: 'cashback', status: 'completed' }),
    ])

    const steps = [
      {
        key: 'verify',
        title: 'Verify your Instagram',
        detail: u.igVerified
          ? 'Done — your posts can be approved automatically.'
          : 'Prove the account is yours (bio code, or one tap with Connect). Verified creators get cashback released automatically.',
        done: !!u.igVerified,
        link: '/creator/instagram-analyzer',
      },
      {
        key: 'order',
        title: 'Place your first order',
        detail: hasOrder ? 'Done.' : 'Pick a product — you pay the discounted price, the rest comes back as cashback.',
        done: !!hasOrder,
        link: '/creator/catalog',
      },
      {
        key: 'post',
        title: 'Post about it and submit',
        detail: hasPost
          ? 'Done.'
          : deliveredWaiting
            ? 'Your order arrived — post the reel and claim the cashback waiting on it.'
            : 'Once your order is delivered, post with the campaign hashtags. FlexTag usually spots it by itself.',
        done: !!hasPost,
        urgent: !hasPost && !!deliveredWaiting,
        link: '/creator/submit-post',
      },
      {
        key: 'earn',
        title: 'Get your first cashback',
        detail: firstCashback ? 'Done — you are a paid creator now.' : 'Released automatically when your post passes verification.',
        done: !!firstCashback,
        link: '/creator/wallet',
      },
    ]

    const completed = steps.filter(s => s.done).length
    res.json({ steps, completed, total: steps.length, finished: completed === steps.length })
  } catch (err) {
    console.error('[checklist]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
