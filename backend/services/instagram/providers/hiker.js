'use strict'
/**
 * HikerAPI provider (https://hikerapi.com) — a paid Instagram data API that
 * scrapes from its own IP pool, so FlexTag's audits don't depend on the
 * reputation of the server's IP or on a throwaway cookie session.
 *
 * Auth: `x-access-key: <HIKERAPI_KEY>`. Billing: every successful response is
 * one request (~$0.0006); 5xx are free. A full audit is ~6-8 requests.
 *
 * Exposes the same provider interface as providers/session.js and returns
 * FlexTag's normalized Profile / Post / Follower / Comment shapes.
 */
const { IgError } = require('../client')
const { extractHashtags, extractMentions, ANON_PIC_MARKER } = require('../normalize')

const BASE = 'https://api.hikerapi.com'
const MIN_GAP_MS = 250
const REQUEST_TIMEOUT_MS = 30_000

const str = (v) => (typeof v === 'string' ? v : '')
const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

const state = { lastAt: 0, recent: [], lastError: null, valid: null, checkedAt: null }

const key = () => String(process.env.HIKERAPI_KEY || '').trim()
const configured = () => key().length > 0

function pruneRecent() {
  const cutoff = Date.now() - 3_600_000
  while (state.recent.length && state.recent[0] < cutoff) state.recent.shift()
}

/* ── HTTP ────────────────────────────────────────────────────────────────── */

async function get(path, params = {}) {
  if (!configured()) throw new IgError('NO_SESSION', 'HikerAPI is not configured (set HIKERAPI_KEY in backend/.env).', { hint: 'HIKERAPI_KEY' })
  const url = new URL(BASE + path)
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))

  // Light spacing so bursts (e.g. 3 comment fetches) don't look like abuse.
  const gap = state.lastAt + MIN_GAP_MS - Date.now()
  if (gap > 0) await new Promise((r) => setTimeout(r, gap))
  state.lastAt = Date.now()
  state.recent.push(Date.now()); pruneRecent()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let res, text
  try {
    res = await fetch(url, { headers: { 'x-access-key': key(), accept: 'application/json' }, signal: controller.signal })
    text = await res.text()
  } catch (err) {
    state.lastError = `network: ${err.message}`
    throw new IgError('UNAVAILABLE', `Could not reach HikerAPI (${err.message}).`)
  } finally { clearTimeout(timer) }

  let json = null
  try { json = JSON.parse(text) } catch { /* handled below */ }

  if (res.status === 401 || res.status === 403) {
    state.valid = false; state.checkedAt = Date.now(); state.lastError = `auth ${res.status}: ${json?.error || json?.detail || ''}`.trim()
    throw new IgError('SESSION_INVALID', 'HikerAPI rejected the access key.', { hint: 'HIKERAPI_KEY' })
  }
  if (res.status === 402 || res.status === 429) {
    state.lastError = `${res.status}: ${json?.error || json?.detail || 'credits exhausted / rate limited'}`
    throw new IgError('RATE_LIMITED', 'HikerAPI credits exhausted or rate-limited.', { hint: 'HIKERAPI_KEY' })
  }
  if (res.status === 404) throw new IgError('NOT_FOUND', 'Not found on Instagram.')
  if (res.status >= 500) { state.lastError = `hiker ${res.status}`; throw new IgError('UNAVAILABLE', `HikerAPI responded ${res.status}.`) }
  if (!json) { state.lastError = 'non-JSON response'; throw new IgError('BAD_RESPONSE', 'HikerAPI returned a non-JSON response.') }
  // Some "not found" cases come back as 200 with an error envelope
  if (json && json.state === false) {
    const msg = str(json.error || json.detail)
    if (/not found|does not exist|invalid user/i.test(msg)) throw new IgError('NOT_FOUND', msg || 'Not found on Instagram.')
    if (/unauthori|access.?key/i.test(msg)) { state.valid = false; throw new IgError('SESSION_INVALID', 'HikerAPI rejected the access key.', { hint: 'HIKERAPI_KEY' }) }
    state.lastError = msg
    throw new IgError('BAD_RESPONSE', msg || 'HikerAPI error.')
  }
  state.valid = true; state.checkedAt = Date.now()
  return json
}

/** Chunk endpoints return `[items[], cursor]`; paged ones return `{ response, next_page_id }`. */
const chunkItems = (json) => (Array.isArray(json) ? (Array.isArray(json[0]) ? json[0] : json) : [])
const chunkCursor = (json) => (Array.isArray(json) && !Array.isArray(json[1]) ? (json[1] ?? null) : null)

/* ── Normalizers (HikerAPI v1 shapes → FlexTag shapes) ──────────────────── */

function normalizeHikerUser(u) {
  return {
    igUserId: String(u.pk || u.id || ''),
    username: str(u.username).toLowerCase(),
    fullName: str(u.full_name),
    biography: str(u.biography),
    externalUrl: str(u.external_url),
    isPrivate: !!u.is_private,
    isVerified: !!u.is_verified,
    isBusiness: !!u.is_business,
    isProfessional: !!(u.is_business || u.account_type === 2 || u.account_type === 3),
    category: str(u.category || u.category_name),
    profilePicUrl: str(u.profile_pic_url_hd || u.profile_pic_url),
    followers: num(u.follower_count),
    following: num(u.following_count),
    posts: num(u.media_count),
  }
}

