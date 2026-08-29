const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const { requireAuth, requireRole } = require('../middleware/auth')

const DEMO_PRODUCTS = [
  {
    _id: 'p-101',
    name: 'AuraGlow Vitamin C Glow Serum',
    brand: 'AuraGlow Beauty',
    price: 1200,
    cashbackRate: 50,
    category: 'Beauty',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
    rating: 4.9,
    reviews: 24,
    inStock: true,
    stock: 25,
    description: 'Brightening vitamin C serum enriched with hyaluronic acid for radiant skin glow.',
    status: 'approved',
    campaignBudget: 50000,
    totalCashbackSpent: 12000,
    creatorCriteria: { minFollowers: 1000, targetCategory: 'Beauty' },
    postingRules: { hashtags: ['#FlexTag', '#AuraGlow', '#SkinGlow'], taggingHandles: ['@flextag.official', '@auraglow.bd'] }
  },
  {
    _id: 'p-102',
    name: 'SoundPulse Wireless Earbuds Pro',
    brand: 'SoundPulse Tech',
    price: 3500,
    cashbackRate: 40,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500',
    rating: 4.7,
    reviews: 18,
    inStock: true,
    stock: 15,
    description: 'Active noise cancellation earbuds with 30-hour battery life and immersive bass.',
    status: 'approved',
    campaignBudget: 80000,
    totalCashbackSpent: 28000,
    creatorCriteria: { minFollowers: 2500, targetCategory: 'Tech' },
    postingRules: { hashtags: ['#FlexTag', '#SoundPulse', '#TechReview'], taggingHandles: ['@flextag.official', '@soundpulse'] }
  },
  {
    _id: 'p-103',
    name: 'PureBotanika Hydrating Rose Toner',
    brand: 'PureBotanika',
    price: 850,
    cashbackRate: 40,
    category: 'Beauty',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
    rating: 4.8,
    reviews: 15,
    inStock: true,
    stock: 30,
    description: 'Organic rose water facial mist for instant hydration and skin soothing.',
    status: 'approved',
    campaignBudget: 30000,
    totalCashbackSpent: 6000,
    creatorCriteria: { minFollowers: 1000, targetCategory: 'Beauty' },
    postingRules: { hashtags: ['#FlexTag', '#PureBotanika'], taggingHandles: ['@flextag.official'] }
  },
  {
    _id: 'p-104',
    name: 'UrbanStep Minimalist Sneakers',
    brand: 'UrbanStep Footwear',
    price: 4200,
    cashbackRate: 35,
    category: 'Fashion',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
    rating: 4.6,
    reviews: 12,
    inStock: true,
    stock: 12,
    description: 'Lightweight breathable canvas sneakers engineered for modern street style.',
    status: 'approved',
    campaignBudget: 100000,
    totalCashbackSpent: 35000,
    creatorCriteria: { minFollowers: 5000, targetCategory: 'Fashion' },
    postingRules: { hashtags: ['#FlexTag', '#UrbanStep', '#StreetStyle'], taggingHandles: ['@flextag.official', '@urbanstep'] }
  },
  {
    _id: 'p-105',
    name: 'GlowBrew Organic Matcha Green Tea',
    brand: 'GlowBrew Organics',
    price: 950,
    cashbackRate: 50,
    category: 'Lifestyle',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500',
    rating: 4.9,
    reviews: 31,
    inStock: true,
    stock: 40,
    description: 'Ceremonial grade Japanese matcha powder packed with antioxidants.',
    status: 'approved',
    campaignBudget: 40000,
    totalCashbackSpent: 18000,
    creatorCriteria: { minFollowers: 1000, targetCategory: 'Lifestyle' },
    postingRules: { hashtags: ['#FlexTag', '#GlowBrewMatcha'], taggingHandles: ['@flextag.official'] }
  },
  {
    _id: 'p-106',
    name: 'FlexFit Seamless Gym Set',
    brand: 'FlexFit Active',
    price: 2800,
    cashbackRate: 45,
    category: 'Fashion',
    image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=500',
    rating: 4.8,
    reviews: 20,
    inStock: true,
    stock: 20,
    description: 'High-waisted compression leggings and matching sports bra athletic set.',
    status: 'approved',
    campaignBudget: 60000,
    totalCashbackSpent: 22000,
    creatorCriteria: { minFollowers: 2000, targetCategory: 'Fitness' },
    postingRules: { hashtags: ['#FlexTag', '#FlexFitActive', '#GymStyle'], taggingHandles: ['@flextag.official'] }
  }
]

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
    res.json({ products: products.length > 0 ? products : DEMO_PRODUCTS })
  } catch (err) {
    res.json({ products: DEMO_PRODUCTS })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('brandId', 'name companyName logoUrl avatar email productCategory isVerified')
    if (!product) {
      const demo = DEMO_PRODUCTS.find(p => p._id === req.params.id) || DEMO_PRODUCTS[0]
      return res.json({ product: demo })
    }
    res.json({ product })
  } catch (err) {
    const demo = DEMO_PRODUCTS.find(p => p._id === req.params.id) || DEMO_PRODUCTS[0]
    res.json({ product: demo })
  }
})

router.post('/', requireAuth, requireRole('brand'), async (req, res) => {
  try {
    const { name, price, cashbackRate, category, image, stock, description, campaignBudget, minFollowers, hashtags, taggingHandles } = req.body

    if (!name || !price || !cashbackRate || !category) {
      return res.status(400).json({ message: 'Name, price, cashback rate and category are required.' })
    }

    const product = await Product.create({
      name,
      brand: req.user.companyName || req.user.name,
      brandId: req.user._id,
      price: Number(price),
      cashbackRate: Number(cashbackRate),
      category,
      image: image || '',
      stock: Number(stock || 10),
      description: description || '',
      campaignBudget: Number(campaignBudget || 50000),
      creatorCriteria: { minFollowers: Number(minFollowers || 1000) },
      postingRules: {
        hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : hashtags.split(',').map(h => h.trim())) : ['#FlexTag', '#BrandPartner'],
        taggingHandles: taggingHandles ? (Array.isArray(taggingHandles) ? taggingHandles : taggingHandles.split(',').map(t => t.trim())) : ['@flextag.official']
      },
      status: 'approved'
    })

    res.status(201).json({ message: 'Product published to catalog successfully!', product })
  } catch (err) {
    console.error('[products POST]', err)
    res.status(500).json({ message: 'Server error creating product.' })
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
