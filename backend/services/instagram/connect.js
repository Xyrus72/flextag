'use strict'
/**
 * "Connect Instagram" — per-creator OAuth (Facebook Login for Business).
 *
 * Scraping proves nothing about ownership and breaks on rate limits; a bio code
 * proves ownership once. A creator-authorised token proves ownership
 * continuously AND unlocks what scraping cannot see: reach/impressions, and
 * STORIES — which vanish in 24h and are otherwise unverifiable.
 *
 * Setup (Meta app, Instagram Graph API product):
 *   IG_APP_ID / IG_APP_SECRET   the Facebook app
 *   IG_OAUTH_REDIRECT           <BACKEND_URL>/api/instagram/connect/callback,
 *                               listed as a Valid OAuth Redirect URI
 *
 * Everything degrades: with no app configured the endpoints return 503 and the
 * bio-code path stays the way creators verify.
 */
const { IgError } = require('./client')

const VERSION = process.env.IG_GRAPH_VERSION || 'v21.0'
const APP_ID = () => process.env.IG_APP_ID || ''
const APP_SECRET = () => process.env.IG_APP_SECRET || ''
const REDIRECT = () => process.env.IG_OAUTH_REDIRECT || `${(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 1643}`).replace(/\/$/, '')}/api/instagram/connect/callback`

const configured = () => !!(APP_ID() && APP_SECRET())

// instagram_basic: profile + media · manage_insights: reach/impressions + stories
// pages_show_list / business_management: find the IG account behind their Page.
const SCOPES = ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'business_management']

function authUrl(state) {
  if (!configured()) throw new IgError('NO_SESSION', 'Instagram connect is not configured (IG_APP_ID / IG_APP_SECRET).')
  const url = new URL(`https://www.facebook.com/${VERSION}/dialog/oauth`)
  url.searchParams.set('client_id', APP_ID())
  url.searchParams.set('redirect_uri', REDIRECT())
  url.searchParams.set('scope', SCOPES.join(','))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  return url.toString()
}

async function graphGet(path, params = {}) {
  const url = new URL(`https://graph.facebook.com/${VERSION}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  let res, json
  try {
    res = await fetch(url)
    json = await res.json()
  } catch (err) {
    throw new IgError('UNAVAILABLE', `Could not reach Facebook (${err.message}).`)
  }
  if (json?.error) {
    const msg = json.error.message || 'Graph API error'
    const code = json.error.code
    if (code === 190 || code === 102) throw new IgError('SESSION_INVALID', 'That Instagram connection expired — reconnect to continue.')
    if (code === 4 || code === 17 || code === 32) throw new IgError('RATE_LIMITED', 'Instagram is rate-limiting us — try again shortly.')
    throw new IgError('UNAVAILABLE', msg)
  }
  return json
}

/** code -> long-lived user token (~60 days). */
async function exchangeCode(code) {
  const short = await graphGet('oauth/access_token', {
    client_id: APP_ID(), client_secret: APP_SECRET(), redirect_uri: REDIRECT(), code,
  })
  if (!short.access_token) throw new IgError('UNAVAILABLE', 'Facebook did not return an access token.')
  const long = await graphGet('oauth/access_token', {
    grant_type: 'fb_exchange_token', client_id: APP_ID(), client_secret: APP_SECRET(), fb_exchange_token: short.access_token,
  })
  const token = long.access_token || short.access_token
  const expiresIn = Number(long.expires_in || short.expires_in || 0)
  return { token, expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null }
}

/** The Instagram professional account behind one of their Pages. */
async function resolveAccount(token) {
  const pages = await graphGet('me/accounts', {
    fields: 'name,instagram_business_account{id,username,name,followers_count,media_count,profile_picture_url}',
    access_token: token,
  })
  const page = (pages.data || []).find(p => p.instagram_business_account)
  if (!page) {
    throw new IgError('NOT_FOUND', 'No Instagram professional account is linked to your Facebook Page. In the Instagram app: Settings → Account type → switch to Business or Creator, then link a Page.')
  }
  const ig = page.instagram_business_account
  return {
    igUserId: String(ig.id),
    username: String(ig.username || '').toLowerCase(),
    fullName: ig.name || '',
    followers: Number(ig.followers_count) || 0,
    mediaCount: Number(ig.media_count) || 0,
    profilePicUrl: ig.profile_picture_url || '',
    pageName: page.name || '',
  }
}

/** Their own recent media — includes insights-grade counts the scrapers miss. */
async function fetchOwnMedia(igUserId, token, { limit = 25 } = {}) {
  const json = await graphGet(`${igUserId}/media`, {
    fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count,thumbnail_url,media_url',
    limit: Math.min(50, Math.max(1, limit)),
    access_token: token,
  })
  return json.data || []
}

/**
 * ACTIVE stories (they exist for 24h and are invisible to every scraper).
 * This is the whole reason story campaigns could not be verified before.
 */
async function fetchStories(igUserId, token) {
  const json = await graphGet(`${igUserId}/stories`, {
    fields: 'id,media_type,media_url,permalink,timestamp,thumbnail_url',
    access_token: token,
  })
  return json.data || []
}

/** Reach / impressions for one media item, when the account allows insights. */
async function fetchMediaInsights(mediaId, token) {
  try {
    const json = await graphGet(`${mediaId}/insights`, { metric: 'reach,impressions', access_token: token })
    return Object.fromEntries((json.data || []).map(m => [m.name, m.values?.[0]?.value ?? null]))
  } catch {
    return {}   // insights are permission- and account-dependent; never fatal
  }
}

module.exports = { configured, authUrl, exchangeCode, resolveAccount, fetchOwnMedia, fetchStories, fetchMediaInsights, SCOPES, REDIRECT }
