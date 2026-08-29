const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const Order   = require('../models/Order')
const { requireAuth, requireRole } = require('../middleware/auth')

router.get('/', async (req, res) => {
  try {
    const { category, q, brand, minPrice, maxPrice, minCashback, maxCashback, sort, brandId } = req.query
    const filter = { isActive: true, status: 'approved' }

    if (category && category !== 'All') filter.category = category
    if (brand && brand !== 'All') filter.brand = brand
    if (brandId) filter.brandId = brandId

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    }

    if (minPrice || maxPrice) {
      filter.price = {}
      if (minPrice) filter.price.$gte = Number(minPrice)
      if (maxPrice) filter.price.$lte = Number(maxPrice)
    }

    if (minCashback || maxCashback) {
      filter.cashbackRate = {}
      if (minCashback) filter.cashbackRate.$gte = Number(minCashback)
      if (maxCashback) filter.cashbackRate.$lte = Number(maxCashback)
    }

    let query = Product.find(filter).populate('brandId', 'name companyName logoUrl avatar email productCategory isVerified')

    if (sort === 'cashback') query = query.sort({ cashbackRate: -1 })
    else if (sort === 'price_low') query = query.sort({ price: 1 })
    else if (sort === 'price_high') query = query.sort({ price: -1 })
    else if (sort === 'rating') query = query.sort({ rating: -1, reviews: -1 })
    else query = query.sort({ createdAt: -1 })

    const products = await query
    res.json({ products })
  } catch (err) {
    console.error('[products GET]', err)
    res.status(500).json({ message: 'Server error fetching products.' })
  }
})

router.get('/my', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const products = await Product.find({ brandId: req.user._id }).sort({ createdAt: -1 })
    res.json({ products })
  } catch (err) {
    console.error('[products GET /my]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('brandId', 'name companyName logoUrl avatar email productCategory address isVerified')
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    res.json({ product })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/products/:id/reviews — creator reviews of this product ────────
// Public: the reviews are the whole point of the stars on the card. Only the
// product-quality score and comment are shown; shipping/support belong to the
// brand's reputation, not the product's.
router.get('/:id/reviews', async (req, res) => {
  try {
    const orders = await Order.find({ productId: req.params.id, 'creatorRating.quality': { $gt: 0 } })
      .populate('creatorId', 'name instagramHandle avatar tier')
      .select('creatorRating creatorId createdAt')
      .sort({ 'creatorRating.at': -1 })
      .limit(30)
      .lean()
    const reviews = orders.map(o => ({
      id: String(o._id),
      creator: o.creatorId?.name || 'Creator',
      handle: o.creatorId?.instagramHandle || '',
      avatar: o.creatorId?.avatar || null,
      tier: o.creatorId?.tier || 'bronze',
      quality: o.creatorRating.quality,
      shipping: o.creatorRating.shipping,
      support: o.creatorRating.support,
      comment: o.creatorRating.comment || '',
      at: o.creatorRating.at || o.createdAt,
    }))
    const average = reviews.length
      ? Number((reviews.reduce((sum, r) => sum + r.quality, 0) / reviews.length).toFixed(2))
      : 0
    res.json({ reviews, average, count: reviews.length })
  } catch (err) {
    console.error('[product reviews]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

router.post('/', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const { name, price, cashbackRate, instantSplitPct, category, image, description, stock, campaignBudget, creatorCriteria, postingRules } = req.body
    if (!name || !price || !cashbackRate || !category) {
      return res.status(400).json({ message: 'name, price, cashbackRate and category are required.' })
    }
    const product = await Product.create({
      name,
      price: Number(price),
      cashbackRate: Number(cashbackRate),
      instantSplitPct: Math.min(100, Math.max(0, Number(instantSplitPct) || 0)),
      category,
      image: image || '',
      description: description || '',
      stock: Number(stock) || 0,
      campaignBudget: Number(campaignBudget) || 50000,
      totalCashbackSpent: 0,
      brand: req.user.companyName || req.user.name,
      brandId: req.user._id,
      status: 'pending',
      creatorCriteria: creatorCriteria || {},
      postingRules: postingRules || {}
    })
    res.status(201).json({ product })
  } catch (err) {
    console.error('[products POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

router.put('/:id', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    if (req.user.role === 'brand' && product.brandId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    const allowed = ['name', 'price', 'cashbackRate', 'instantSplitPct', 'category', 'image', 'description', 'stock', 'campaignBudget', 'totalCashbackSpent', 'isActive', 'inStock', 'creatorCriteria', 'postingRules']
    allowed.forEach(k => {
      if (req.body[k] === undefined) return
      product[k] = k === 'instantSplitPct' ? Math.min(100, Math.max(0, Number(req.body[k]) || 0)) : req.body[k]
    })
    await product.save()
    res.json({ product })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
