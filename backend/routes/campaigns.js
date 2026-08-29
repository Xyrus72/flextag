const express = require('express')
const router  = express.Router()
const Campaign = require('../models/Campaign')
const { requireAuth, requireRole } = require('../middleware/auth')

// ── GET /api/campaigns  — public catalog (active, non-private) ─────────────
router.get('/', async (req, res) => {
  try {
    const { category, brandId, status, q } = req.query
    const filter = {}
    if (category && category !== 'All') filter.category = category
    if (brandId)  filter.brandId = brandId
    if (status)   filter.status  = status
    else          filter.status   = 'active'

    // Public catalog hides private campaigns
    if (!brandId) filter.isPrivate = false

    if (q) filter.title = { $regex: q, $options: 'i' }

    const campaigns = await Campaign.find(filter)
      .populate('brandId', 'companyName name isVerified avatar')
      .sort({ createdAt: -1 })

    res.json({ campaigns })
  } catch (err) {
    console.error('[campaigns GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/campaigns/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('brandId', 'companyName name isVerified avatar website')
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' })
    res.json({ campaign })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/campaigns — brand creates campaign ───────────────────────────
router.post('/', requireAuth, requireRole('brand'), async (req, res) => {
  try {
    const {
      title, product, category, price, cashbackRate, instantSplitPct, stock,
      minFollowers, hashtags, handles, deadline, retentionDays,
      budgetCap, isPrivate, contentType,
    } = req.body

    if (!title || !product || !price || !cashbackRate) {
      return res.status(400).json({ message: 'title, product, price and cashbackRate are required.' })
    }

    const campaign = await Campaign.create({
      title,
      brand:   req.user.companyName || req.user.name,
      brandId: req.user._id,
      product,
      category: category || 'Beauty',
      price:    Number(price),
      cashbackRate: Number(cashbackRate),
      instantSplitPct: Math.min(100, Math.max(0, Number(instantSplitPct) || 0)),
      stock:    Number(stock) || 100,
      stockLeft: Number(stock) || 100,
      minFollowers: Number(minFollowers) || 1000,
      hashtags: hashtags || '',
      handles:  handles  || '',
      contentType: ['any', 'reel', 'post', 'carousel'].includes(contentType) ? contentType : 'any',
      deadline: deadline ? new Date(deadline) : undefined,
      retentionDays: Number(retentionDays) || 7,
      budgetCap: Number(budgetCap) || 0,
      isPrivate: !!isPrivate,
    })

    res.status(201).json({ campaign, message: 'Campaign created.' })
  } catch (err) {
    console.error('[campaigns POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/campaigns/:id — brand updates own campaign ────────────────────
router.put('/:id', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' })

    // Non-admin brands can only edit their own
    if (req.user.role === 'brand' && campaign.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' })
    }

    const allowed = ['title', 'status', 'stock', 'stockLeft', 'hashtags', 'handles',
                     'deadline', 'budgetCap', 'isPrivate', 'retentionDays', 'cashbackRate', 'contentType', 'instantSplitPct']
    allowed.forEach(k => {
      if (req.body[k] === undefined) return
      campaign[k] = k === 'instantSplitPct' ? Math.min(100, Math.max(0, Number(req.body[k]) || 0)) : req.body[k]
    })
    await campaign.save()

    res.json({ campaign, message: 'Campaign updated.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── DELETE /api/campaigns/:id ──────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' })
    if (req.user.role === 'brand' && campaign.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    await campaign.deleteOne()
    res.json({ message: 'Campaign deleted.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
