// ─── In-memory OTP store ──────────────────────────────────────────────────────
// Each entry: { code: '123456', expiresAt: Date }
// Keyed by lowercased email address.
// For multi-server deployments, swap this Map for a Redis/Mongo-backed store.

const store = new Map()

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Generate a random 6-digit OTP, persist it, and return the code.
 * Calling this again for the same email replaces any existing OTP.
 * @param {string} email
 * @returns {string} 6-digit code
 */
function generateOtp(email) {
  const code      = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + OTP_TTL_MS)
  store.set(email.toLowerCase(), { code, expiresAt })
  return code
}

/**
 * Verify a submitted OTP against the stored one.
 * Deletes the entry on success (one-time use).
 * @param {string} email
 * @param {string} submittedCode
 * @returns {{ ok: boolean, reason?: string }}
 */
function verifyOtp(email, submittedCode) {
  const key   = email.toLowerCase()
  const entry = store.get(key)

  if (!entry) {
    return { ok: false, reason: 'No OTP was requested for this email.' }
  }

  if (Date.now() > entry.expiresAt.getTime()) {
    store.delete(key)
    return { ok: false, reason: 'OTP has expired. Please request a new one.' }
  }

  if (entry.code !== String(submittedCode).trim()) {
    return { ok: false, reason: 'Invalid OTP. Please check and try again.' }
  }

  store.delete(key) // consumed — cannot be reused
  return { ok: true }
}

module.exports = { generateOtp, verifyOtp }
