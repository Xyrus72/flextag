const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const Order   = require('../models/Order')
const { parseCsvObjects } = require('../utils/csv')
const audit = require('../services/audit')
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

/* ── Bulk import ─────────────────────────────────────────────────────────────
 * A D2C brand with 40 SKUs is not going to fill in 40 forms. This takes the
 * spreadsheet they already have.
 *
 * Validation is per-row and non-fatal: good rows import, bad rows come back
 * with the line number and what was wrong, so nobody has to guess which of the
 * forty lines broke. Nothing is written until the whole file has been checked
 * (dryRun tells them what WOULD happen first).
 */
const IMPORT_COLUMNS = ['name', 'price', 'cashbackrate', 'category', 'stock', 'description', 'image', 'instantsplitpct', 'minfollowers', 'hashtags', 'taghandles', 'campaignbudget']

router.get('/import/template.csv', requireAuth, requireRole('brand', 'admin'), (_req, res) => {
  const header = 'name,price,cashbackRate,category,stock,description,image,instantSplitPct,minFollowers,hashtags,tagHandles,campaignBudget'
  const example = 'Glow Serum 50ml,2200,55,Skincare,40,"Vitamin C serum, 50ml",,30,1000,"#glowserum #flextag",@rimonbeauty,50000'
  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set('Content-Disposition', 'attachment; filename="flextag-product-import-template.csv"')
  res.send([header, example, ''].join('\r\n'))
})

router.post('/import', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const { csv, dryRun } = req.body || {}
    if (!csv || typeof csv !== 'string') return res.status(400).json({ message: 'Paste or upload a CSV first.' })
    if (csv.length > 500_000) return res.status(413).json({ message: 'That file is too big — split it into batches of a few hundred rows.' })

    const { headers, rows } = parseCsvObjects(csv)
    if (!rows.length) return res.status(400).json({ message: 'No data rows found under the header.' })
    if (rows.length > 500) return res.status(413).json({ message: 'Import up to 500 rows at a time.' })
    const missing = ['name', 'price', 'cashbackrate', 'category'].filter(c => !headers.includes(c))
    if (missing.length) {
      return res.status(400).json({ message: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Download the template to see the format.` })
    }

    const num = (v, fallback = 0) => {
      const n = Number(String(v).replace(/[,৳\s]/g, ''))
      return Number.isFinite(n) ? n : fallback
    }
    const list = (v) => String(v || '').split(/[\s,]+/).map(x => x.trim()).filter(Boolean)

    const valid = []
    const errors = []
    rows.forEach((r, i) => {
      const line = i + 2   // +1 for the header, +1 because humans count from one
      const name = r.name
      const price = num(r.price, NaN)
      const rate = num(r.cashbackrate, NaN)
      const problems = []
      if (!name) problems.push('name is empty')
      if (!Number.isFinite(price) || price <= 0) problems.push('price must be a positive number')
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) problems.push('cashbackRate must be between 0 and 100')
      if (!r.category) problems.push('category is empty')
      if (problems.length) { errors.push({ line, name: name || '(no name)', problems }); return }

      valid.push({
        name,
        price,
        cashbackRate: rate,
        category: r.category,
        stock: num(r.stock, 0),
        description: r.description || '',
        image: r.image || '',
        instantSplitPct: Math.min(100, Math.max(0, num(r.instantsplitpct, 0))),
        campaignBudget: num(r.campaignbudget, 50000),
        creatorCriteria: { minFollowers: num(r.minfollowers, 1000) },
        postingRules: { hashtags: list(r.hashtags), taggingHandles: list(r.taghandles) },
        brand: req.user.companyName || req.user.name,
        brandId: req.user._id,
        status: 'pending',   // bulk import does not bypass approval
        totalCashbackSpent: 0,
      })
    })

    if (dryRun) {
      return res.json({
        dryRun: true, wouldImport: valid.length, errors,
        preview: valid.slice(0, 5).map(v => ({ name: v.name, price: v.price, cashbackRate: v.cashbackRate, category: v.category })),
        message: `${valid.length} row${valid.length === 1 ? '' : 's'} ready${errors.length ? `, ${errors.length} to fix` : ''}.`,
      })
    }

    const created = valid.length ? await Product.insertMany(valid, { ordered: false }) : []
    audit.record({
      actor: req.user, action: 'product.imported', targetType: 'product', targetName: `${created.length} products`,
      summary: `Bulk-imported ${created.length} product${created.length === 1 ? '' : 's'}${errors.length ? ` (${errors.length} row(s) skipped)` : ''}`, req,
    })
    res.status(201).json({
      imported: created.length, errors,
      products: created.map(p => ({ _id: p._id, name: p.name })),
      message: `${created.length} product${created.length === 1 ? '' : 's'} imported and queued for approval${errors.length ? `; ${errors.length} row(s) skipped` : ''}.`,
    })
  } catch (err) {
    console.error('[products import]', err)
    res.status(500).json({ message: 'Server error while importing.' })
  }
})

module.exports = router
