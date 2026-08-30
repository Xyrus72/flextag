const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { requireAuth, requireRole } = require('../middleware/auth')
const client  = require('../services/instagram/client')
const { cleanUsername } = require('../services/instagram/endpoints')
const { precheck, runAudit, fetchProfile } = require('../services/instagram/audit')
const { getProvider, providers } = require('../services/instagram/provider')
const { verifyPost } = require('../services/instagram/postCheck')
const connect = require('../services/instagram/connect')
const postWatch = require('../services/instagram/postWatch')
const DetectedPost = require('../models/DetectedPost')
const IgAudit = require('../models/IgAudit')
const Post    = require('../models/Post')
const User    = require('../models/User')
const { getIgSettings } = require('../utils/settings')
const { createLimiter } = require('../utils/rateLimit')

const HOUR = 60 * 60_000
const DAY = 24 * HOUR
const GENERIC_UNAVAILABLE = 'Instagram verification is temporarily unavailable — please try again later.'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function sendIgError(req, res, err, tag) {
  if (err instanceof client.IgError) {
    let { status, message } = client.httpFor(err)
    // Operational detail (env names, session state) is for admins only.
    if ((err.code === 'NO_SESSION' || err.code === 'SESSION_INVALID') && req.user?.role !== 'admin') message = GENERIC_UNAVAILABLE
    return res.status(status).json({ message, code: err.code })
  }
  if (err && err.status) return res.status(err.status).json({ message: err.message })
  console.error(`[instagram ${tag}]`, err)
  return res.status(500).json({ message: 'Server error.' })
}

const ownHandle = (user) => String(user?.instagramHandle || '').replace(/^@/, '').trim().toLowerCase()
const byUser = (req) => (req.user ? String(req.user._id) : null)

// Every Instagram-touching route is capped so no single caller can exhaust the shared session.
const precheckLimiter = createLimiter({ windowMs: 60_000, max: 10, message: 'Too many checks — wait a minute and try again.' })
const auditLimiter    = createLimiter({ windowMs: HOUR, max: 20, keyFn: byUser, message: 'Audit limit reached — try again in an hour.' })
const verifyLimiter   = createLimiter({ windowMs: HOUR, max: 30, keyFn: byUser, message: 'Too many verification attempts — try again in an hour.' })
const identityLimiter = createLimiter({ windowMs: 10 * 60_000, max: 6, keyFn: byUser, message: 'Too many attempts — wait a few minutes and try again.' })

/* ── GET /api/instagram/status (admin) ───────────────────────────────────── */
router.get('/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const force = req.query.force === '1'
    const prov = getProvider()
    const other = prov === providers.hiker ? providers.session : providers.hiker
    const [primary, secondary, settings] = await Promise.all([
      prov.status({ force }),
      other.configured() ? other.status({ force }).catch((e) => ({ provider: other.name, configured: true, valid: null, lastError: e.message })) : Promise.resolve({ provider: other.name, configured: false, valid: null }),
      getIgSettings({ fresh: true }),
    ])
    // Top-level fields describe the ACTIVE provider (what the admin strip shows); both are listed under `providers`.
    res.json({ ...primary, providers: { [primary.provider]: primary, [secondary.provider]: secondary }, settings })
  } catch (err) { sendIgError(req, res, err, 'status') }
})

/* ── POST /api/instagram/precheck (public, rate-limited) ─────────────────── */
router.post('/precheck', precheckLimiter, async (req, res) => {
  let username
  try { username = cleanUsername(req.body?.username) } catch { return res.status(400).json({ message: 'Enter a valid Instagram username.' }) }
  const settings = await getIgSettings().catch(() => null)
  const enforce = settings ? settings.precheckEnforce : true
  try {
    const result = await precheck(username, { settings: settings || undefined })
    res.json({ ok: true, enforce, ...result })
  } catch (err) {
    if (err instanceof client.IgError && err.code === 'NOT_FOUND') return res.json({ ok: true, enforce, username, exists: false, eligible: false, reasons: ['Instagram account not found'] })
    if (err instanceof client.IgError && err.code === 'BAD_INPUT') return res.status(400).json({ message: err.message })
    console.warn('[instagram precheck]', err.code || '', err.message)
    res.json({ ok: false, reason: 'unavailable', message: 'Instagram check is unavailable right now — you can continue and we will verify your account after signup.' })
  }
})

