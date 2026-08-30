'use strict'
/**
 * Spot new Instagram posts before the creator tells us about them.
 *
 * The gap this closes: a creator posts the reel, then has to remember to come
 * back to FlexTag and paste the link — and however long that takes is how long
 * their cashback (and the brand's proof) sits invisible. This watches for the
 * post and reacts the moment it exists.
 *
 * Three ways a post is spotted, in order of preference:
 *   1. Meta webhook  — Instagram pushes "new media" to /api/instagram/webhook
 *                      the moment a CONNECTED creator posts. Real-time, free.
 *   2. Token polling — for connected creators, their own Graph token lists
 *                      their recent media. Free, allowed, a few minutes behind.
 *   3. Provider polling — for creators who never connected, the scraping
 *                      provider can check — but it costs HikerAPI credits, so
 *                      it is OFF by default and only ever looks at creators
 *                      with a delivered order still waiting on a post.
 *
 * What happens on a spot: match the caption against the campaign rules of
 * their open orders, save a DetectedPost, tell the creator ("one tap to claim
 * your cashback"), and — if the admin turned auto-submit on — file the Post
 * and start verification without the creator touching the app at all.
 */
const crypto = require('crypto')
const User = require('../../models/User')
const Order = require('../../models/Order')
const Campaign = require('../../models/Campaign')
const Product = require('../../models/Product')
const Post = require('../../models/Post')
const DetectedPost = require('../../models/DetectedPost')
const connect = require('./connect')
const { withFallback, getProvider, anyConfigured } = require('./provider')
const { getSettingsMap } = require('../../utils/settings')
const { notifySafe } = require('../notifications')

const DAY = 86_400_000
// Only media newer than this is interesting — an old reel was never going to
// be a campaign post, and a fresh connect must not spray 25 notifications.
const WATCH_WINDOW_MS = 7 * DAY

/* ── Matching (pure — this is what the tests pin down) ─────────────────────── */

