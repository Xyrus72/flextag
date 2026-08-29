const express  = require('express')
const router   = express.Router()
const Order    = require('../models/Order')
const Campaign = require('../models/Campaign')
const Product  = require('../models/Product')
const Transaction = require('../models/Transaction')
const User     = require('../models/User')
const { requireAuth, requireRole } = require('../middleware/auth')
const { notifySafe } = require('../services/notifications')
const { computeReward, rewardCapFor } = require('../utils/reward')
const { commitInstant, reclaimInstant, inFlightReward } = require('../utils/rewardLedger')
const { getIgSettings } = require('../utils/settings')
const { computeTier } = require('../utils/tier')
const fraud = require('../services/fraud')
const ratings = require('../services/ratings')

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
  if (existing) {
    // Keep the money field the Cart displays in sync with what we charge.
    const split = Math.min(100, Math.max(0, Number(product.instantSplitPct) || 0))
    if (existing.instantSplitPct !== split) { existing.instantSplitPct = split; await existing.save() }
    return existing
  }
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
    instantSplitPct: product.instantSplitPct ?? 0,
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

    // Fraud gate: an account an admin has held — or one the risk engine scores
    // above the block threshold — cannot commit more brand budget.
    const gate = await fraud.guard(req.user, { action: 'order' })
    if (!gate.allowed) return res.status(403).json({ message: gate.reason })

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
    // Reward split: instantDiscount comes off the bill now, bonus releases on verified post.
    const r = computeReward({ price: campaign.price, qty: quantity, cashbackRate: campaign.cashbackRate, instantSplitPct: campaign.instantSplitPct })

    // Fraud guard: unverified creators can only hold so much reward IN FLIGHT
    // (sum over live unreleased orders — can't be dodged with many small orders).
    const settings = await getIgSettings().catch(() => null)
    const cap = rewardCapFor(req.user, settings?.unverifiedRewardCap ?? 500)
    if (Number.isFinite(cap)) {
      const inFlight = await inFlightReward(req.user._id)
      if (inFlight + r.rewardTotal > cap) {
        return res.status(400).json({ message: `Unverified accounts can hold at most ৳${cap.toLocaleString()} of pending rewards (you have ৳${inFlight.toLocaleString()} in flight). Verify your Instagram in Account Audit (bio code) to unlock more.` })
      }
    }

    // Budget cap: refuse new orders once the full promised reward would exceed the brand's budget.
    if (campaign.budgetCap > 0 && (campaign.budgetUsed || 0) + r.rewardTotal > campaign.budgetCap) {
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
      cashbackAmount: r.bonus,
      instantDiscount: r.instantDiscount,
      rewardTotal:     r.rewardTotal,
      total:           r.payable,
      address,
      paymentMethod: paymentMethod || 'bkash',
    })
    await commitInstant(order)   // instant part is brand budget spent as of now

    // Decrement stock
    campaign.stockLeft = Math.max(0, campaign.stockLeft - quantity)
    campaign.totalOrders += 1
    await campaign.save()

    fraud.assessInBackground(req.user._id)   // velocity signals move with each order

    res.status(201).json({ order, message: 'Order placed.' })
  } catch (err) {
    console.error('[orders POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

/**
 * A returned order whose cashback was ALREADY paid out gets clawed back:
 * negative wallet transaction, earnings reversed, brand budget refunded.
 * Atomic claim on cashbackClawedBack so a double status-update can't reverse twice.
 */
async function clawbackCashback(order) {
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, cashbackReleased: true, cashbackClawedBack: false },
    { $set: { cashbackClawedBack: true } },
    { new: false },
  )
  if (!claimed) return false
  const amount = claimed.cashbackAmount || 0
  if (amount > 0) {
    await Transaction.create({
      userId: claimed.creatorId, type: 'clawback', amount,
      desc: `Cashback reversed — ${claimed.product} was returned`, status: 'completed', orderId: claimed._id,
    })
    await User.updateOne({ _id: claimed.creatorId }, { $inc: { totalEarnings: -amount } }).catch(() => {})
    // The campaign no longer counts as completed — keep tier (and the fraud-cap
    // multiplier it drives) honest.
    const u = await User.findOneAndUpdate(
      { _id: claimed.creatorId, completedCampaigns: { $gt: 0 } },
      { $inc: { completedCampaigns: -1 } },
      { new: true },
    ).select('completedCampaigns tier').catch(() => null)
    if (u) {
      const tier = computeTier(u.completedCampaigns)
      if (tier !== u.tier) await User.updateOne({ _id: u._id }, { $set: { tier } }).catch(() => {})
    }
    if (claimed.campaignId) await Campaign.updateOne({ _id: claimed.campaignId }, { $inc: { budgetUsed: -amount } }).catch(() => {})
    if (claimed.productId) await Product.updateOne({ _id: claimed.productId }, { $inc: { totalCashbackSpent: -amount } }).catch(() => {})
    notifySafe(claimed.creatorId, { type: 'cashback', icon: '↩️', title: 'Cashback reversed',
      body: `৳${amount.toLocaleString()} was deducted because your ${claimed.product} order was returned.`, link: '/creator/wallet' })
  }
  return true
}

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

    // Order died (cancelled/returned) → hand the instant discount back to the
    // brand's budget; revived → commit it again. Both are atomic + idempotent.
    const DEAD = ['cancelled', 'returned']
    if (DEAD.includes(order.status) && !DEAD.includes(prevStatus)) await reclaimInstant(order)
    else if (!DEAD.includes(order.status) && DEAD.includes(prevStatus)) await commitInstant(order)
    // Returned AFTER the bonus was paid out → claw the payout back from the wallet.
    if (order.status === 'returned' && order.cashbackReleased && !order.cashbackClawedBack) {
      await clawbackCashback(order)
      order.cashbackClawedBack = true
    }

    if (wasDelivered) {
      notifySafe(order.creatorId, { type: 'order', icon: '📦', title: 'Order delivered',
        body: `Your ${order.product} arrived — post about it to earn ৳${(order.cashbackAmount || 0).toLocaleString()} cashback.`, link: '/creator/submit-post' })
    }

    res.json({ order, message: 'Order updated.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── Two-way ratings ─────────────────────────────────────────────────────────
 * Both sides rate the SAME order, and only after the thing they are rating has
 * actually happened — no review farm, no rating a brand you never bought from.
 */

// POST /api/orders/:id/rate — creator rates the brand + product after delivery
router.post('/:id/rate', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { quality, shipping, support, comment } = req.body
    const order = await Order.findOne({ _id: req.params.id, creatorId: req.user._id })
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    if (!['delivered', 'return_requested', 'returned'].includes(order.status)) {
      return res.status(400).json({ message: 'You can rate an order once it has been delivered.' })
    }
    if (!quality || !shipping || !support) {
      return res.status(400).json({ message: 'Rate product quality, shipping and support (1-5).' })
    }

    order.creatorRating = {
      quality:  ratings.clampStar(quality),
      shipping: ratings.clampStar(shipping),
      support:  ratings.clampStar(support),
      comment:  String(comment || '').slice(0, 600),
      at: new Date(),
    }
    await order.save()

    const [brand, product] = await Promise.all([
      ratings.refreshBrandRating(order.brandId),
      ratings.refreshProductRating(order.productId),
    ])
    if (order.brandId) {
      notifySafe(order.brandId, {
        type: 'rating', icon: '⭐', title: 'New creator review',
        body: `${req.user.name} rated ${order.product} ${ratings.orderScore(order.creatorRating)}/5.`,
        link: '/brand/ratings',
      })
    }
    res.json({ order, brand, product, message: 'Thanks — your review is live.' })
  } catch (err) {
    console.error('[order rate]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/orders/:id/rate-creator — brand rates the creator after the post is approved
router.post('/:id/rate-creator', requireAuth, requireRole('brand', 'admin'), async (req, res) => {
  try {
    const { professionalism, contentQuality, comment } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found.' })
    if (req.user.role === 'brand' && String(order.brandId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    if (!order.cashbackReleased && order.status !== 'delivered') {
      return res.status(400).json({ message: 'Rate a creator once their order is delivered or their post has been approved.' })
    }
    if (!professionalism || !contentQuality) {
      return res.status(400).json({ message: 'Rate professionalism and content quality (1-5).' })
    }

    order.brandRating = {
      professionalism: ratings.clampStar(professionalism),
      contentQuality:  ratings.clampStar(contentQuality),
      comment: String(comment || '').slice(0, 600),
      at: new Date(),
    }
    await order.save()
    const creator = await ratings.refreshCreatorRating(order.creatorId)
    notifySafe(order.creatorId, {
      type: 'rating', icon: '⭐', title: 'A brand rated your collab',
      body: `${order.brand} left you a review on ${order.product}.`,
      link: '/creator/portfolio',
    })
    res.json({ order, creator, message: 'Review saved.' })
  } catch (err) {
    console.error('[order rate-creator]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
module.exports.ensureCampaignForProduct = ensureCampaignForProduct