function mediaType(m) {
  if (m.product_type === 'clips') return 'reel'
  if (m.media_type === 8) return 'carousel'
  if (m.media_type === 2) return 'video'
  return 'image'
}

function takenAt(m) {
  if (typeof m.taken_at_ts === 'number' && m.taken_at_ts > 0) return new Date(m.taken_at_ts * 1000)
  if (typeof m.taken_at === 'number' && m.taken_at > 0) return new Date(m.taken_at * 1000)
  if (typeof m.taken_at === 'string') { const d = new Date(m.taken_at); if (!Number.isNaN(d.getTime())) return d }
  return null
}

function normalizeHikerMedia(m) {
  const hidden = !!m.like_and_view_counts_disabled
  const likes = num(m.like_count, -1)
  const caption = str(typeof m.caption_text === 'string' ? m.caption_text : m.caption?.text)
  const code = str(m.code)
  const isVideo = m.media_type === 2
  const views = num(m.play_count) || num(m.view_count) || null
  return {
    id: String(m.pk || m.id || '').split('_')[0],
    shortcode: code,
    url: `https://www.instagram.com/${m.product_type === 'clips' ? 'reel' : 'p'}/${code}/`,
    takenAt: takenAt(m),
    mediaType: mediaType(m),
    likes: hidden || likes < 0 ? null : likes,
    comments: num(m.comment_count),
    views: isVideo ? views : null,
    caption,
    thumbnail: str(m.thumbnail_url || m.image_versions?.[0]?.url || m.image_versions2?.candidates?.[0]?.url),
    owner: str(m.user?.username || m.owner?.username).toLowerCase(),
    ownerIsPrivate: !!(m.user?.is_private ?? m.owner?.is_private),
    hashtags: extractHashtags(caption),
    mentions: extractMentions(caption),
  }
}

function normalizeHikerFollower(u) {
  const pic = str(u.profile_pic_url)
  return {
    username: str(u.username).toLowerCase(),
    fullName: str(u.full_name).trim(),
    isPrivate: !!u.is_private,
    isVerified: !!u.is_verified,
    hasAnonymousPic: u.has_anonymous_profile_picture === true || !pic || pic.includes(ANON_PIC_MARKER),
  }
}

function normalizeHikerComment(c, shortcode) {
  const created = typeof c.created_at === 'number' ? new Date(c.created_at * 1000) : null
  return { shortcode, username: str(c.user?.username).toLowerCase(), text: str(c.text).slice(0, 280), createdAt: created, likes: num(c.comment_like_count ?? c.like_count) }
}

/* ── Provider interface ──────────────────────────────────────────────────── */

async function getProfile(username) {
  const json = await get('/v1/user/by/username', { username })
  const u = json.user || json
  if (!u || !u.username) throw new IgError('NOT_FOUND', `Instagram account @${username} was not found.`)
  return { profile: normalizeHikerUser(u), seedPosts: [] }
}

async function getPosts(igUserId, { limit = 30 } = {}) {
  const out = []
  let cursor
  let guard = 0
  while (out.length < limit && guard++ < 6) {
    const json = await get('/v1/user/medias/chunk', { user_id: igUserId, end_cursor: cursor })
    const page = chunkItems(json)
    out.push(...page.map(normalizeHikerMedia))
    cursor = chunkCursor(json)
    if (!cursor || page.length === 0) break
  }
  return out.slice(0, limit)
}

async function getFollowers(igUserId, { limit = 200 } = {}) {
  const out = []
  let cursor
  let guard = 0
  while (out.length < limit && guard++ < 6) {
    const json = await get('/v1/user/followers/chunk', { user_id: igUserId, max_id: cursor })
    const page = chunkItems(json)
    out.push(...page.map(normalizeHikerFollower))
    cursor = chunkCursor(json)
    if (!cursor || page.length === 0) break
  }
  return out.slice(0, limit)
}

async function getPost(shortcode) {
  const json = await get('/v1/media/by/code', { code: shortcode })
  const m = json.media || json
  if (!m || !m.code) throw new IgError('NOT_FOUND', 'Post not found (deleted, private, or wrong URL).')
  return { ...normalizeHikerMedia(m), source: 'hiker' }
}

async function getComments(mediaId, { limit = 20, shortcode = '' } = {}) {
  const json = await get('/v2/media/comments', { id: mediaId })
  const list = json?.response?.comments || json?.comments || (Array.isArray(json) ? json : [])
  return list.slice(0, limit).map((c) => normalizeHikerComment(c, shortcode))
}

async function status({ force = false } = {}) {
  pruneRecent()
  if (!configured()) return { provider: 'hiker', configured: false, valid: null, requestsLastHour: state.recent.length, lastError: state.lastError }
  const fresh = state.checkedAt && Date.now() - state.checkedAt < 10 * 60_000
  if (!fresh || force) {
    try { await get('/v1/user/by/username', { username: 'instagram' }) } catch (err) { if (!(err instanceof IgError && err.code === 'SESSION_INVALID')) state.lastError = err.message }
  }
  return { provider: 'hiker', configured: true, valid: state.valid, sessionUser: 'HikerAPI', requestsLastHour: state.recent.length, lastError: state.lastError, checkedAt: state.checkedAt ? new Date(state.checkedAt) : null }
}

module.exports = {
  name: 'hiker', configured, getProfile, getPosts, getFollowers, getPost, getComments, status,
  // exported for tests
  normalizeHikerUser, normalizeHikerMedia, normalizeHikerFollower, normalizeHikerComment, chunkItems, chunkCursor,
}
