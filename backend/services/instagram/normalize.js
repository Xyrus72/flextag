'use strict'
/**
 * Turn Instagram's raw response shapes (the "web" edge_* GraphQL shape and the
 * "mobile" items[] shape) into FlexTag's normalized Profile / Post / Follower /
 * Comment objects. All downstream code (scoring, post checks, UI) only ever
 * sees the normalized shapes.
 */

const ANON_PIC_MARKER = '44884218_345707102882519_2446069589734326272_n' // Instagram's default avatar asset id

const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const str = (v) => (typeof v === 'string' ? v : '')
/** Unix seconds → Date, or null when missing (never an Invalid/1970 date). */
const dateFromUnix = (secs) => (typeof secs === 'number' && secs > 0 ? new Date(secs * 1000) : null)

function extractHashtags(caption) {
  return [...new Set((str(caption).match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).map((t) => t.slice(1).toLowerCase()))]
}

function extractMentions(caption) {
  return [...new Set((str(caption).match(/@[a-z0-9._]{1,30}/gi) || []).map((t) => t.slice(1).toLowerCase().replace(/\.+$/, '')))]
}

/* ── Profile (web_profile_info → data.user) ──────────────────────────────── */

function normalizeProfile(u) {
  const username = str(u.username).toLowerCase()
  return {
    igUserId: String(u.id || u.pk || ''),
    username,
    fullName: str(u.full_name),
    biography: str(u.biography),
    externalUrl: str(u.external_url),
    isPrivate: !!u.is_private,
    isVerified: !!u.is_verified,
    isBusiness: !!u.is_business_account,
    isProfessional: !!(u.is_professional_account || u.is_business_account),
    category: str(u.category_name || u.business_category_name),
    profilePicUrl: str(u.profile_pic_url_hd || u.profile_pic_url),
    followers: num(u.edge_followed_by?.count, num(u.follower_count)),
    following: num(u.edge_follow?.count, num(u.following_count)),
    posts: num(u.edge_owner_to_timeline_media?.count, num(u.media_count)),
  }
}

/* ── Posts ───────────────────────────────────────────────────────────────── */

function mediaTypeFromWeb(node) {
  if (node.product_type === 'clips') return 'reel'
  if (node.__typename === 'GraphSidecar' || node.__typename === 'XDTGraphSidecar') return 'carousel'
  if (node.is_video || node.__typename === 'GraphVideo' || node.__typename === 'XDTGraphVideo') return 'video'
  return 'image'
}

/** Web shape: edge_owner_to_timeline_media.edges[].node */
function normalizePostFromWeb(node, ownerUsername = '') {
  const likeCount = num(node.edge_liked_by?.count ?? node.edge_media_preview_like?.count, -1)
  const caption = str(node.edge_media_to_caption?.edges?.[0]?.node?.text)
  const shortcode = str(node.shortcode)
  return {
    id: String(node.id || ''),
    shortcode,
    url: `https://www.instagram.com/p/${shortcode}/`,
    takenAt: dateFromUnix(node.taken_at_timestamp),
    mediaType: mediaTypeFromWeb(node),
    likes: likeCount < 0 ? null : likeCount,
    comments: num(node.edge_media_to_comment?.count ?? node.edge_media_preview_comment?.count),
    views: node.is_video ? num(node.video_view_count ?? node.video_play_count, 0) || null : null,
    caption,
    thumbnail: str(node.thumbnail_src || node.display_url),
    owner: str(node.owner?.username || ownerUsername).toLowerCase(),
    hashtags: extractHashtags(caption),
    mentions: extractMentions(caption),
  }
}

function mediaTypeFromMobile(item) {
  if (item.product_type === 'clips') return 'reel'
  if (item.media_type === 8) return 'carousel'
  if (item.media_type === 2) return 'video'
  return 'image'
}

/** Mobile shape: feed/user items[] or media/{id}/info items[0] */
function normalizePostFromMobile(item) {
  const hidden = !!item.like_and_view_counts_disabled
  const likeCount = num(item.like_count, -1)
  const caption = str(item.caption?.text)
  const shortcode = str(item.code)
  const isVideo = item.media_type === 2
  const thumb = item.image_versions2?.candidates?.[0]?.url || item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url
  return {
    id: String(item.pk || item.id || '').split('_')[0],
    shortcode,
    url: `https://www.instagram.com/${item.product_type === 'clips' ? 'reel' : 'p'}/${shortcode}/`,
    takenAt: dateFromUnix(item.taken_at),
    mediaType: mediaTypeFromMobile(item),
    likes: hidden || likeCount < 0 ? null : likeCount,
    comments: num(item.comment_count),
    views: isVideo ? num(item.play_count ?? item.ig_play_count ?? item.view_count, 0) || null : null,
    caption,
    thumbnail: str(thumb),
    owner: str(item.user?.username || item.owner?.username).toLowerCase(),
    ownerIsPrivate: !!item.user?.is_private,
    hashtags: extractHashtags(caption),
    mentions: extractMentions(caption),
  }
}

/** Accepts either shape and dispatches. */
function normalizePost(raw, ownerUsername) {
  if (raw && (raw.code !== undefined || raw.media_type !== undefined || raw.taken_at !== undefined)) return normalizePostFromMobile(raw)
  return normalizePostFromWeb(raw, ownerUsername)
}

/* ── Followers ───────────────────────────────────────────────────────────── */

function normalizeFollower(u) {
  const pic = str(u.profile_pic_url)
  const hasAnonymousPic = u.has_anonymous_profile_picture === true || (!!pic && pic.includes(ANON_PIC_MARKER)) || !pic
  return {
    username: str(u.username).toLowerCase(),
    fullName: str(u.full_name).trim(),
    isPrivate: !!u.is_private,
    isVerified: !!u.is_verified,
    hasAnonymousPic,
  }
}

/* ── Comments ────────────────────────────────────────────────────────────── */

function normalizeComment(c, shortcode) {
  return {
    shortcode,
    username: str(c.user?.username).toLowerCase(),
    text: str(c.text).slice(0, 280),
    createdAt: dateFromUnix(c.created_at ?? c.created_at_utc),
    likes: num(c.comment_like_count),
  }
}

module.exports = {
  normalizeProfile, normalizePost, normalizePostFromWeb, normalizePostFromMobile,
  normalizeFollower, normalizeComment, extractHashtags, extractMentions, ANON_PIC_MARKER,
}
