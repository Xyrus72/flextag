import api from './api'

/**
 * Instagram intelligence API — see backend/routes/instagram.js.
 * All errors follow the backend `{ message }` convention (read err.response?.data?.message).
 */

/** Admin: session health + effective settings. → { configured, valid, sessionUser, checkedAt, lastError, throttledUntil, queue, requestsLastHour, settings } */
export const getInstagramStatus = () => api.get('/api/instagram/status').then(r => r.data)

/**
 * Public (rate-limited): cheap eligibility check used during registration.
 * → { ok:true, username, exists, isPrivate, isVerified, followers, following, posts, profilePicUrl, fullName, eligible, reasons, minFollowers, cached }
 *   or { ok:false, reason:'unavailable'|'not_found', message }
 */
export const precheckInstagram = (username) => api.post('/api/instagram/precheck', { username }, { timeout: 45000 }).then(r => r.data)

/**
 * Run (or refresh) a full audit. Creators may only audit their own handle; brand/admin any.
 * body { username?, force?, depth?: 'basic'|'full' } → { audit, cached, refreshAfter }
 * `cached` is true when the server returned an existing audit instead of fetching
 * (creators can force a refresh at most once per hour; `refreshAfter` says when).
 */
export const runInstagramAudit = (data = {}) => api.post('/api/instagram/audit', data, { timeout: 90000 }).then(r => r.data)

/** Creator: own latest audit → { audit } (404 if none yet). */
export const getMyInstagramAudit = () => api.get('/api/instagram/audit/me').then(r => r.data)

/** Cached audit for a username (no fetch) → { audit } (404 if none). */
export const getInstagramAudit = (username) => api.get(`/api/instagram/audit/${encodeURIComponent(username)}`).then(r => r.data)

/** Admin: latest audits → { audits:[...] } */
export const listInstagramAudits = (params = {}) => api.get('/api/instagram/audits', { params }).then(r => r.data)

/**
 * Verify a submitted post against its campaign rules
 * → { post, verification, autoApproved, pendingReason: null|'checks'|'identity'|'manual'|'state' }
 * ('identity' = content passed but the creator hasn't proven ownership of the handle yet)
 */
// 90 s: provider call (30 s) + session fallback (20 s + retry) + throttle wait can legitimately approach 75 s
export const verifyInstagramPost = (postId) => api.post('/api/instagram/verify-post', { postId }, { timeout: 90000 }).then(r => r.data)

/** Creator: get (or reuse) the bio code that proves ownership → { verified, handle, code, instructions, expiresInDays } */
export const startIdentityVerification = () => api.post('/api/instagram/verify-identity/start').then(r => r.data)

/** Creator: confirm the code is in the bio → { verified, handle, message, code? } */
export const checkIdentityVerification = () => api.post('/api/instagram/verify-identity/check', {}, { timeout: 45000 }).then(r => r.data)

// ── Connect Instagram (OAuth) ────────────────────────────────────────────────

/** → { available, connected, username, connectedAt, expiresAt, expired } */
export const getConnectStatus = () => api.get('/api/instagram/connect/status').then(r => r.data)

/** → { url } — send the browser there; Facebook redirects back to the API callback. */
export const startInstagramConnect = () => api.post('/api/instagram/connect/start').then(r => r.data)

export const disconnectInstagram = () => api.post('/api/instagram/connect/disconnect').then(r => r.data)

/** Live stories (24h window, connected accounts only) → { stories, count } */
export const getMyStories = () => api.get('/api/instagram/stories/me').then(r => r.data)

/** Capture proof that a story was live → { verified, needsReview, reach, postedAt, message } */
export const verifyInstagramStory = (postId) =>
  api.post('/api/instagram/verify-story', { postId }, { timeout: 45000 }).then(r => r.data)

// ── Auto-detected posts ──────────────────────────────────────────────────────
// FlexTag spots new Instagram posts on its own (webhook / polling) and offers
// them back as one-tap submissions.

/** → { detected: [...] } — status: 'new' | 'submitted' | 'auto_submitted' | 'dismissed' | 'all' */
export const getDetectedPosts = (status = 'new') =>
  api.get('/api/instagram/detected', { params: { status } }).then(r => r.data)

/** One tap: file the spotted post against its matched order and start verification. */
export const submitDetectedPost = (id) =>
  api.post(`/api/instagram/detected/${id}/submit`).then(r => r.data)

export const dismissDetectedPost = (id) =>
  api.post(`/api/instagram/detected/${id}/dismiss`).then(r => r.data)
