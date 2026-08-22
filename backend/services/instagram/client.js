'use strict'
/**
 * Instagram private-web-API client.
 *
 * - Auth: a DEDICATED throwaway account's cookies from env
 *   (IG_SESSIONID, IG_CSRFTOKEN, IG_DS_USER_ID). Never use a personal account —
 *   automated access violates Instagram's ToS and the account can be banned.
 * - One global throttled queue (min interval between requests, concurrency 1)
 *   so the session is never hammered, plus automatic back-off on 429.
 * - Typed errors (IgError.code) so routes can map failures to HTTP codes.
 * - Session health cache for GET /api/instagram/status.
 *
 * Everything else in services/instagram/ goes through request() below, which
 * makes it the single place to swap providers later (Apify, official Graph API).
 */

const WEB_ORIGIN = 'https://www.instagram.com'
const APP_ID = '936619743392459'
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const REQUEST_TIMEOUT_MS = 20_000
const SESSION_CHECK_TTL_MS = 10 * 60_000
const BACKOFF_START_MS = 60_000
const BACKOFF_MAX_MS = 15 * 60_000

class IgError extends Error {
  /**
   * @param {'NO_SESSION'|'SESSION_INVALID'|'NOT_FOUND'|'PRIVATE'|'RATE_LIMITED'|'UNAVAILABLE'|'BAD_RESPONSE'|'BAD_INPUT'} code
   */
  constructor(code, message, extra = {}) {
    super(message)
    this.name = 'IgError'
    this.code = code
    Object.assign(this, extra)
  }
}

const env = (name, fallback) => {
  const v = process.env[name]
  return v === undefined || v === null || String(v).trim() === '' ? fallback : String(v).trim()
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ── Session ──────────────────────────────────────────────────────────────── */

function getSession() {
  const sessionid = env('IG_SESSIONID', '')
  if (!sessionid) return null
  let dsUserId = env('IG_DS_USER_ID', '')
  if (!dsUserId) {
    // sessionid looks like "<ds_user_id>%3A<hash>%3A<n>%3A..." — the first segment is the user id
    const m = decodeURIComponent(sessionid).match(/^(\d+):/)
    if (m) dsUserId = m[1]
  }
  const csrftoken = env('IG_CSRFTOKEN', '') || 'missing'
  return { sessionid, csrftoken, dsUserId }
}

function cookieHeader(session) {
  if (!session) return ''
  const parts = [`sessionid=${session.sessionid}`, `csrftoken=${session.csrftoken}`]
  if (session.dsUserId) parts.push(`ds_user_id=${session.dsUserId}`)
  return parts.join('; ')
}

/* ── Throttled queue + runtime state ─────────────────────────────────────── */

const state = {
  chain: Promise.resolve(),
  lastRequestAt: 0,
  pending: 0,
  running: 0,
  throttledUntil: 0,
  backoffMs: BACKOFF_START_MS,
  recent: [], // timestamps of requests in the last hour
  lastError: null,
  session: { valid: null, checkedAt: null, username: null },
}

const intervalMs = () => Math.max(250, Number(env('IG_REQUEST_INTERVAL_MS', '1500')) || 1500)

const DEFAULT_MAX_WAIT_MS = 5_000 // never keep a caller hanging through a long 429 back-off

function schedule(task, maxWaitMs = DEFAULT_MAX_WAIT_MS) {
  state.pending++
  const run = async () => {
    state.pending--
    state.running++
    try {
      const now = Date.now()
      const throttleWait = state.throttledUntil - now
      if (throttleWait > maxWaitMs) {
        throw new IgError('RATE_LIMITED', 'Instagram rate limit in effect — try again shortly.', { retryAt: state.throttledUntil })
      }
      const wait = Math.max(0, state.lastRequestAt + intervalMs() - now, throttleWait)
      if (wait > 0) await sleep(wait)
      state.lastRequestAt = Date.now()
      return await task()
    } finally {
      state.running--
    }
  }
  const p = state.chain.then(run, run)
  state.chain = p.catch(() => {})
  return p
}

function noteRequest() {
  const now = Date.now()
  state.recent.push(now)
  const cutoff = now - 3_600_000
  while (state.recent.length && state.recent[0] < cutoff) state.recent.shift()
}

function markThrottled() {
  state.throttledUntil = Date.now() + state.backoffMs
  state.backoffMs = Math.min(BACKOFF_MAX_MS, state.backoffMs * 2)
}

function markHealthy() {
  state.backoffMs = BACKOFF_START_MS
}

/* ── Core request ─────────────────────────────────────────────────────────── */

function looksLikeLoginWall(text, contentType) {
  if (!/text\/html/i.test(contentType || '')) return false
  // Wall-specific markers only — the public embed page legitimately contains the
  // word "login" in links/config, so also require the absence of real content.
  const wall = /<title>[^<]*Log ?in[^<]*<\/title>|accounts\/login\/\?next=|LoginAndSignupPage/i.test(text)
  const hasContent = /class="[^"]*(UsernameText|Caption|EmbeddedMedia|EmbedIsBroken)/.test(text) || /"shortcode_media"|"edge_media_to_caption"/.test(text)
  return wall && !hasContent
}

