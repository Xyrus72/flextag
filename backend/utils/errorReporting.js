'use strict'
/**
 * Error tracking.
 *
 * A cashback platform fails silently in exactly the places that matter — a
 * payout provider changing a response shape, a Mongo write racing, a webhook
 * arriving twice — and `console.error` on a Render instance nobody is watching
 * is not monitoring. Sentry turns those into something a person sees.
 *
 * Entirely opt-in: with no SENTRY_DSN this module is a set of no-ops, so local
 * dev and CI never phone home. PII is off by default; the request bodies we
 * would send are money-shaped, so the scrubber below drops the fields that
 * could carry credentials.
 */
let Sentry = null
let enabled = false

const SCRUB = new Set([
  'password', 'newPassword', 'currentPassword', 'otp', 'token', 'access_token',
  'sessionid', 'igGraphToken', 'app_secret', 'client_secret', 'BKASH_PASSWORD',
])

function init() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    console.log('[errors] SENTRY_DSN not set — error tracking off (console only).')
    return null
  }
  try {
    Sentry = require('@sentry/node')
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.RENDER_GIT_COMMIT || process.env.SENTRY_RELEASE || undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE) || 0,
      sendDefaultPii: false,
      beforeSend(event) {
        // Never let a credential ride along in a report.
        const data = event.request?.data
        if (data && typeof data === 'object') {
          for (const key of Object.keys(data)) if (SCRUB.has(key)) data[key] = '[redacted]'
        }
        return event
      },
    })
    enabled = true
    console.log(`[errors] Sentry on (${process.env.NODE_ENV || 'development'}).`)
    return Sentry
  } catch (err) {
    console.warn('[errors] Sentry failed to initialise:', err.message)
    return null
  }
}

/** Report a caught error with context. Always logs; reports only when enabled. */
function captureError(err, context = {}) {
  console.error(`[error]${context.tag ? ` ${context.tag}` : ''}`, err?.message || err)
  if (!enabled || !Sentry) return
  try {
    Sentry.withScope((scope) => {
      for (const [k, v] of Object.entries(context)) {
        if (k === 'user') scope.setUser({ id: String(v) })
        else scope.setTag(k, String(v))
      }
      Sentry.captureException(err)
    })
  } catch { /* reporting must never throw into the caller */ }
}

/** Express error middleware — mounted before the JSON error handler. */
function errorHandler() {
  return (err, req, _res, next) => {
    captureError(err, { tag: 'express', route: `${req.method} ${req.path}`, ...(req.user?._id ? { user: req.user._id } : {}) })
    next(err)
  }
}

const isEnabled = () => enabled

module.exports = { init, captureError, errorHandler, isEnabled }
