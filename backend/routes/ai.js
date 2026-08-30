const express  = require('express')
const router   = express.Router()
const { requireAuth } = require('../middleware/auth')
const Campaign = require('../models/Campaign')
const Product  = require('../models/Product')
const Order    = require('../models/Order')
const IgAudit  = require('../models/IgAudit')
const ai       = require('../services/ai')
const { previewDraft } = require('../services/instagram/postCheck')
const { createLimiter } = require('../utils/rateLimit')

const byUser = (req) => (req.user ? String(req.user._id) : null)
// Model calls are expensive; the deterministic check is not — it gets its own,
// much looser budget so check-as-you-type never eats the AI allowance.
const aiLimiter = createLimiter({ windowMs: 60 * 60_000, max: 40, keyFn: byUser, message: 'AI limit reached — try again in an hour.' })
const checkLimiter = createLimiter({ windowMs: 60_000, max: 30, keyFn: byUser, message: 'One moment — caption checks are limited per minute.' })

const splitList = (value) => String(value || '').split(/[,\s]+/).map((x) => x.trim()).filter(Boolean)
const asList = (value) => (Array.isArray(value) ? value.map((x) => String(x).trim()).filter(Boolean) : splitList(value))

// The UI's planned-format words → the mediaType the verifier compares against.
const PLANNED_MEDIA = { reel: 'reel', post: 'image', carousel: 'carousel', video: 'video', image: 'image' }

/**
 * Resolve the campaign + order this request is about. An orderId only counts
 * when the order belongs to the caller (rules of other people's orders are not
 * yours to read); explicit hashtags/handles build an ad-hoc rule set — that's
 * how the validator's demo campaigns work.
 */
async function contextFor(req, b) {
  let order = null
  let campaign = null
  if (b.orderId) {
    order = await Order.findById(b.orderId).lean().catch(() => null)
    if (order && String(order.creatorId) !== String(req.user._id)) order = null
    if (order?.campaignId) campaign = await Campaign.findById(order.campaignId).lean().catch(() => null)
  }
  if (!campaign && b.campaignId) campaign = await Campaign.findById(b.campaignId).lean().catch(() => null)
  if (!campaign) {
    const hashtags = asList(b.hashtags)
    const handles = asList(b.handles)
    if (hashtags.length || handles.length) {
      campaign = { hashtags: hashtags.join(','), handles: handles.join(','), contentType: 'any', product: b.product, brand: b.brand }
    }
  }
  return { campaign, order }
}

/** Merge a campaign's rules (strings) with its product's postingRules (arrays) — the generator wants flat arrays. */
async function rulesFor(campaign) {
  if (!campaign) return null
  let rules = {}
  if (campaign.productId) rules = (await Product.findById(campaign.productId).select('postingRules').lean())?.postingRules || {}
  return {
    product: campaign.product, brand: campaign.brand, category: campaign.category, contentType: campaign.contentType,
    hashtags: [...new Set([...splitList(campaign.hashtags), ...(rules.hashtags || [])])],
    handles:  [...new Set([...splitList(campaign.handles), ...(rules.taggingHandles || [])])],
  }
}

/** The creator's recent real captions — their voice — from the latest Instagram audit. */
async function styleSampleFor(user) {
  const handle = String(user?.instagramHandle || '').replace(/^@/, '').trim().toLowerCase()
  if (!handle) return []
  const audit = await IgAudit.findOne({ username: handle }).select('posts.caption').lean().catch(() => null)
  return (audit?.posts || []).map((p) => p.caption).filter((c) => c && c.trim().length >= 20).slice(0, 5)
}

/* ── GET /api/ai/status ──────────────────────────────────────────────────── */
router.get('/status', requireAuth, (req, res) => {
  res.json({ configured: ai.isConfigured(), model: ai.isConfigured() ? ai.MODEL : null })
})

/* ── POST /api/ai/check ──────────────────────────────────────────────────── */
// Deterministic verification preview of a draft caption — no model involved,
// cheap enough to run on every keystroke (debounced). Runs the REAL post-
// verification rules, so a green check here is the same check going green at
// submission time.
// body: { caption?, orderId? | campaignId? | hashtags/handles, mediaType? ('reel'|'post'|'carousel') }
router.post('/check', requireAuth, checkLimiter, async (req, res) => {
  try {
    const b = req.body || {}
    const { campaign, order } = await contextFor(req, b)
    if (!campaign) return res.status(400).json({ message: 'Pick a campaign (orderId/campaignId) or provide hashtags/handles to check against.' })
    const preview = await previewDraft({
      caption: b.caption, campaign, order, creator: req.user,
      mediaType: PLANNED_MEDIA[b.mediaType] || null,
    })
    res.json({ ok: true, ...preview, product: campaign.product || null, brand: campaign.brand || null, contentType: campaign.contentType || 'any' })
  } catch (err) {
    console.error('[ai check]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── POST /api/ai/caption ────────────────────────────────────────────────── */
// body: { orderId? | campaignId?, product?, brand?, category?, language?, tone?, hashtags?, handles?, count?, platform? }
router.post('/caption', requireAuth, aiLimiter, async (req, res) => {
  try {
    const b = req.body || {}
    const { campaign } = await contextFor(req, b)
    const [rules, styleSample] = await Promise.all([
      rulesFor(campaign).catch(() => null),
      styleSampleFor(req.user).catch(() => []),
    ])
    const result = await ai.generateCaptions({
      product: b.product || rules?.product, brand: b.brand || rules?.brand, category: b.category || rules?.category,
      language: b.language, tone: b.tone, platform: b.platform, count: b.count, contentType: rules?.contentType,
      hashtags: Array.isArray(b.hashtags) && b.hashtags.length ? b.hashtags : rules?.hashtags || [],
      handles:  Array.isArray(b.handles)  && b.handles.length  ? b.handles  : rules?.handles  || [],
      styleSample,
    })
    res.json(result)
  } catch (err) {
    console.error('[ai caption]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── POST /api/ai/validate ───────────────────────────────────────────────── */
// body: { caption, campaignId?, orderId?, hashtags?, handles?, product?, brand?, contentType?, language?, mediaType? }
router.post('/validate', requireAuth, aiLimiter, async (req, res) => {
  try {
    const b = req.body || {}
    if (!b.caption || !String(b.caption).trim()) return res.status(400).json({ message: 'caption is required.' })
    const { campaign, order } = await contextFor(req, b)
    const result = await ai.validateCaption({
      caption: b.caption, campaign, order, creator: req.user,
      mediaType: PLANNED_MEDIA[b.mediaType] || null,
      product: b.product || campaign?.product, brand: b.brand || campaign?.brand,
      contentType: b.contentType || campaign?.contentType, language: b.language,
      hashtags: asList(b.hashtags), handles: asList(b.handles),
    })
    res.json(result)
  } catch (err) {
    console.error('[ai validate]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