/**
 * Perform a throttled request against Instagram.
 * @param {string} path   absolute URL or path on www.instagram.com
 * @param {object} [opts]
 * @param {'required'|'optional'|'none'} [opts.auth='required']
 * @param {'json'|'text'} [opts.as='json']
 * @param {Record<string,string>} [opts.params]
 * @param {Record<string,string>} [opts.headers]
 * @param {string} [opts.referer]
 * @param {number} [opts.retries=1]   retries for network / 5xx only
 */
async function request(path, opts = {}) {
  const { auth = 'required', as = 'json', params, headers = {}, referer, retries = 1, maxWaitMs = DEFAULT_MAX_WAIT_MS } = opts
  const session = getSession()
  if (auth === 'required' && !session) {
    throw new IgError('NO_SESSION', 'Instagram session is not configured (set IG_SESSIONID in backend/.env).')
  }
  const useSession = auth !== 'none' && !!session
  // A wall/denial on a deliberately anonymous request is not a session problem.
  const authFailCode = useSession ? 'SESSION_INVALID' : auth === 'none' ? 'UNAVAILABLE' : 'NO_SESSION'
  // Fail fast while a 429 back-off is in effect instead of parking the caller in the queue.
  if (state.throttledUntil - Date.now() > maxWaitMs) {
    throw new IgError('RATE_LIMITED', 'Instagram rate limit in effect — try again shortly.', { retryAt: state.throttledUntil })
  }

  const url = new URL(path.startsWith('http') ? path : WEB_ORIGIN + path)
  if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v))

  const h = {
    'user-agent': env('IG_USER_AGENT', DEFAULT_UA),
    accept: as === 'json' ? '*/*' : 'text/html,application/xhtml+xml,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'x-ig-app-id': APP_ID,
    'x-asbd-id': '129477',
    'x-ig-www-claim': '0',
    'x-requested-with': 'XMLHttpRequest',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    referer: referer || WEB_ORIGIN + '/',
    ...headers,
  }
  if (useSession) {
    h.cookie = cookieHeader(session)
    h['x-csrftoken'] = session.csrftoken
  }
  for (const k of Object.keys(h)) if (h[k] === undefined || h[k] === null) delete h[k]

  return schedule(async () => {
    let attempt = 0
    for (;;) {
      // (throttle re-checked inside schedule(); this loop only handles retries)
      attempt++
      noteRequest()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      let res, text
      try {
        res = await fetch(url, { method: 'GET', headers: h, redirect: 'manual', signal: controller.signal })
        text = await res.text()
      } catch (err) {
        clearTimeout(timer)
        if (attempt <= retries) { await sleep(2000); continue }
        state.lastError = `network: ${err.message}`
        throw new IgError('UNAVAILABLE', `Could not reach Instagram (${err.message}).`)
      }
      clearTimeout(timer)

      const ct = res.headers.get('content-type') || ''
      const status = res.status

      // Redirects (302 to /accounts/login/) mean the session is dead or the resource needs login.
      if (status >= 300 && status < 400) {
        const loc = res.headers.get('location') || ''
        if (/login|challenge|checkpoint/i.test(loc)) {
          if (useSession) state.session = { valid: false, checkedAt: Date.now(), username: null }
          state.lastError = `redirected to ${loc}`
          throw new IgError(authFailCode, 'Instagram requires login for this request.')
        }
        throw new IgError('BAD_RESPONSE', `Unexpected redirect to ${loc}`)
      }

      if (status === 429 || (status === 400 && /wait a few minutes/i.test(text))) {
        markThrottled()
        state.lastError = `rate limited (${status})`
        throw new IgError('RATE_LIMITED', 'Instagram rate limit hit — backing off.', { retryAt: state.throttledUntil })
      }
      if (status === 404) throw new IgError('NOT_FOUND', 'Not found on Instagram.')
      if (status === 401 || status === 403) {
        if (useSession) state.session = { valid: false, checkedAt: Date.now(), username: null }
        state.lastError = `auth failure (${status})`
        throw new IgError(authFailCode, useSession ? 'Instagram rejected the session (expired, challenged or banned).' : `Instagram refused the anonymous request (${status}).`)
      }
      if (status >= 500) {
        if (attempt <= retries) { await sleep(2000); continue }
        state.lastError = `instagram ${status}`
        throw new IgError('UNAVAILABLE', `Instagram responded ${status}.`)
      }
      if (looksLikeLoginWall(text, ct)) {
        if (useSession) state.session = { valid: false, checkedAt: Date.now(), username: null }
        state.lastError = 'login wall'
        throw new IgError(authFailCode, 'Instagram served a login wall.')
      }

      markHealthy()
      if (as === 'text') return text
      try {
        const json = JSON.parse(text)
        const msg = typeof json?.message === 'string' ? json.message : ''
        if (/login_required|checkpoint_required|challenge_required|feedback_required/i.test(msg)) {
          if (useSession) state.session = { valid: false, checkedAt: Date.now(), username: null }
          state.lastError = msg
          throw new IgError('SESSION_INVALID', `Instagram: ${msg}`)
        }
        return json
      } catch (err) {
        if (err instanceof IgError) throw err
        state.lastError = 'non-JSON response'
        throw new IgError('BAD_RESPONSE', 'Instagram returned a non-JSON response.')
      }
    }
  })
}

