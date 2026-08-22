'use strict'
/**
 * Tiny in-memory fixed-window rate limiter (no dependency; single-process).
 * Keyed by client IP unless `keyFn` is given (e.g. req => req.user._id).
 */
function createLimiter({ windowMs = 60_000, max = 10, keyFn = null, message = '' } = {}) {
  const buckets = new Map()
  return (req, res, next) => {
    const key = String((keyFn && keyFn(req)) || req.ip || req.socket?.remoteAddress || 'unknown')
    const now = Date.now()
    const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)))
      return res.status(429).json({ message: message || 'Too many requests — please wait and try again.' })
    }
    recent.push(now)
    buckets.set(key, recent)
    if (buckets.size > 10_000) buckets.clear()
    next()
  }
}

module.exports = { createLimiter }