/* ── POST /api/instagram/audit ───────────────────────────────────────────── */
router.post('/audit', requireAuth, auditLimiter, async (req, res) => {
  try {
    const { force = false, depth = 'full' } = req.body || {}
    let username
    if (req.user.role === 'creator') {
      username = ownHandle(req.user)
      if (!username) return res.status(400).json({ message: 'Add your Instagram handle to your profile first.' })
    } else {
      try { username = cleanUsername(req.body?.username) } catch { return res.status(400).json({ message: 'Enter a valid Instagram username.' }) }
    }
    // Only admins can force a refetch at will; creators and brands get an hourly cap.
    const maxAgeMs = force ? (req.user.role === 'admin' ? 0 : HOUR) : undefined
    const audit = await runAudit(username, { depth: depth === 'basic' ? 'basic' : 'full', force: !!force && maxAgeMs === 0, maxAgeMs, userId: req.user.role === 'creator' ? req.user._id : undefined })
    // `cached` lets the UI explain a no-op refresh instead of pretending it fetched.
    const cached = Date.now() - new Date(audit.fetchedAt).getTime() > 10_000
    res.json({ audit, cached, refreshAfter: cached && req.user.role !== 'admin' ? new Date(new Date(audit.fetchedAt).getTime() + HOUR) : null })
  } catch (err) { sendIgError(req, res, err, 'audit') }
})

/* ── GET /api/instagram/audit/me (creator) ───────────────────────────────── */
router.get('/audit/me', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const username = ownHandle(req.user)
    if (!username) return res.status(404).json({ message: 'No Instagram handle on your profile yet.' })
    const audit = await IgAudit.findOne({ username })
    if (!audit) return res.status(404).json({ message: 'No audit yet.' })
    res.json({ audit })
  } catch (err) { sendIgError(req, res, err, 'audit/me') }
})

/* ── GET /api/instagram/audits (admin) ───────────────────────────────────── */
router.get('/audits', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    const audits = await IgAudit.find({}, 'username user profile.followers profile.isPrivate profile.isVerified profile.profilePicUrl health.score health.grade audience.fakeFollowerPct audience.quality eligibility fetchedAt depth')
      .populate('user', 'name email igVerified')
      .sort({ fetchedAt: -1 }).limit(limit).lean()
    res.json({ audits })
  } catch (err) { sendIgError(req, res, err, 'audits') }
})

/* ── GET /api/instagram/audit/:username (cached only) ────────────────────── */
router.get('/audit/:username', requireAuth, async (req, res) => {
  try {
    let username
    try { username = cleanUsername(req.params.username) } catch { return res.status(400).json({ message: 'Invalid Instagram username.' }) }
    if (req.user.role === 'creator' && username !== ownHandle(req.user)) return res.status(403).json({ message: 'Access denied.' })
    const audit = await IgAudit.findOne({ username })
    if (!audit) return res.status(404).json({ message: 'No audit for this account yet.' })
    res.json({ audit })
  } catch (err) { sendIgError(req, res, err, 'audit/:username') }
})

/* ── POST /api/instagram/verify-post ─────────────────────────────────────── */
router.post('/verify-post', requireAuth, requireRole('creator', 'admin', 'brand'), verifyLimiter, async (req, res) => {
  try {
    const { postId } = req.body || {}
    if (!postId) return res.status(400).json({ message: 'postId is required.' })
    const post = await Post.findById(postId).populate('campaignId').populate('orderId').populate('creatorId', 'name instagramHandle igVerified igHealthScore')
    if (!post) return res.status(404).json({ message: 'Post not found.' })
    if (req.user.role === 'creator' && String(post.creatorId?._id || post.creatorId) !== String(req.user._id)) return res.status(403).json({ message: 'Access denied.' })
    if (req.user.role === 'brand' && String(post.campaignId?.brandId) !== String(req.user._id)) return res.status(403).json({ message: 'Access denied.' })
    const result = await verifyPost(post, { by: req.user.role === 'creator' ? null : req.user._id })
    res.json(result)
  } catch (err) { sendIgError(req, res, err, 'verify-post') }
})

