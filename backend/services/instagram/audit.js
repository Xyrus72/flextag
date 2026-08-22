'use strict'
/**
 * Audit orchestration: profile → posts → follower sample → comments → scoring,
 * persisted to IgAudit (one doc per username, with history) and denormalized
 * onto the creator's User doc for lists and signup gating.
 */
const IgAudit = require('../../models/IgAudit')
const User = require('../../models/User')
const ep = require('./endpoints')
const sc = require('./scoring')
const { getProvider, getFallbackProvider, withFallback, providers } = require('./provider')
const { getIgSettings } = require('../../utils/settings')

const DAY = 86_400_000
const HOUR = 60 * 60_000
const PRECHECK_CACHE_MS = HOUR // signup checks tolerate 1 h of staleness, not the full audit TTL
const HISTORY_MAX = 52

function summarizeProfile(p) {
  return {
    username: p.username, exists: true, isPrivate: !!p.isPrivate, isVerified: !!p.isVerified,
    followers: p.followers || 0, following: p.following || 0, posts: p.posts || 0,
    profilePicUrl: p.profilePicUrl || '', fullName: p.fullName || '',
  }
}

/* ── Precheck (signup gate) ──────────────────────────────────────────────── */

/**
 * One request, 1 h cache. Returns { ...profile summary, eligible, reasons, minFollowers, cached }.
 * Throws IgError (NOT_FOUND, NO_SESSION, RATE_LIMITED, ...).
 */
async function precheck(rawUsername, { settings } = {}) {
  const username = ep.cleanUsername(rawUsername)
  const s = settings || (await getIgSettings())
  const cached = await IgAudit.findOne({ username }).lean()
  const lastProfileCheck = cached ? new Date(cached.profileCheckedAt || cached.fetchedAt).getTime() : 0
  if (cached && Date.now() - lastProfileCheck < PRECHECK_CACHE_MS) {
    const profile = { ...cached.profile, username }
    return { ...summarizeProfile(profile), ...sc.evaluateEligibility(profile, s), cached: true }
  }
  const { profile, seedPosts, via } = await fetchProfile(username)
  const eligibility = sc.evaluateEligibility(profile, s)
  const now = new Date()
  if (!cached) {
    // Persist a basic snapshot (profile + any seed posts) so the full audit / admin lists can reuse it.
    const posts = seedPosts || []
    const metrics = sc.computeMetrics(profile, posts)
    await IgAudit.findOneAndUpdate(
      { username },
      { $set: { igUserId: profile.igUserId, profile, posts, metrics, health: sc.scoreHealth(metrics, profile), eligibility, source: via, depth: 'basic', fetchedAt: now, profileCheckedAt: now, fetchErrors: [] } },
      { upsert: true, new: true },
    )
  } else {
    // Stale doc: refresh only the lightweight profile fields so the next precheck is cached again.
    await IgAudit.updateOne({ username }, { $set: { igUserId: profile.igUserId, profile, eligibility, profileCheckedAt: now } })
  }
  return { ...summarizeProfile(profile), ...eligibility, cached: false }
}

/**
 * Profile via the active provider (with fallback). Returns the normalized
 * profile, any seed posts the provider bundles, and which provider answered —
 * the deep fetches that follow must use that same provider.
 */
async function fetchProfile(username) {
  return withFallback(async (p) => {
    const { profile, seedPosts } = await p.getProfile(username)
    return { profile, seedPosts: seedPosts || [], via: p.configured() ? p.name : 'anonymous', provider: p }
  })
}

/* ── Full audit ──────────────────────────────────────────────────────────── */

const inFlight = new Map() // username → Promise<IgAudit> (dedupes concurrent runs)

/**
 * @param {string} rawUsername
 * @param {{ depth?: 'basic'|'full', force?: boolean, userId?: any, settings?: object, maxAgeMs?: number }} [opts]
 */
async function runAudit(rawUsername, opts = {}) {
  const username = ep.cleanUsername(rawUsername)
  if (inFlight.has(username)) return inFlight.get(username)
  const p = runAuditInner(username, opts).finally(() => inFlight.delete(username))
  inFlight.set(username, p)
  return p
}

