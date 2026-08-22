'use strict'
/**
 * Raw Instagram endpoints. Each function returns Instagram's own JSON shape;
 * normalize.js turns those into FlexTag's shapes. Keep this file thin — it's
 * the part most likely to need maintenance when Instagram changes things.
 */

const { request, IgError, WEB_ORIGIN } = require('./client')

const SHORTCODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Non-throwing normalizer: '@Foo.Bar' / 'https://instagram.com/foo.bar/' → 'foo.bar'; '' when invalid. */
function normalizeHandle(raw) {
  const u = String(raw || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').toLowerCase()
  return /^[a-z0-9._]{1,30}$/.test(u) ? u : ''
}

function cleanUsername(raw) {
  const u = normalizeHandle(raw)
  if (!u) throw new IgError('BAD_INPUT', 'Invalid Instagram username.')
  return u
}

/** Case-insensitive matcher for a stored handle (tolerates a legacy leading '@'). */
function handleRegex(handle) {
  return new RegExp(`^@?${String(handle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
}

/** Extract the shortcode from any post / reel / IGTV URL. Returns null if not a post URL. */
function parsePostUrl(url) {
  const m = String(url || '').trim().match(/instagram\.com\/(?:[a-z0-9._]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/i)
  return m ? m[1] : null
}

function shortcodeToMediaId(shortcode) {
  let id = 0n
  for (const ch of shortcode) {
    const idx = SHORTCODE_ALPHABET.indexOf(ch)
    if (idx < 0) throw new IgError('BAD_INPUT', 'Invalid Instagram post shortcode.')
    id = id * 64n + BigInt(idx)
  }
  return id.toString()
}

function mediaIdToShortcode(mediaId) {
  let id = BigInt(String(mediaId).split('_')[0])
  if (id === 0n) return 'A'
  let out = ''
  while (id > 0n) { out = SHORTCODE_ALPHABET[Number(id % 64n)] + out; id /= 64n }
  return out
}

/* ── Profile ─────────────────────────────────────────────────────────────── */

/**
 * Public profile + first 12 posts. Works anonymously from some IPs; with a
 * session it is reliable. Returns Instagram's `data.user` object.
 */
async function fetchProfile(username) {
  const u = cleanUsername(username)
  const json = await request('/api/v1/users/web_profile_info/', {
    auth: 'optional',
    params: { username: u },
    referer: `${WEB_ORIGIN}/${u}/`,
  })
  const user = json?.data?.user
  if (!user) throw new IgError('NOT_FOUND', `Instagram account @${u} was not found.`)
  return user
}

/* ── Feed (posts) ────────────────────────────────────────────────────────── */

/**
 * Recent posts for a user id, newest first, in the mobile "items[]" shape.
 * Requires a session. Stops at `limit` or when Instagram says no more.
 */
async function fetchUserFeed(userId, { limit = 30, pageSize = 12 } = {}) {
  const items = []
  let maxId
  let guard = 0
  while (items.length < limit && guard++ < 10) {
    const json = await request(`/api/v1/feed/user/${userId}/`, {
      params: { count: Math.min(pageSize, limit - items.length), max_id: maxId },
    })
    // Instagram moved this feed from `items[]` to `profile_grid_items[]` (2026); the
    // per-item media object is unchanged, so either array feeds the same normalizer.
    const page = Array.isArray(json?.items) && json.items.length ? json.items
      : Array.isArray(json?.profile_grid_items) ? json.profile_grid_items : []
    items.push(...page)
    const nextCursor = json?.next_max_id || json?.profile_grid_items_cursor
    if (!json?.more_available || !nextCursor || page.length === 0) break
    maxId = nextCursor
  }
  return items.slice(0, limit)
}

/* ── Followers sample ────────────────────────────────────────────────────── */

/** Up to `limit` followers (Instagram's `users[]` shape). Requires a session. */
async function fetchFollowersSample(userId, { limit = 200, pageSize = 100 } = {}) {
  const users = []
  let maxId
  let guard = 0
  while (users.length < limit && guard++ < 5) {
    const json = await request(`/api/v1/friendships/${userId}/followers/`, {
      params: { count: Math.min(pageSize, limit - users.length), search_surface: 'follow_list_page', max_id: maxId },
    })
    const page = Array.isArray(json?.users) ? json.users : []
    users.push(...page)
    if (!json?.next_max_id || page.length === 0) break
    maxId = json.next_max_id
  }
  return users.slice(0, limit)
}

/* ── Single post ─────────────────────────────────────────────────────────── */

/** Full media info for one post (mobile shape, `items[0]`). Requires a session. */
async function fetchPostByShortcode(shortcode) {
  const mediaId = shortcodeToMediaId(shortcode)
  const json = await request(`/api/v1/media/${mediaId}/info/`, { referer: `${WEB_ORIGIN}/p/${shortcode}/` })
  const item = json?.items?.[0]
  if (!item) throw new IgError('NOT_FOUND', 'Post not found (deleted, private, or wrong URL).')
  return item
}

/**
 * Anonymous fallback: the public embed page. Gives owner username + caption
 * (+ sometimes like count) without a session. Best effort — returns null
 * fields when the markup doesn't contain them.
 */
async function fetchPostEmbed(shortcode) {
  const html = await request(`/p/${shortcode}/embed/captioned/`, { auth: 'none', as: 'text', headers: { 'x-requested-with': undefined } })
  if (/<title>\s*Instagram\s*<\/title>/i.test(html) && !/Username|Caption/i.test(html)) {
    throw new IgError('NOT_FOUND', 'Post not found (deleted, private, or wrong URL).')
  }
  const pick = (re) => { const m = html.match(re); return m ? m[1] : null }
  const unesc = (s) => s == null ? null : s.replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\\//g, '/').replace(/\\"/g, '"').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
  const owner = unesc(pick(/"owner"\s*:\s*\{[^}]*?"username"\s*:\s*"([^"]+)"/) || pick(/class="UsernameText"[^>]*>([^<]+)</) || pick(/"username"\s*:\s*"([^"]+)"/))
  const captionHtml = pick(/<div class="Caption"[\s\S]*?<\/a>([\s\S]*?)<div class="CaptionComments"/)
  const caption = captionHtml ? unesc(captionHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()) : unesc(pick(/"caption"\s*:\s*\{[^}]*?"text"\s*:\s*"((?:[^"\\]|\\.)*)"/))
  const likes = pick(/"edge_media_preview_like"\s*:\s*\{\s*"count"\s*:\s*(\d+)/) || pick(/"like_count"\s*:\s*(\d+)/)
  const takenAt = pick(/"taken_at_timestamp"\s*:\s*(\d+)/) || pick(/"taken_at"\s*:\s*(\d+)/)
  const isCarousel = /edge_sidecar_to_children|"media_type"\s*:\s*8|class="[^"]*Sidecar/.test(html)
  const isVideo = !isCarousel && (/"is_video"\s*:\s*true/.test(html) || /"media_type"\s*:\s*2/.test(html))
  const isImage = !isCarousel && !isVideo && (/"is_video"\s*:\s*false/.test(html) || /"media_type"\s*:\s*1/.test(html))
  // null = could not determine → the content-type check falls back to manual review
  const mediaType = isCarousel ? 'carousel' : isVideo ? 'video' : isImage ? 'image' : null
  const isPrivate = /"is_private"\s*:\s*true/.test(html)
  return { shortcode, owner, caption, likes: likes != null ? Number(likes) : null, takenAt: takenAt ? Number(takenAt) : null, isVideo, mediaType, isPrivate, source: 'embed' }
}

/* ── Comments ────────────────────────────────────────────────────────────── */

/** Up to `limit` comments on a media id (Instagram's `comments[]` shape). Requires a session. */
async function fetchComments(mediaId, { limit = 20 } = {}) {
  const json = await request(`/api/v1/media/${mediaId}/comments/`, {
    params: { can_support_threading: 'true', permalink_enabled: 'false' },
  })
  const comments = Array.isArray(json?.comments) ? json.comments : []
  return comments.slice(0, limit)
}

module.exports = {
  normalizeHandle, cleanUsername, handleRegex, parsePostUrl, shortcodeToMediaId, mediaIdToShortcode,
  fetchProfile, fetchUserFeed, fetchFollowersSample, fetchPostByShortcode, fetchPostEmbed, fetchComments,
}