/* ── Ownership proof: a one-time code in the Instagram bio ───────────────── */
// POST /api/instagram/verify-identity/start → { verified, handle, code, instructions }
router.post('/verify-identity/start', requireAuth, requireRole('creator'), identityLimiter, async (req, res) => {
  try {
    const handle = ownHandle(req.user)
    if (!handle) return res.status(400).json({ message: 'Add your Instagram handle to your profile first.' })
    if (req.user.igVerified) return res.json({ verified: true, handle, message: 'Your Instagram ownership is already verified.' })
    let code = req.user.igVerifyCode
    const stale = !req.user.igVerifyCodeAt || Date.now() - new Date(req.user.igVerifyCodeAt).getTime() > 7 * DAY
    if (!code || stale) {
      code = 'FLEXTAG-' + crypto.randomBytes(3).toString('hex').toUpperCase()
      await User.findByIdAndUpdate(req.user._id, { $set: { igVerifyCode: code, igVerifyCodeAt: new Date() } })
    }
    res.json({
      verified: false, handle, code, expiresInDays: 7,
      instructions: [
        'Open Instagram → Edit profile → Bio',
        `Add ${code} anywhere in your bio and save`,
        'Come back here and press "Verify now" — you can remove the code afterwards',
      ],
    })
  } catch (err) { sendIgError(req, res, err, 'verify-identity/start') }
})

// POST /api/instagram/verify-identity/check → { verified, handle, message }
router.post('/verify-identity/check', requireAuth, requireRole('creator'), identityLimiter, async (req, res) => {
  try {
    const handle = ownHandle(req.user)
    if (!handle) return res.status(400).json({ message: 'Add your Instagram handle to your profile first.' })
    if (req.user.igVerified) return res.json({ verified: true, handle, message: 'Already verified.' })
    const code = String(req.user.igVerifyCode || '')
    if (!code) return res.status(400).json({ message: 'Request a verification code first.' })
    const { profile } = await fetchProfile(handle)
    const haystack = `${profile.biography || ''} ${profile.externalUrl || ''}`.toUpperCase()
    if (!haystack.includes(code.toUpperCase())) {
      return res.json({ verified: false, handle, code, message: `We couldn't find ${code} in @${handle}'s bio yet. Instagram can take a minute to update — make sure the bio is saved, then try again.` })
    }
    await User.findByIdAndUpdate(req.user._id, {
      $set: { igVerified: true, igVerifiedAt: new Date(), igVerifyCode: '', igVerifyCodeAt: null, igIsPrivate: profile.isPrivate, followersCount: profile.followers },
    })
    await IgAudit.updateOne({ username: handle }, { $set: { user: req.user._id } }).catch(() => {})
    res.json({ verified: true, handle, message: 'Instagram ownership verified — your posts can now be approved automatically. You can remove the code from your bio.' })
  } catch (err) { sendIgError(req, res, err, 'verify-identity/check') }
})

/* ── Connect Instagram (OAuth) ───────────────────────────────────────────────
 * A creator-authorised token proves ownership continuously and unlocks stories
 * — which vanish in 24h and no scraper can see. Everything degrades: with no
 * Meta app configured these return 503 and the bio-code path stays the way
 * creators verify.
 */

// GET /api/instagram/connect/status
router.get('/connect/status', requireAuth, requireRole('creator'), async (req, res) => {
  const u = req.user
  res.json({
    available: connect.configured(),
    connected: !!u.igConnected,
    username: u.igGraphUsername || '',
    connectedAt: u.igConnectedAt || null,
    expiresAt: u.igTokenExpiresAt || null,
    expired: !!(u.igTokenExpiresAt && new Date(u.igTokenExpiresAt) < new Date()),
  })
})

// POST /api/instagram/connect/start -> { url }
router.post('/connect/start', requireAuth, requireRole('creator'), identityLimiter, async (req, res) => {
  try {
    if (!connect.configured()) {
      return res.status(503).json({ message: 'Instagram connect is not set up yet. Verify with the bio code instead.' })
    }
    // CSRF: the state we hand Facebook must come back to the same session.
    const state = crypto.randomBytes(16).toString('hex')
    req.session.igOauthState = state
    res.json({ url: connect.authUrl(state), scopes: connect.SCOPES })
  } catch (err) { sendIgError(req, res, err, 'connect/start') }
})

