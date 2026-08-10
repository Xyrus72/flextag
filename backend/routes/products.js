const express = require('express')
const router  = express.Router()
const Product = require('../models/Product')
const { requireAuth, requireRole } = require('../middleware/auth')

// ── GET /api/products — approved catalog (creators / public) ──────────────────
router.get('/', async (req, res) => {
  try {
    const { category, q, sort, brandId } = req.query
    const filter = { isActive: true, status: 'approved' }
    if (category && category !== 'All') filter.category = category
    if (brandId)  filter.brandId = brandId
    if (q)        filter.$or = [
      { name:  { $regex: q, $options: 'i' } },
      { brand: { $regex: q, $options: 'i' } },
    ]

    let query = Product.find(filter).populate('brandId', 'name companyName logoUrl avatar email productCategory isVerified')
    if (sort === 'cashback')        query = query.sort({ cashbackRate: -1 })
    else if (sort === 'price_low')  query = query.sort({ price: 1 })
    else if (sort === 'price_high') query = query.sort({ price: -1 })
    else if (sort === 'rating')     query = query.sort({ rating: -1 })
    else query = query.sort({ createdAt: -1 })

    const products = await query
    res.json({ products })
  } catch (err) {
    console.error('[products GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/products/my — brand sees their own products (all statuses) ───────
router.get('/my', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const products = await Product.find({ brandId: req.user._id }).sort({ createdAt: -1 })
    res.json({ products })
  } catch (err) {
    console.error('[products GET /my]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/products/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('brandId', 'name companyName logoUrl avatar email productCategory address isVerified')
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    res.json({ product })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/products — brand submits a product (starts as pending) ──────────
router.post('/', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const { name, price, cashbackRate, category, image, description, stock } = req.body
    if (!name || !price || !cashbackRate || !category) {
      return res.status(400).json({ message: 'name, price, cashbackRate and category are required.' })
    }
    const product = await Product.create({
      name,
      price:        Number(price),
      cashbackRate: Number(cashbackRate),
      category,
      image:        image || '',
      description:  description || '',
      stock:        Number(stock) || 0,
      brand:        req.user.companyName || req.user.name,
      brandId:      req.user._id,
      status:       'pending',  // always starts pending
    })
    res.status(201).json({ product })
  } catch (err) {
    console.error('[products POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/products/:id ──────────────────────────────────────────────────────
router.put('/:id', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    if (req.user.role === 'brand' && product.brandId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    const allowed = ['name', 'price', 'cashbackRate', 'category', 'image', 'description', 'stock', 'isActive', 'inStock']
    allowed.forEach(k => { if (req.body[k] !== undefined) product[k] = req.body[k] })
    await product.save()
    res.json({ product })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
