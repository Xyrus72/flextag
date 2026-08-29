'use strict'
/**
 * Daily notification digest.
 *
 * Runs in-process like the Instagram jobs (no cron dependency): a light tick
 * every 15 minutes that fires once when the clock passes the configured hour,
 * and never twice in the same day even if the process restarts mid-window.
 *
 * DIGEST_HOUR    local hour to send, 0-23 (default 19 — evening in Dhaka)
 * DIGEST_OFF=1   disable entirely
 */
const { sendDailyDigest } = require('../services/email')
const { isMailConfigured } = require('../utils/mailer')

const TICK_MS = 15 * 60_000
let timer = null
let lastSentDay = null   // YYYY-M-D of the last run

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

async function tick() {
  try {
    const now = new Date()
    const hour = Math.min(23, Math.max(0, Number(process.env.DIGEST_HOUR) || 19))
    if (now.getHours() !== hour) return
    if (lastSentDay === dayKey(now)) return
    lastSentDay = dayKey(now)
    const result = await sendDailyDigest({ hours: 24 })
    console.log(`[digest] sent ${result.sent} of ${result.candidates ?? 0} candidates`)
  } catch (err) {
    console.warn('[digest] run failed:', err.message)
  }
}

function start() {
  if (process.env.DIGEST_OFF === '1') return
  if (!isMailConfigured()) {
    console.log('[digest] email not configured (EMAIL_USER / EMAIL_PASS) — daily digest off.')
    return
  }
  timer = setInterval(tick, TICK_MS)
  timer.unref?.()
  console.log(`[digest] daily digest armed for ${Number(process.env.DIGEST_HOUR) || 19}:00 server time`)
}

function stop() { if (timer) clearInterval(timer); timer = null }

module.exports = { start, stop, tick }
