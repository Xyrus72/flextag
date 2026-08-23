const express  = require('express')
const router   = express.Router()
const Order    = require('../models/Order')
const Campaign = require('../models/Campaign')
const Product  = require('../models/Product')
const Transaction = require('../models/Transaction')
const { requireAuth, requireRole } = require('../middleware/auth')
const { notifySafe } = require('../services/notifications')

// helper to generate order IDs
const genOrderId = () => 'ORD-' + Math.floor(1000 + Math.random() * 9000)

/**
 * Module-2 catalog products have no Campaign of their own, yet orders, posts and
 * cashback all hang off a Campaign. Create (or reuse) a Campaign that mirrors the
 * product — incl. its postingRules and budget — so the product → order → post →
 * cashback chain works for catalog products too.
 */
async function ensureCampaignForProduct(product) {
  const existing = await Campaign.findOne({ productId: product._id })
  if (existing) return existing
  if (product.status && product.status !== 'approved') return null
  if (!product.brandId) return null
  const rules = product.postingRules || {}
  return Campaign.create({
    title:        product.name,
    brand:        product.brand,
    brandId:      product.brandId,
    product:      product.name,
    productId:    product._id,
    category:     product.category || 'Beauty',
    price:        product.price,
    cashbackRate: product.cashbackRate,
    stock:        product.stock ?? 100,
    stockLeft:    product.stock ?? 100,
    minFollowers: product.creatorCriteria?.minFollowers ?? 1000,
    hashtags:     (rules.hashtags || []).join(', '),
    handles:      (rules.taggingHandles || []).join(', '),
    budgetCap:    product.campaignBudget || 0,
    isPrivate:    false,
  })
}

// ── GET /api/orders ────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query
    const filter = {}

    if (req.user.role === 'creator') filter.creatorId = req.user._id
    else if (req.user.role === 'brand') filter.brandId = req.user._id
    // admin sees all

    if (status && status !== 'all') filter.status = status

    const orders = await Order.find(filter)
      .populate('creatorId', 'name instagramHandle avatar')
      .populate('brandId',   'companyName name')
      .populate('campaignId', 'title hashtags handles retentionDays')
      .sort({ createdAt: -1 })

    res.json({ orders })
  } catch (err) {
    console.error('[orders GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/orders/:id ────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('creatorId', 'name instagramHandle avatar')
      .populate('brandId',   'companyName name')
      .populate('campaignId', 'title hashtags handles retentionDays')
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    res.json({ order })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/orders — creator places order ────────────────────────────────
router.post('/', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { campaignId, qty, address, paymentMethod } = req.body
    if (!campaignId || !address) {
      return res.status(400).json({ message: 'campaignId and address required.' })
    }

    // The cart may hold a Campaign id or (module-2 catalog) a Product id — bridge the latter.
    let campaign = await Campaign.findById(campaignId)
    if (!campaign) {
      const product = await Product.findById(campaignId)
      if (product) campaign = await ensureCampaignForProduct(product)
    }
    if (!campaign || campaign.status !== 'active') {
      return res.status(400).json({ message: 'Campaign not found or not active.' })
    }
    if (campaign.stockLeft < (qty || 1)) {
      return res.status(400).json({ message: 'Insufficient stock.' })
    }

    const quantity = Number(qty) || 1
    const cashbackAmount = Math.round(campaign.price * quantity * campaign.cashbackRate / 100)
    const total = campaign.price * quantity

    // Budget cap: refuse new orders once the promised cashback would exceed the brand's budget.
    if (campaign.budgetCap > 0 && (campaign.budgetUsed || 0) + cashbackAmount > campaign.budgetCap) {
      return res.status(400).json({ message: 'This campaign has reached its cashback budget.' })
    }

    const order = await Order.create({
      orderId:    genOrderId(),
      creatorId:  req.user._id,
      brandId:    campaign.brandId,
      campaignId: campaign._id,
      productId:  campaign.productId || undefined,   // set for module-2 catalog products (spend tracking)
      product:    campaign.product,
      brand:      campaign.brand,
      image:      campaign.image || '📦',
      qty:        quantity,
      price:      campaign.price,
      cashbackRate:   campaign.cashbackRate,
      cashbackAmount,
      total,
      address,
      paymentMethod: paymentMethod || 'bkash',
    })

    // Decrement stock
    campaign.stockLeft = Math.max(0, campaign.stockLeft - quantity)
    campaign.totalOrders += 1
    await campaign.save()

    res.status(201).json({ order, message: 'Order placed.' })
  } catch (err) {
    console.error('[orders POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/orders/:id/status — brand updates status/tracking ─────────────
router.put('/:id/status', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const { status, tracking, returnReason } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    const prevStatus = order.status

    if (req.user.role === 'brand' && order.brandId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' })
    }

    const validStatuses = ['processing', 'packed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' })
    }

    if (status) order.status = status
    if (tracking !== undefined) order.tracking = tracking
    if (returnReason !== undefined) order.returnReason = returnReason
    if (status === 'return_requested' && !order.returnRequestedAt) order.returnRequestedAt = new Date()
    const wasDelivered = prevStatus !== 'delivered' && order.status === 'delivered'
    await order.save()

    if (wasDelivered) {
      notifySafe(order.creatorId, { type: 'order', icon: '📦', title: 'Order delivered',
        body: `Your ${order.product} arrived — post about it to earn ৳${(order.cashbackAmount || 0).toLocaleString()} cashback.`, link: '/creator/submit-post' })
    }

    res.json({ order, message: 'Order updated.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