// GET /api/instagram/connect/callback — Facebook redirects the human here
router.get('/connect/callback', async (req, res) => {
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  const back = (status, detail = '') =>
    res.redirect(`${frontend}/creator/instagram-analyzer?connect=${status}${detail ? `&reason=${encodeURIComponent(detail)}` : ''}`)
  try {
    const { code, state, error_description: errorDescription } = req.query
    if (errorDescription) return back('denied', String(errorDescription).slice(0, 120))
    if (!code) return back('error', 'No authorization code came back from Facebook.')
    if (!req.session?.userId) return back('error', 'Your session expired — log in and try again.')
    if (!state || state !== req.session.igOauthState) return back('error', 'Security check failed — start the connection again.')
    delete req.session.igOauthState

    const { token, expiresAt } = await connect.exchangeCode(String(code))
    const account = await connect.resolveAccount(token)

    // One Instagram account, one FlexTag creator — the same guard the handle has.
    const taken = await User.exists({ _id: { $ne: req.session.userId }, igGraphUserId: account.igUserId })
    if (taken) return back('taken', `@${account.username} is already connected to another FlexTag account.`)

    await User.findByIdAndUpdate(req.session.userId, { $set: {
      igConnected: true,
      igGraphUserId: account.igUserId,
      igGraphUsername: account.username,
      igGraphToken: token,
      igTokenExpiresAt: expiresAt,
      igConnectedAt: new Date(),
      // OAuth is stronger proof of ownership than a bio code.
      igVerified: true,
      igVerifiedAt: new Date(),
      igVerifyCode: '',
      instagramHandle: account.username,
      followersCount: account.followers,
      igIsPrivate: false,
    } })
    back('ok')
  } catch (err) {
    console.warn('[instagram connect callback]', err.code || '', err.message)
    back('error', err instanceof client.IgError ? err.message : 'Could not finish the connection.')
  }
})

// POST /api/instagram/connect/disconnect
router.post('/connect/disconnect', requireAuth, requireRole('creator'), async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: {
    igConnected: false, igGraphToken: '', igTokenExpiresAt: null, igGraphUserId: '', igGraphUsername: '',
  } })
  // igVerified stays: ownership was proven, disconnecting does not unprove it.
  res.json({ connected: false, message: 'Instagram disconnected. Your verification badge stays.' })
})

// GET /api/instagram/stories/me — the creator's live stories (24h window)
router.get('/stories/me', requireAuth, requireRole('creator'), verifyLimiter, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select('+igGraphToken igGraphUserId igConnected')
    if (!me?.igConnected || !me.igGraphToken) {
      return res.status(400).json({ message: 'Connect your Instagram first — stories can only be read with your permission.' })
    }
    const stories = await connect.fetchStories(me.igGraphUserId, me.igGraphToken)
    res.json({ stories, count: stories.length })
  } catch (err) { sendIgError(req, res, err, 'stories/me') }
})

// POST /api/instagram/verify-story  { postId }
// Stories vanish in 24h, so "was it live?" can only ever be answered while it
// IS live — and only by the creator's own token. What the Graph API returns is
// existence, timing and (when insights are permitted) reach; it does NOT expose
// stickers or mentions, so the content check stays with a human. We capture the
// evidence and say exactly that, rather than releasing money on "a story exists".
router.post('/verify-story', requireAuth, requireRole('creator'), verifyLimiter, async (req, res) => {
  try {
    const { postId } = req.body || {}
    if (!postId) return res.status(400).json({ message: 'postId is required.' })
    const me = await User.findById(req.user._id).select('+igGraphToken igGraphUserId igConnected')
    if (!me?.igConnected || !me.igGraphToken) {
      return res.status(400).json({ message: 'Connect your Instagram first — a story can only be checked with your permission, and only while it is live.' })
    }
    const post = await Post.findOne({ _id: postId, creatorId: req.user._id }).populate('orderId', 'status product')
    if (!post) return res.status(404).json({ message: 'Post not found.' })

    const stories = await connect.fetchStories(me.igGraphUserId, me.igGraphToken)
    if (!stories.length) {
      return res.json({ verified: false, message: 'No live story found on your account right now. Post it, then check within 24 hours.' })
    }

    // Prefer the exact story they submitted; otherwise the newest live one.
    const submitted = String(post.postUrl || '')
    const match = stories.find(st => submitted && st.permalink && submitted.includes(String(st.id))) ||
      stories.find(st => st.permalink && submitted && st.permalink === submitted) ||
      stories.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]

    const insights = await connect.fetchMediaInsights(match.id, me.igGraphToken)
    const postedAt = match.timestamp ? new Date(match.timestamp) : new Date()
    const afterOrder = post.orderId?.createdAt ? postedAt >= new Date(post.orderId.createdAt) : true

    post.verification = {
      status: 'pending',
      checks: [
        { key: 'story_live', label: 'Story is live on your account', passed: true, required: true, detail: `Posted ${postedAt.toLocaleString()}` },
        { key: 'story_timing', label: 'Posted after the order', passed: afterOrder, required: true, detail: afterOrder ? 'Timing checks out' : 'This story predates the order' },
        { key: 'story_content', label: 'Brand tag / hashtag', passed: false, required: true, detail: 'Instagram does not expose story stickers or mentions to apps — an admin confirms this one by eye.' },
      ],
      snapshot: {
        mediaType: 'story', permalink: match.permalink || '', thumbnail: match.thumbnail_url || match.media_url || '',
        takenAt: postedAt, views: insights.reach ?? insights.impressions ?? null, likes: null, comments: null,
        owner: me.igGraphUsername,
      },
      checkedAt: new Date(),
      error: '',
      source: 'graph-connect',
    }
    await post.save()

    res.json({
      verified: true,
      needsReview: true,
      reach: insights.reach ?? null,
      impressions: insights.impressions ?? null,
      postedAt,
      message: afterOrder
        ? 'Story captured with proof it was live. An admin confirms the brand tag before the cashback releases.'
        : 'That story was posted before your order — post a new one and check again.',
    })
  } catch (err) { sendIgError(req, res, err, 'verify-story') }
})

