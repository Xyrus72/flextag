'use strict'
/**
 * In-process scheduler for Instagram maintenance work. No cron dependency;
 * every job is batch-limited, never overlaps itself, and goes through the
 * throttled client, so the session is never hammered. Set IG_JOBS=off to
 * disable (e.g. in tests).
 */
const Post = require('../models/Post')
const User = require('../models/User')
const client = require('../services/instagram/client')
const { runAudit } = require('../services/instagram/audit')
const { retentionCheck } = require('../services/instagram/postCheck')
const { getIgSettings } = require('../utils/settings')

const DAY = 86_400_000
const HOUR = 3_600_000
const timers = []
const FATAL = new Set(['NO_SESSION', 'SESSION_INVALID', 'RATE_LIMITED'])
const running = { retention: false, reaudit: false }

/** Posts whose retention deadline passed: confirm they are still live. */
async function runRetentionChecks({ limit = 20 } = {}) {
  if (running.retention) return { skipped: 'already running' }
  running.retention = true
  try {
    const due = await Post.find({ status: 'approved', 'retention.status': 'pending', 'retention.checkAt': { $lte: new Date() } })
      .sort({ 'retention.checkAt': 1 }).limit(limit)
    let checked = 0
    for (const post of due) {
      try { await retentionCheck(post); checked++ } catch (err) {
        console.warn(`[instagram jobs] retention check failed for ${post._id}: ${err.code || ''} ${err.message}`)
        if (FATAL.has(err.code)) break
      }
    }
    return { due: due.length, checked }
  } finally {
    running.retention = false
  }
}

/** Creators whose audit is older than the TTL (or never audited): refresh. */
async function runStaleReaudits({ limit = 25 } = {}) {
  if (!client.getSession()) return { skipped: 'no session' }
  if (running.reaudit) return { skipped: 'already running' }
  running.reaudit = true
  try {
    const s = await getIgSettings()
    const cutoff = new Date(Date.now() - s.auditTtlDays * DAY)
    const users = await User.find({
      role: 'creator',
      instagramHandle: { $regex: /^@?[a-z0-9._]{1,30}$/i },   // skip un-normalisable legacy handles
      $or: [{ igAuditedAt: null }, { igAuditedAt: { $lt: cutoff } }],
    }).sort({ igAuditedAt: 1 }).limit(limit).select('_id instagramHandle')
    let audited = 0
    for (const u of users) {
      try {
        await runAudit(u.instagramHandle, { depth: 'full', force: true, maxAgeMs: 0, userId: u._id, settings: s })
        audited++
      } catch (err) {
        console.warn(`[instagram jobs] re-audit @${u.instagramHandle} failed: ${err.code || ''} ${err.message}`)
        if (FATAL.has(err.code)) break
        // Stamp the attempt so a permanently failing account rotates to the back of the queue.
        await User.findByIdAndUpdate(u._id, { $set: { igAuditedAt: new Date(), ...(err.code === 'NOT_FOUND' ? { igPrecheck: 'failed' } : {}) } }).catch(() => {})
      }
    }
    return { candidates: users.length, audited }
  } finally {
    running.reaudit = false
  }
}

const log = (name) => (r) => r && console.log(`[instagram jobs] ${name}:`, JSON.stringify(r))
const warn = (name) => (e) => console.warn(`[instagram jobs] ${name} errored: ${e.message}`)

function start() {
  if (process.env.IG_JOBS === 'off' || process.env.NODE_ENV === 'test') return
  const t1 = setInterval(() => runRetentionChecks().then(log('retention')).catch(warn('retention')), HOUR)
  const t2 = setInterval(() => runStaleReaudits().then(log('re-audit')).catch(warn('re-audit')), DAY)
  const t3 = setTimeout(() => runRetentionChecks().then(log('retention')).catch(warn('retention')), 2 * 60_000)
  const t4 = setTimeout(() => runStaleReaudits().then(log('re-audit')).catch(warn('re-audit')), 10 * 60_000)
  for (const t of [t1, t2, t3, t4]) { t.unref?.(); timers.push(t) }
  console.log('[instagram jobs] scheduled: retention checks hourly, stale re-audits daily')
}

function stop() { for (const t of timers.splice(0)) clearTimeout(t) }

module.exports = { start, stop, runRetentionChecks, runStaleReaudits }
