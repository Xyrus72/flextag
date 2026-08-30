'use strict'
/**
 * Official Instagram Graph API provider — Business Discovery.
 *
 * Zero ban risk (Anthropic-of-Meta-sanctioned), but LIMITED by what Business
 * Discovery exposes:
 *   ✓ profile (followers/following/media counts, bio, picture) + recent media
 *     with like/comment counts — for PUBLIC Business/Creator accounts only.
 *   ✗ no follower list  → getFollowers returns [] (no fake-follower sampling)
 *   ✗ no arbitrary post-by-shortcode → getPost throws UNAVAILABLE, so post
 *     verification falls back to the session/hiker provider.
 *
 * Opt in with IG_PROVIDER=graph. Needs a Meta app, FlexTag's own IG
 * Business/Creator account, and a long-lived token (IG_GRAPH_TOKEN) plus that
 * account's id (IG_GRAPH_USER_ID). Untested here — requires those credentials.
 */
const { IgError } = require('../client')

const API_VERSION = process.env.IG_GRAPH_VERSION || 'v21.0'
const TOKEN       = () => process.env.IG_GRAPH_TOKEN || ''
const IG_USER_ID  = () => process.env.IG_GRAPH_USER_ID || ''
const configured  = () => !!(TOKEN() && IG_USER_ID())

const state = { valid: null, checkedAt: null, lastError: null }

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const str = (v) => (typeof v === 'string' ? v : '')
const shortcodeFromPermalink = (url) => { const m = String(url || '').match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/); return m ? m[1] : '' }
const extractTags = (t) => [...new Set((String(t || '').match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).map((x) => x.slice(1).toLowerCase()))]
const extractMentions = (t) => [...new Set((String(t || '').match(/@[a-z0-9._]{1,30}/gi) || []).map((x) => x.slice(1).toLowerCase().replace(/\.+$/, '')))]

async function gget(params) {
  if (!configured()) throw new IgError('NO_SESSION', 'Instagram Graph API is not configured (set IG_GRAPH_TOKEN and IG_GRAPH_USER_ID in backend/.env).')
  const url = new URL(`https://graph.facebook.com/${API_VERSION}/${IG_USER_ID()}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('access_token', TOKEN())

  let res, json
  try { res = await fetch(url, { method: 'GET' }); json = await res.json() }
  catch (e) { throw new IgError('UNAVAILABLE', `Could not reach the Graph API (${e.message}).`) }

  if (json && json.error) {
    const code = json.error.code
    const msg = json.error.message || 'Graph API error'
    if (code === 190 || code === 102 || code === 10) { state.valid = false; state.checkedAt = Date.now(); state.lastError = msg; throw new IgError('SESSION_INVALID', 'Graph API token invalid, expired, or missing permissions.') }
    if (code === 4 || code === 17 || code === 32 || code === 613) { state.lastError = msg; throw new IgError('RATE_LIMITED', 'Graph API rate limit hit.') }
    if (/does not exist|cannot be found|not a business|not.*professional|Invalid user/i.test(msg)) throw new IgError('NOT_FOUND', 'Account not found or not a public professional account.')
    state.lastError = msg
    throw new IgError('UNAVAILABLE', `Graph API error: ${msg}`)
  }
  state.valid = true; state.checkedAt = Date.now()
  return json
}

function mediaTypeOf(m) {
  const pt = String(m.media_product_type || '').toUpperCase()
  if (pt === 'REELS' || pt === 'CLIPS') return 'reel'
  if (m.media_type === 'VIDEO') return 'video'
  if (m.media_type === 'CAROUSEL_ALBUM') return 'carousel'
  return 'image'
}

function normMedia(m, owner) {
  const caption = str(m.caption)
  const shortcode = shortcodeFromPermalink(m.permalink)
  return {
    id: String(m.id || ''), shortcode,
    url: m.permalink || (shortcode ? `https://www.instagram.com/p/${shortcode}/` : ''),
    takenAt: m.timestamp ? new Date(m.timestamp) : null, mediaType: mediaTypeOf(m),
    likes: m.like_count == null ? null : num(m.like_count), comments: num(m.comments_count), views: null,
    caption, thumbnail: str(m.thumbnail_url || m.media_url), owner: str(owner).toLowerCase(),
    hashtags: extractTags(caption), mentions: extractMentions(caption),
  }
}

/** @returns {Promise<{ profile: object, seedPosts: object[] }>} */
async function getProfile(username, { postsLimit = 30 } = {}) {
  const lim = Math.min(50, Math.max(12, Number(postsLimit) || 30))
  const fields = `business_discovery.username(${String(username).replace(/[^a-z0-9._]/gi, '')}){id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url,media.limit(${lim}){id,caption,like_count,comments_count,media_type,media_product_type,permalink,timestamp,thumbnail_url,media_url}}`
  const json = await gget({ fields })
  const bd = json.business_discovery
  if (!bd) throw new IgError('NOT_FOUND', `@${username} not found or not a public professional account.`)
  const profile = {
    igUserId: String(bd.id || ''), username: str(bd.username).toLowerCase(), fullName: str(bd.name),
    biography: str(bd.biography), externalUrl: str(bd.website),
    isPrivate: false, isVerified: false, isBusiness: true, isProfessional: true, category: '',
    profilePicUrl: str(bd.profile_picture_url),
    followers: num(bd.followers_count), following: num(bd.follows_count), posts: num(bd.media_count),
  }
  const seedPosts = ((bd.media && bd.media.data) || []).map((m) => normMedia(m, profile.username))
  return { profile, seedPosts }
}

// Business Discovery seeds posts in getProfile and can't page a discovered account by id.
async function getPosts() { return [] }
// The Graph API cannot enumerate the followers of a discovered account.
async function getFollowers() { return [] }
// Business Discovery cannot fetch an arbitrary post by shortcode → let post
// verification fall back to the session/hiker provider.
async function getPost() { throw new IgError('UNAVAILABLE', 'The Graph API cannot fetch arbitrary posts by shortcode.') }
async function getComments() { return [] }

async function status({ force = false } = {}) {
  if (!configured()) return { provider: 'graph', configured: false, valid: null, lastError: state.lastError }
  if (force || state.valid === null) {
    try { await gget({ fields: 'username' }) } catch { /* state set inside gget */ }
  }
  return { provider: 'graph', configured: true, valid: state.valid, sessionUser: 'Graph API', lastError: state.lastError, checkedAt: state.checkedAt ? new Date(state.checkedAt) : null }
}

module.exports = { name: 'graph', configured, getProfile, getPosts, getFollowers, getPost, getComments, status, normMedia }