async function runAuditInner(username, { depth = 'full', force = false, userId = null, settings, maxAgeMs } = {}) {
  const s = settings || (await getIgSettings())
  const existing = await IgAudit.findOne({ username })
  const ttl = maxAgeMs ?? s.auditTtlDays * DAY
  const primary = getProvider()
  const canDeep = primary.configured() || !!getFallbackProvider(primary)

  // A fresh doc is reused unless a full audit is now attainable where only a basic one exists.
  const upgradable = depth === 'full' && existing && existing.depth !== 'full' && !existing.profile?.isPrivate && canDeep
  if (existing && !force && !upgradable && Date.now() - existing.fetchedAt.getTime() < ttl) {
    if (userId && !existing.user) { existing.user = userId; await existing.save() }
    return existing
  }

  const t0 = Date.now()
  const errors = []

  // 1. Profile via whichever provider answers (HikerAPI or the cookie session)
  const { profile, seedPosts, via, provider } = await fetchProfile(username)
  let posts = seedPosts
  let followers = []
  const commentSamples = []
  let effectiveDepth = 'basic'
  const deepOk = provider.configured() && !profile.isPrivate && depth === 'full' && !!profile.igUserId

  if (deepOk) {
    effectiveDepth = 'full'
    // 2. Extended post history (reel play counts, captions)
    try {
      if (s.postsToFetch > posts.length) {
        const more = await provider.getPosts(profile.igUserId, { limit: s.postsToFetch })
        if (more.length) posts = more
      }
    } catch (err) { errors.push(`posts: ${err.message}`) }
    // 3. Follower sample (fake-follower estimate)
    try {
      if (s.followerSample > 0) followers = await provider.getFollowers(profile.igUserId, { limit: s.followerSample })
    } catch (err) { errors.push(`followers: ${err.message}`) }
    // 4. Comment samples from the 3 newest posts with comments
    try {
      for (const p of posts.slice(0, 3)) {
        if (!p.comments) continue
        const mediaId = p.id || ep.shortcodeToMediaId(p.shortcode)
        commentSamples.push(...(await provider.getComments(mediaId, { limit: 20, shortcode: p.shortcode })))
      }
    } catch (err) { errors.push(`comments: ${err.message}`) }
  } else if (depth === 'full' && !provider.configured()) {
    errors.push('No Instagram data provider configured: follower sample and extended post history skipped.')
  }

  // Dedupe + newest first (posts without a usable date sort last)
  const seen = new Set()
  const ts = (p) => (p.takenAt instanceof Date && !Number.isNaN(p.takenAt.getTime()) ? p.takenAt.getTime() : 0)
  posts = posts.filter((p) => p.shortcode && !seen.has(p.shortcode) && seen.add(p.shortcode)).sort((a, b) => ts(b) - ts(a)).slice(0, s.postsToFetch)

  // 5. Scoring
  const metrics = sc.computeMetrics(profile, posts)
  const health = sc.scoreHealth(metrics, profile)
  const audience = sc.estimateFakeFollowers(followers, metrics, profile, existing?.history || [])
  const eligibility = sc.evaluateEligibility(profile, s)

  // 6. Persist (push the previous snapshot into history)
  const history = existing ? [...existing.history] : []
  if (existing && existing.fetchedAt) {
    history.push({
      at: existing.fetchedAt, followers: existing.profile?.followers, following: existing.profile?.following, posts: existing.profile?.posts,
      engagementRate: existing.metrics?.engagementRate ?? null, healthScore: existing.health?.score ?? null, fakeFollowerPct: existing.audience?.fakeFollowerPct ?? null,
    })
    while (history.length > HISTORY_MAX) history.shift()
  }

  // Link to the creator who currently owns this handle (DB truth, never a stale previous link)
  const linkedUserId = userId || (await findUserIdForHandle(username))
  const doc = await IgAudit.findOneAndUpdate(
    { username },
    {
      $set: {
        igUserId: profile.igUserId, user: linkedUserId || null, profile, posts, commentSamples: commentSamples.slice(0, 60),
        followerSample: audience.counts, metrics, health,
        audience: { fakeFollowerPct: audience.fakeFollowerPct, quality: audience.quality, signals: audience.signals, sampleSize: audience.sampleSize },
        eligibility, source: via, depth: effectiveDepth,
        fetchedAt: new Date(), profileCheckedAt: new Date(), durationMs: Date.now() - t0, fetchErrors: errors, history,
      },
    },
    { upsert: true, new: true },
  )

  // 7. Denormalize onto the creator
  if (linkedUserId) {
    await User.findByIdAndUpdate(linkedUserId, {
      $set: {
        igAuditedAt: doc.fetchedAt, igHealthScore: health.score, igFakeFollowerPct: audience.fakeFollowerPct, igIsPrivate: profile.isPrivate,
        igPrecheck: eligibility.eligible ? 'passed' : 'failed', followersCount: profile.followers,
        ...(metrics.engagementRate != null ? { engagementRate: metrics.engagementRate } : {}),
      },
    })
  }
  return doc
}

async function findUserIdForHandle(username) {
  const u = await User.findOne({ role: 'creator', instagramHandle: ep.handleRegex(username) }).select('_id').lean()
  return u ? u._id : null
}

/**
 * Fire-and-forget audit for a user (after signup / handle change). Never throws.
 * Re-uses a full audit younger than an hour so handle flip-flopping can't drive
 * unlimited Instagram traffic through the shared session.
 */
function auditUserInBackground(user, extra = {}) {
  const handle = String(user?.instagramHandle || '').replace(/^@/, '').trim()
  if (!handle) return
  setTimeout(() => {
    runAudit(handle, { depth: 'full', maxAgeMs: HOUR, userId: user._id, ...extra }).catch(async (err) => {
      console.warn(`[instagram audit] @${handle}: ${err.code || ''} ${err.message}`)
      if (err.code === 'NOT_FOUND') await User.findByIdAndUpdate(user._id, { $set: { igPrecheck: 'failed', igAuditedAt: new Date() } }).catch(() => {})
    })
  }, 500).unref?.()
}

module.exports = { precheck, runAudit, auditUserInBackground, findUserIdForHandle, fetchProfile, providers }
