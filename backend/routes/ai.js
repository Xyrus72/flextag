const express  = require('express')
const router   = express.Router()
const { requireAuth } = require('../middleware/auth')
const Campaign = require('../models/Campaign')
const Product  = require('../models/Product')
const Order    = require('../models/Order')
const ai       = require('../services/ai')
const { createLimiter } = require('../utils/rateLimit')

const byUser = (req) => (req.user ? String(req.user._id) : null)
const aiLimiter = createLimiter({ windowMs: 60 * 60_000, max: 40, keyFn: byUser, message: 'AI limit reached — try again in an hour.' })

const splitList = (value) => String(value || '').split(/[,\s]+/).map((x) => x.trim()).filter(Boolean)

/** Merge a campaign's rules (strings) with its product's postingRules (arrays). */
async function rulesFor({ campaignId, orderId }) {
  let campaign = null
  if (orderId) {
    const order = await Order.findById(orderId).select('campaignId product brand').lean()
    if (order?.campaignId) campaign = await Campaign.findById(order.campaignId).lean()
    if (order && !campaign) return { product: order.product, brand: order.brand, hashtags: [], handles: [] }
  }
  if (!campaign && campaignId) campaign = await Campaign.findById(campaignId).lean()
  if (!campaign) return null
  let rules = {}
  if (campaign.productId) rules = (await Product.findById(campaign.productId).select('postingRules').lean())?.postingRules || {}
  return {
    product: campaign.product, brand: campaign.brand, category: campaign.category, contentType: campaign.contentType,
    hashtags: [...new Set([...splitList(campaign.hashtags), ...(rules.hashtags || [])])],
    handles:  [...new Set([...splitList(campaign.handles), ...(rules.taggingHandles || [])])],
  }
}

/* ── GET /api/ai/status ──────────────────────────────────────────────────── */
router.get('/status', requireAuth, (req, res) => {
  res.json({ configured: ai.isConfigured(), model: ai.isConfigured() ? ai.MODEL : null })
})

/* ── POST /api/ai/caption ────────────────────────────────────────────────── */
// body: { orderId? | campaignId?, product?, brand?, category?, language?, tone?, hashtags?, handles?, count?, platform? }
router.post('/caption', requireAuth, aiLimiter, async (req, res) => {
  try {
    const b = req.body || {}
    const rules = await rulesFor({ campaignId: b.campaignId, orderId: b.orderId }).catch(() => null)
    const result = await ai.generateCaptions({
      product: b.product || rules?.product, brand: b.brand || rules?.brand, category: b.category || rules?.category,
      language: b.language, tone: b.tone, platform: b.platform, count: b.count,
      hashtags: Array.isArray(b.hashtags) && b.hashtags.length ? b.hashtags : rules?.hashtags || [],
      handles:  Array.isArray(b.handles)  && b.handles.length  ? b.handles  : rules?.handles  || [],
    })
    res.json(result)
  } catch (err) {
    console.error('[ai caption]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── POST /api/ai/validate ───────────────────────────────────────────────── */
// body: { caption, campaignId?, orderId?, hashtags?, handles?, product?, brand?, contentType?, language? }
router.post('/validate', requireAuth, aiLimiter, async (req, res) => {
  try {
    const b = req.body || {}
    if (!b.caption || !String(b.caption).trim()) return res.status(400).json({ message: 'caption is required.' })
    const rules = await rulesFor({ campaignId: b.campaignId, orderId: b.orderId }).catch(() => null)
    const result = await ai.validateCaption({
      caption: b.caption, product: b.product || rules?.product, brand: b.brand || rules?.brand,
      contentType: b.contentType || rules?.contentType, language: b.language,
      hashtags: Array.isArray(b.hashtags) && b.hashtags.length ? b.hashtags : rules?.hashtags || [],
      handles:  Array.isArray(b.handles)  && b.handles.length  ? b.handles  : rules?.handles  || [],
    })
    res.json(result)
  } catch (err) {
    console.error('[ai validate]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
