'use strict'
/**
 * Cookie-session provider: Instagram's private web API through a throwaway
 * account's session (services/instagram/client.js + endpoints.js), with the
 * anonymous embed page as a fallback for single posts when no session exists.
 * Same interface as providers/hiker.js; returns FlexTag's normalized shapes.
 */
const client = require('../client')
const ep = require('../endpoints')
const nz = require('../normalize')

const configured = () => !!client.getSession()

/** Embed-page result → normalized Post (caption-less fields stay null → manual review). */
function embedToPost(e) {
  const caption = e.caption == null ? null : e.caption
  return {
    shortcode: e.shortcode, url: `https://www.instagram.com/p/${e.shortcode}/`, owner: (e.owner || '').toLowerCase(),
    ownerIsPrivate: !!e.isPrivate, takenAt: e.takenAt ? new Date(e.takenAt * 1000) : null,
    mediaType: e.mediaType ?? (e.isVideo ? 'video' : null), likes: e.likes, comments: null, views: null, caption,
    thumbnail: '', hashtags: caption == null ? null : nz.extractHashtags(caption), mentions: caption == null ? null : nz.extractMentions(caption),
    source: 'embed',
  }
}

async function getProfile(username) {
  const raw = await ep.fetchProfile(username)
  const profile = nz.normalizeProfile(raw)
  const seedPosts = (raw.edge_owner_to_timeline_media?.edges || []).map((e) => nz.normalizePostFromWeb(e.node, profile.username))
  return { profile, seedPosts }
}

async function getPosts(igUserId, { limit = 30 } = {}) {
  const items = await ep.fetchUserFeed(igUserId, { limit })
  return items.map(nz.normalizePostFromMobile)
}

async function getFollowers(igUserId, { limit = 200 } = {}) {
  const raw = await ep.fetchFollowersSample(igUserId, { limit })
  return raw.map(nz.normalizeFollower)
}

async function getPost(shortcode) {
  if (configured()) return { ...nz.normalizePostFromMobile(await ep.fetchPostByShortcode(shortcode)), source: 'session' }
  return embedToPost(await ep.fetchPostEmbed(shortcode))
}

async function getComments(mediaId, { limit = 20, shortcode = '' } = {}) {
  const raw = await ep.fetchComments(mediaId, { limit })
  return raw.map((c) => nz.normalizeComment(c, shortcode))
}

async function status({ force = false } = {}) {
  const s = await client.checkSession({ force })
  return { provider: 'session', ...client.getStatus(), valid: s.valid, sessionUser: s.username || null }
}

module.exports = { name: 'session', configured, getProfile, getPosts, getFollowers, getPost, getComments, status, embedToPost }