/* ── Auto-detected posts ─────────────────────────────────────────────────────
 * FlexTag spots new Instagram posts on its own (webhook or polling — see
 * services/instagram/postWatch.js). These routes are the creator's side of it:
 * see what was spotted, claim it in one tap, or dismiss it.
 */

// GET /api/instagram/detected — my spotted posts (new first)
router.get('/detected', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const filter = { creatorId: req.user._id }
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status
    const detected = await DetectedPost.find(filter)
      .populate('matchedOrderId', 'orderId product cashbackAmount status')
      .populate('matchedCampaignId', 'title product brand')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
    res.json({ detected })
  } catch (err) {
    console.error('[detected GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/instagram/detected/:id/submit — one tap: file the post + verify
router.post('/detected/:id/submit', requireAuth, requireRole('creator'), verifyLimiter, async (req, res) => {
  try {
    const detected = await DetectedPost.findOne({ _id: req.params.id, creatorId: req.user._id })
    if (!detected) return res.status(404).json({ message: 'Not found.' })
    if (detected.status !== 'new') return res.status(409).json({ message: 'This post has already been handled.' })
    const { post, detected: updated } = await postWatch.submitDetected(detected)
    res.status(201).json({ post, detected: updated, message: 'Submitted — verification is running. Cashback follows automatically if it passes.' })
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error.' })
  }
})

// POST /api/instagram/detected/:id/dismiss — "that one wasn't for a campaign"
router.post('/detected/:id/dismiss', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const detected = await DetectedPost.findOneAndUpdate(
      { _id: req.params.id, creatorId: req.user._id, status: 'new' },
      { $set: { status: 'dismissed' } },
      { new: true },
    )
    if (!detected) return res.status(404).json({ message: 'Not found or already handled.' })
    res.json({ detected, message: 'Dismissed.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── Meta webhook — Instagram pushes "new media" the moment it exists ────────
 * Setup (Meta app dashboard → Webhooks → Instagram): callback URL is
 * <BACKEND_URL>/api/instagram/webhook, verify token is IG_WEBHOOK_VERIFY_TOKEN,
 * subscribe to the `media` field. Without that setup these endpoints simply
 * never receive anything — polling still covers detection.
 */

// GET — Meta's one-time subscription handshake
router.get('/webhook', (req, res) => {
  const token = process.env.IG_WEBHOOK_VERIFY_TOKEN || ''
  if (token && req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === token) {
    return res.status(200).send(req.query['hub.challenge'])
  }
  res.sendStatus(403)
})

// POST — the pushes. Answer 200 immediately; verify the signature; work async.
router.post('/webhook', async (req, res) => {
  // Meta retries on non-200 and disables flaky subscriptions — never block here.
  res.sendStatus(200)
  try {
    const ok = postWatch.verifyWebhookSignature(req.rawBody, req.headers['x-hub-signature-256'], process.env.IG_APP_SECRET)
    if (!ok) {
      console.warn('[ig webhook] dropped a push with a bad signature')
      return
    }
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : []
    for (const entry of entries) {
      const mediaChange = (entry.changes || []).some(c => c.field === 'media')
      if (!mediaChange || !entry.id) continue
      postWatch.onWebhookMediaChange(entry.id)
        .then(r => r && console.log(`[ig webhook] ${entry.id}: ${r.detected} new post(s) spotted`))
        .catch(err => console.warn('[ig webhook] check failed:', err.message))
    }
  } catch (err) {
    console.warn('[ig webhook]', err.message)
  }
})

module.exports = router
