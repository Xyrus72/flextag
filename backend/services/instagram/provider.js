'use strict'
/**
 * Picks the Instagram data provider.
 *   IG_PROVIDER=hiker    → HikerAPI (needs HIKERAPI_KEY)
 *   IG_PROVIDER=session  → throwaway-account cookie session (needs IG_SESSIONID …)
 *   IG_PROVIDER=auto     → HikerAPI when a key is present, else the session (default)
 *
 * `withFallback()` retries a call on the other provider when the primary is
 * unavailable (bad key / credits / rate limit / no session), so a misconfigured
 * or exhausted provider degrades instead of failing outright.
 */
const hiker = require('./providers/hiker')
const session = require('./providers/session')
const { IgError } = require('./client')

const FALLBACK_CODES = new Set(['NO_SESSION', 'SESSION_INVALID', 'RATE_LIMITED', 'UNAVAILABLE', 'BAD_RESPONSE'])

function getProvider() {
  const pref = String(process.env.IG_PROVIDER || 'auto').trim().toLowerCase()
  if (pref === 'hiker') return hiker
  if (pref === 'session') return session
  return hiker.configured() ? hiker : session
}

function getFallbackProvider(primary) {
  const other = primary === hiker ? session : hiker
  return other.configured() ? other : null
}

/**
 * Run `fn(provider)` on the primary provider; on an infrastructure-class
 * IgError, retry once on the configured fallback. NOT_FOUND / BAD_INPUT are
 * never retried (they're answers, not outages).
 */
async function withFallback(fn) {
  const primary = getProvider()
  try {
    return await fn(primary)
  } catch (err) {
    const fallback = getFallbackProvider(primary)
    if (fallback && err instanceof IgError && FALLBACK_CODES.has(err.code)) {
      console.warn(`[instagram] ${primary.name} failed (${err.code}) — falling back to ${fallback.name}`)
      return fn(fallback)
    }
    throw err
  }
}

/** True when at least one provider can serve live data. */
const anyConfigured = () => hiker.configured() || session.configured()

module.exports = { getProvider, getFallbackProvider, withFallback, anyConfigured, providers: { hiker, session } }
