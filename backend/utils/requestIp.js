'use strict'
/**
 * The caller's IP, as well as it can be known behind Render/Vercel proxies.
 * Express already resolves X-Forwarded-For into req.ip when `trust proxy` is on
 * (index.js sets it in production); the header fallback covers local dev and
 * any deploy where the setting is missed. IPv6-mapped IPv4 (::ffff:1.2.3.4) is
 * unwrapped so the same visitor doesn't look like two people.
 */
function clientIp(req) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
  const raw = req?.ip || forwarded || req?.socket?.remoteAddress || ''
  return String(raw).replace(/^::ffff:/, '')
}

module.exports = { clientIp }
