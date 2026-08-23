'use strict'
/**
 * OTP store — Mongo-backed (models/Otp.js), 10-minute TTL, single use.
 * All functions are async. A code is voided after MAX_ATTEMPTS wrong guesses.
 */
const crypto = require('crypto')
const Otp = require('../models/Otp')

const OTP_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

const key = (email) => String(email || '').trim().toLowerCase()

/** Create (or replace) the code for an email and return it. */
async function generateOtp(email) {
  const code = String(crypto.randomInt(100000, 1000000))   // 6 digits, crypto-strong
  await Otp.findOneAndUpdate(
    { email: key(email) },
    { $set: { code, attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_MS) } },
    { upsert: true, new: true },
  )
  return code
}

/** Non-consuming: is there a live code for this email? */
async function hasPendingOtp(email) {
  const entry = await Otp.findOne({ email: key(email) }).lean()
  return !!entry && Date.now() <= new Date(entry.expiresAt).getTime()
}

/**
 * Non-consuming EXACT check (same rules as verifyOtp, but the code stays valid).
 * Lets verify-otp run pre-creation work (e.g. the Instagram gate) only for
 * callers who already hold the right code.
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
async function checkOtp(email, submittedCode) {
  const entry = await Otp.findOne({ email: key(email) }).lean()
  if (!entry) return { ok: false, reason: 'No OTP was requested for this email.' }
  if (Date.now() > new Date(entry.expiresAt).getTime()) return { ok: false, reason: 'OTP has expired. Please request a new one.' }
  if (entry.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'Too many wrong attempts. Please request a new code.' }
  if (entry.code !== String(submittedCode || '').trim()) return { ok: false, reason: 'Invalid OTP. Please check and try again.' }
  return { ok: true }
}

/**
 * Consuming check: on success the code is deleted; on a wrong guess the
 * attempt counter is incremented.
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
async function verifyOtp(email, submittedCode) {
  const email_ = key(email)
  const entry = await Otp.findOne({ email: email_ })
  if (!entry) return { ok: false, reason: 'No OTP was requested for this email.' }
  if (Date.now() > entry.expiresAt.getTime()) { await entry.deleteOne(); return { ok: false, reason: 'OTP has expired. Please request a new one.' } }
  if (entry.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'Too many wrong attempts. Please request a new code.' }
  if (entry.code !== String(submittedCode || '').trim()) {
    await Otp.updateOne({ _id: entry._id }, { $inc: { attempts: 1 } })
    return { ok: false, reason: 'Invalid OTP. Please check and try again.' }
  }
  await entry.deleteOne()
  return { ok: true }
}

module.exports = { generateOtp, verifyOtp, hasPendingOtp, checkOtp, OTP_TTL_MS, MAX_ATTEMPTS }