/* ── Session health ──────────────────────────────────────────────────────── */

async function checkSession({ force = false } = {}) {
  const session = getSession()
  if (!session) {
    state.session = { valid: null, checkedAt: Date.now(), username: null }
    return { configured: false, valid: null }
  }
  const fresh = state.session.checkedAt && Date.now() - state.session.checkedAt < SESSION_CHECK_TTL_MS
  if (fresh && !force) return { configured: true, valid: state.session.valid, username: state.session.username }
  try {
    // Validate against the session account's own feed: it accepts the web session +
    // web UA and isn't per-IP rate-limited like web_profile_info. (The app-style
    // /accounts/current_user/ endpoint rejects the web UA with "useragent mismatch".)
    const json = session.dsUserId
      ? await request(`/api/v1/feed/user/${session.dsUserId}/`, { params: { count: 1 } })
      : await request('/api/v1/users/web_profile_info/', { params: { username: 'instagram' } })
    const username = json?.user?.username || json?.data?.user?.username || state.session.username || null
    const valid = !!(json && (json.user || json.data?.user || json.status === 'ok' || Array.isArray(json.items) || Array.isArray(json.profile_grid_items)))
    state.session = { valid, checkedAt: Date.now(), username }
    return { configured: true, valid, username }
  } catch (err) {
    if (err instanceof IgError && (err.code === 'SESSION_INVALID' || err.code === 'NO_SESSION')) {
      state.session = { valid: false, checkedAt: Date.now(), username: null }
      return { configured: true, valid: false, error: err.message }
    }
    // Transient (rate limit, network, 5xx): keep the last known verdict, re-check next time.
    state.session.checkedAt = null
    return { configured: true, valid: state.session.valid, username: state.session.username, error: err.message, throttled: err.code === 'RATE_LIMITED' }
  }
}

function getStatus() {
  const cutoff = Date.now() - 3_600_000
  while (state.recent.length && state.recent[0] < cutoff) state.recent.shift()
  return {
    configured: !!getSession(),
    valid: state.session.valid,
    sessionUser: state.session.username,
    checkedAt: state.session.checkedAt ? new Date(state.session.checkedAt) : null,
    lastError: state.lastError,
    throttledUntil: state.throttledUntil > Date.now() ? new Date(state.throttledUntil) : null,
    queue: { pending: state.pending, running: state.running },
    requestsLastHour: state.recent.length,
    intervalMs: intervalMs(),
  }
}

/** Map an IgError (or anything) to an HTTP status + message for route handlers. */
function httpFor(err) {
  if (!(err instanceof IgError)) return { status: 500, message: 'Instagram service error.' }
  switch (err.code) {
    case 'NOT_FOUND': return { status: 404, message: 'Instagram account or post not found.' }
    case 'PRIVATE': return { status: 422, message: 'This Instagram account is private.' }
    case 'BAD_INPUT': return { status: 400, message: err.message }
    case 'NO_SESSION': return { status: 503, message: 'Instagram session is not configured. Add IG_SESSIONID to backend/.env.' }
    case 'SESSION_INVALID': return { status: 503, message: 'Instagram session expired or was challenged. Refresh IG_SESSIONID in backend/.env.' }
    case 'RATE_LIMITED': return { status: 429, message: 'Instagram rate limit hit. Try again in a few minutes.' }
    default: return { status: 502, message: err.message || 'Instagram is unavailable right now.' }
  }
}

module.exports = { request, checkSession, getStatus, getSession, httpFor, IgError, WEB_ORIGIN }