const extractTags = (t) => [...new Set((String(t || '').match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).map((x) => x.slice(1).toLowerCase()))]
const extractMentions = (t) => [...new Set((String(t || '').match(/@[a-z0-9._]{1,30}/gi) || []).map((x) => x.slice(1).toLowerCase().replace(/\.+$/, '')))]
const norm = (s) => String(s || '').replace(/^[#@]/, '').trim().toLowerCase()

/**
 * Score one media item against one candidate order's campaign rules.
 * Hashtags and mentions are the signal — they are what campaign rules require,
 * so a post that carries them is a post that meant to be a campaign post.
 *
 * @param {{ caption?:string, hashtags?:string[], mentions?:string[], mediaType?:string, takenAt?:Date|string|null }} media
 * @param {{ order:{ createdAt?:Date|string }, rules:{ hashtags?:string[], handles?:string[], contentType?:string } }} candidate
 * @returns {{ score:number, reasons:string[] }}
 */
function scoreMatch(media, candidate) {
  const reasons = []
  let score = 0

  const mediaTags = (media.hashtags && media.hashtags.length ? media.hashtags : extractTags(media.caption)).map(norm)
  const mediaMentions = (media.mentions && media.mentions.length ? media.mentions : extractMentions(media.caption)).map(norm)
  const wantTags = (candidate.rules?.hashtags || []).map(norm).filter(Boolean)
  const wantHandles = (candidate.rules?.handles || []).map(norm).filter(Boolean)

  // A post that predates the order cannot be about it — hard zero, not a penalty.
  if (media.takenAt && candidate.order?.createdAt && new Date(media.takenAt) < new Date(candidate.order.createdAt)) {
    return { score: 0, reasons: ['posted before the order was placed'] }
  }

  for (const tag of wantTags) {
    if (mediaTags.includes(tag)) { score += 2; reasons.push(`#${tag}`) }
  }
  for (const handle of wantHandles) {
    if (mediaMentions.includes(handle)) { score += 3; reasons.push(`@${handle}`) }
  }

  const wantType = norm(candidate.rules?.contentType)
  if (wantType && wantType !== 'any') {
    const isReel = ['reel', 'video'].includes(norm(media.mediaType))
    if ((wantType === 'reel' && isReel) || wantType === norm(media.mediaType)) {
      score += 1
      reasons.push(`${media.mediaType} matches the required type`)
    }
  }
  return { score, reasons }
}

/**
 * Pick the best order for a media item. Requires at least one REAL rule hit
 * (score >= 2) — "it was posted recently" alone must never claim an order.
 */
function matchMediaToOrders(media, candidates = []) {
  let best = null
  for (const candidate of candidates) {
    const { score, reasons } = scoreMatch(media, candidate)
    if (score >= 2 && (!best || score > best.score)) best = { ...candidate, score, reasons }
  }
  return best
}

/* ── Candidate orders: delivered, unpaid, no live post yet ─────────────────── */

async function openCandidates(creatorId) {
  const orders = await Order.find({
    creatorId,
    status: 'delivered',
    cashbackReleased: false,
  }).sort({ createdAt: -1 }).limit(10).lean()
  if (!orders.length) return []

  // An order with a live (pending/approved) post is already spoken for.
  const withPosts = await Post.find({
    orderId: { $in: orders.map(o => o._id) }, status: { $ne: 'rejected' },
  }).distinct('orderId')
  const taken = new Set(withPosts.map(String))
  const open = orders.filter(o => !taken.has(String(o._id)))
  if (!open.length) return []

  const campaigns = await Campaign.find({ _id: { $in: open.map(o => o.campaignId).filter(Boolean) } }).lean()
  const byId = Object.fromEntries(campaigns.map(c => [String(c._id), c]))
  const productIds = campaigns.map(c => c.productId).filter(Boolean)
  const products = productIds.length ? await Product.find({ _id: { $in: productIds } }).select('postingRules').lean() : []
  const productById = Object.fromEntries(products.map(p => [String(p._id), p]))

  return open.map(order => {
    const campaign = byId[String(order.campaignId)] || null
    const productRules = campaign?.productId ? productById[String(campaign.productId)]?.postingRules : null
    return {
      order,
      campaign,
      rules: {
        // Campaign stores rules as comma/space strings; module-2 products as arrays.
        hashtags: [
          ...String(campaign?.hashtags || '').split(/[\s,]+/).filter(Boolean),
          ...(productRules?.hashtags || []),
        ],
        handles: [
          ...String(campaign?.handles || '').split(/[\s,]+/).filter(Boolean),
          ...(productRules?.taggingHandles || []),
        ],
        contentType: campaign?.contentType || productRules?.contentType || 'any',
      },
    }
  }).filter(c => c.campaign)
}

/* ── Settings ──────────────────────────────────────────────────────────────── */

async function watchSettings() {
  const m = await getSettingsMap().catch(() => ({}))
  const n = (k, fb) => (Number.isFinite(Number(m[k])) ? Number(m[k]) : fb)
  return {
    enabled: n('igAutoDetectPosts', 1) !== 0,
    watchUnconnected: n('igWatchUnconnected', 0) !== 0,   // costs provider credits — opt-in
    autoSubmit: n('igAutoSubmitDetected', 0) !== 0,       // file + verify without the creator — opt-in
  }
}

/* ── The submit path (one-tap and auto share it) ───────────────────────────── */

/**
 * Turn a DetectedPost into a real Post, with the same guards the manual route
 * enforces, and kick verification. Verification runs fire-and-forget: spotting
 * and filing must not wait on Instagram answering.
 *
 * @returns {{ post:any, detected:any }} — throws { status, message } on refusal
 */
async function submitDetected(detected, { auto = false } = {}) {
  const refuse = (status, message) => { throw Object.assign(new Error(message), { status }) }
  if (!detected.matchedOrderId || !detected.matchedCampaignId) {
    refuse(400, 'This post is not matched to an order — submit it from the Post Submission page instead.')
  }

  const order = await Order.findOne({ _id: detected.matchedOrderId, creatorId: detected.creatorId })
  if (!order) refuse(404, 'The matched order no longer exists.')
  if (order.status !== 'delivered') refuse(400, `That order is ${order.status} — cashback can only be claimed once it is delivered.`)
  if (order.cashbackReleased) refuse(409, 'Cashback for that order has already been released.')

  const livePost = await Post.findOne({ orderId: order._id, status: { $ne: 'rejected' } })
  if (livePost) refuse(409, 'A post has already been submitted for that order.')

  // The same media must not back two submissions, by anyone.
  if (detected.shortcode) {
    const escaped = detected.shortcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const dup = await Post.findOne({
      status: { $in: ['pending', 'approved'] },
      postUrl: new RegExp(`/(?:p|reel|reels|tv)/${escaped}(?:[/?#]|$)`, 'i'),
    }).select('_id')
    if (dup) refuse(409, 'This Instagram post has already been submitted.')
  }

  const campaign = await Campaign.findById(detected.matchedCampaignId)
  if (!campaign) refuse(404, 'The matched campaign no longer exists.')

  const retentionDeadline = new Date(Date.now() + (Number(campaign.retentionDays) || 7) * DAY)
  const post = await Post.create({
    creatorId: detected.creatorId,
    campaignId: campaign._id,
    orderId: order._id,
    postUrl: detected.permalink || `https://www.instagram.com/p/${detected.shortcode}/`,
    platform: 'instagram',
    retentionDeadline,
  })
  campaign.totalCreators = (campaign.totalCreators || 0) + 1
  await campaign.save().catch(() => {})

  const updated = await DetectedPost.findByIdAndUpdate(detected._id, {
    $set: { status: auto ? 'auto_submitted' : 'submitted', postId: post._id },
  }, { new: true })

  // Verify async — auto-approval (and cashback) rides the existing pipeline.
  setImmediate(() => {
    const { verifyPost } = require('./postCheck')
    verifyPost(post._id).catch(err => console.warn('[postWatch] verify failed:', err.code || '', err.message))
  })

  return { post, detected: updated }
}

/* ── Check one creator ─────────────────────────────────────────────────────── */

/**
 * Look at a creator's recent media and record anything new.
 * @returns {Promise<{ checked:number, detected:number, autoSubmitted:number }>}
 */
async function checkCreator(user, { source = 'graph' } = {}) {
  const result = { checked: 0, detected: 0, autoSubmitted: 0 }
  const settings = await watchSettings()
  if (!settings.enabled) return result

  // 1. Their recent media, via whatever access we legitimately have.
  let items = []
  if (user.igConnected && user.igGraphToken) {
    const raw = await connect.fetchOwnMedia(user.igGraphUserId, user.igGraphToken, { limit: 12 })
    const { normMedia } = require('./providers/graph')
    items = raw.map(m => normMedia(m, user.igGraphUsername || user.instagramHandle))
  } else if (settings.watchUnconnected && anyConfigured() && user.instagramHandle) {
    const { seedPosts } = await withFallback(p => p.getProfile(String(user.instagramHandle).replace(/^@/, ''), { postsLimit: 12 }))
    items = seedPosts || []
    source = getProvider().name
  } else {
    return result
  }

  const cutoff = new Date(Date.now() - WATCH_WINDOW_MS)
  const fresh = items.filter(m => m.id && m.takenAt && new Date(m.takenAt) > cutoff)
  result.checked = fresh.length
  if (!fresh.length) {
    await User.updateOne({ _id: user._id }, { $set: { igWatchLastAt: new Date() } }).catch(() => {})
    return result
  }

  // 2. Which of these have we not seen before?
  const seen = new Set((await DetectedPost.find({
    creatorId: user._id, mediaId: { $in: fresh.map(m => String(m.id)) },
  }).distinct('mediaId')).map(String))
  const news = fresh.filter(m => !seen.has(String(m.id)))
  if (!news.length) {
    await User.updateOne({ _id: user._id }, { $set: { igWatchLastAt: new Date() } }).catch(() => {})
    return result
  }

  // Also skip media already submitted by hand — spotting it again is noise.
  const candidates = await openCandidates(user._id)

  for (const media of news) {
    if (media.shortcode) {
      const escaped = media.shortcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const already = await Post.exists({ postUrl: new RegExp(`/(?:p|reel|reels|tv)/${escaped}(?:[/?#]|$)`, 'i') })
      if (already) continue
    }

    const match = matchMediaToOrders(media, candidates)
    let detected
    try {
      detected = await DetectedPost.create({
        creatorId: user._id,
        mediaId: String(media.id),
        shortcode: media.shortcode || '',
        permalink: media.url || '',
        mediaType: media.mediaType || '',
        caption: String(media.caption || '').slice(0, 500),
        thumbnail: media.thumbnail || '',
        takenAt: media.takenAt,
        source,
        matchedOrderId: match?.order?._id || null,
        matchedCampaignId: match?.campaign?._id || null,
        matchScore: match?.score || 0,
        matchReasons: match?.reasons || [],
        notifiedAt: new Date(),
      })
    } catch (err) {
      if (err?.code === 11000) continue   // webhook and poller raced — one row wins
      throw err
    }
    result.detected += 1
    // A spotted match is no longer a candidate for the NEXT media in this batch.
    if (match) {
      const idx = candidates.findIndex(c => String(c.order._id) === String(match.order._id))
      if (idx >= 0) candidates.splice(idx, 1)
    }

    // 3. React: auto-file it, or hand the creator a one-tap claim.
    if (match && settings.autoSubmit) {
      try {
        await submitDetected(detected, { auto: true })
        result.autoSubmitted += 1
        notifySafe(user._id, {
          type: 'post_verified', icon: '🤖', title: 'We spotted your post — and submitted it',
          body: `Your ${media.mediaType || 'post'} about ${match.campaign.product} is being verified. Cashback follows automatically if it passes.`,
          link: '/creator/campaign-tracker',
        })
        continue
      } catch (err) {
        console.warn('[postWatch] auto-submit refused:', err.message)   // fall through to notify-only
      }
    }
    notifySafe(user._id, {
      type: 'post_detected', icon: '📸',
      title: match ? `We spotted your post about ${match.campaign.product}` : 'We spotted a new post on your Instagram',
      body: match
        ? `One tap and it goes in for verification — ৳${(match.order.cashbackAmount || 0).toLocaleString()} cashback is waiting on it.`
        : 'If it is for a FlexTag campaign, submit it to claim your cashback.',
      link: '/creator/submit-post',
    })
  }

  await User.updateOne({ _id: user._id }, { $set: { igWatchLastAt: new Date() } }).catch(() => {})
  return result
}

/* ── The polling sweep (jobs/instagramJobs.js drives this) ─────────────────── */

async function runWatch() {
  const settings = await watchSettings()
  if (!settings.enabled) return null

  // Connected creators: their own token, free, always on.
  const connected = await User.find({ igConnected: true, role: 'creator' })
    .select('+igGraphToken igGraphUserId igGraphUsername instagramHandle')
    .limit(100)
  let out = { creators: 0, detected: 0, autoSubmitted: 0 }
  for (const user of connected) {
    try {
      const r = await checkCreator(user)
      out.creators += 1
      out.detected += r.detected
      out.autoSubmitted += r.autoSubmitted
    } catch (err) {
      console.warn(`[postWatch] check @${user.instagramHandle || user.igGraphUsername} failed: ${err.code || ''} ${err.message}`)
      if (err.code === 'RATE_LIMITED') break
    }
  }

  // Unconnected creators: costs provider credits, so opt-in and only those
  // with money actually waiting on a post.
  if (settings.watchUnconnected && anyConfigured()) {
    const waiting = await Order.aggregate([
      { $match: { status: 'delivered', cashbackReleased: false } },
      { $group: { _id: '$creatorId' } },
      { $limit: 10 },
    ])
    const ids = waiting.map(w => w._id)
    const users = await User.find({
      _id: { $in: ids }, igConnected: { $ne: true }, instagramHandle: { $ne: '' },
      // Don't re-poll someone we checked within the hour — credits are real money.
      $or: [{ igWatchLastAt: null }, { igWatchLastAt: { $lte: new Date(Date.now() - 3_600_000) } }],
    }).limit(5)
    for (const user of users) {
      try {
        const r = await checkCreator(user, { source: getProvider().name })
        out.creators += 1
        out.detected += r.detected
        out.autoSubmitted += r.autoSubmitted
      } catch (err) {
        console.warn(`[postWatch] provider check @${user.instagramHandle} failed: ${err.code || ''} ${err.message}`)
        if (['RATE_LIMITED', 'NO_SESSION', 'SESSION_INVALID'].includes(err.code)) break
      }
    }
  }
  return out.creators ? out : null
}

/* ── Webhook plumbing ──────────────────────────────────────────────────────── */

/** Constant-time check of Meta's X-Hub-Signature-256 over the raw body. */
function verifyWebhookSignature(rawBody, signatureHeader, appSecret) {
  if (!rawBody || !signatureHeader || !appSecret) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(String(signatureHeader))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** A webhook told us this IG account changed — check just that creator, now. */
async function onWebhookMediaChange(igUserId) {
  const user = await User.findOne({ igGraphUserId: String(igUserId), igConnected: true })
    .select('+igGraphToken igGraphUserId igGraphUsername instagramHandle')
  if (!user) return null
  return checkCreator(user, { source: 'webhook' })
}

module.exports = {
  scoreMatch, matchMediaToOrders, extractTags, extractMentions,
  openCandidates, checkCreator, runWatch, submitDetected,
  verifyWebhookSignature, onWebhookMediaChange, watchSettings,
}
