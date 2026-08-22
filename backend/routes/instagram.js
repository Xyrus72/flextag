const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { requireAuth, requireRole } = require('../middleware/auth')
const client  = require('../services/instagram/client')
const { cleanUsername, fetchProfile } = require('../services/instagram/endpoints')
const { normalizeProfile } = require('../services/instagram/normalize')
const { precheck, runAudit } = require('../services/instagram/audit')
const { verifyPost } = require('../services/instagram/postCheck')
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
    const [session, settings] = await Promise.all([client.checkSession({ force: req.query.force === '1' }), getIgSettings({ fresh: true })])
    res.json({ ...client.getStatus(), valid: session.valid, sessionUser: session.username || null, settings })
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
    const post = await Post.findById(postId).populate('campaignId').populate('orderId').populate('creatorId', 'name instagramHandle igVerified')
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
    const profile = normalizeProfile(await fetchProfile(handle))
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

module.exports = router
