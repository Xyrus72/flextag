'use strict'
/**
 * Email delivery for notifications and digests.
 *
 * The in-app bell only works while someone is on the site; the moment that
 * matters most for a creator — "your cashback was released", "your payout was
 * sent" — happens when they are not. This mirrors selected in-app
 * notifications to email and sends a daily digest of anything they missed.
 *
 * Rules:
 *  - Money and dispute events are transactional (they can only be turned off
 *    explicitly); everything else rides the digest.
 *  - Nothing here can break the action that triggered it — every send is
 *    fire-and-forget with its own try/catch.
 *  - Every email carries a one-click unsubscribe that needs no login.
 */
const crypto = require('crypto')
const User = require('../models/User')
const Notification = require('../models/Notification')
const { sendMail, isMailConfigured, brandedEmail } = require('../utils/mailer')

const FRONTEND = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
const BACKEND  = (process.env.BACKEND_URL  || `http://localhost:${process.env.PORT || 1643}`).replace(/\/$/, '')

/** Notification types worth an email the moment they happen. */
const TRANSACTIONAL = new Set(['cashback', 'payout', 'dispute', 'post_verified'])

/** Stable per-user token so an unsubscribe link works without a session. */
async function unsubscribeToken(user) {
  if (user.unsubscribeToken) return user.unsubscribeToken
  const token = crypto.randomBytes(16).toString('hex')
  await User.updateOne({ _id: user._id }, { $set: { unsubscribeToken: token } }).catch(() => {})
  return token
}

const prefsAllow = (user, kind) => {
  const prefs = user.notificationPrefs?.email || {}
  if (kind === 'digest') return prefs.digest !== false
  return prefs.transactional !== false
}

/**
 * Mirror one in-app notification to email. Safe to call from the money path.
 * @param {any} userId
 * @param {{ type?:string, title:string, body?:string, link?:string, icon?:string }} payload
 */
async function emailNotification(userId, payload) {
  if (!isMailConfigured()) return false
  if (!TRANSACTIONAL.has(payload?.type)) return false
  const user = await User.findById(userId).select('name email notificationPrefs unsubscribeToken').lean()
  if (!user?.email || !prefsAllow(user, 'transactional')) return false

  const token = await unsubscribeToken(user)
  const html = brandedEmail({
    heading: `${payload.icon || '🔔'} ${payload.title}`,
    body: payload.body || '',
    ctaLabel: payload.link ? 'Open FlexTag' : '',
    ctaUrl: payload.link ? `${FRONTEND}${payload.link}` : '',
    footerNote: `You get these because they involve your money or an open dispute. <a href="${BACKEND}/api/notifications/unsubscribe?token=${token}&type=transactional" style="color:#a78bfa">Turn them off</a>.`,
  })
  await sendMail({ to: user.email, subject: `${payload.title} — FlexTag`, html, text: `${payload.title}\n\n${payload.body || ''}` })
  return true
}

/** Everything unread from the last `hours`, one email, for people who want it. */
async function sendDailyDigest({ hours = 24, limitUsers = 500 } = {}) {
  if (!isMailConfigured()) return { sent: 0, skipped: 'mail not configured' }
  const since = new Date(Date.now() - hours * 3_600_000)

  const rows = await Notification.aggregate([
    { $match: { read: false, createdAt: { $gte: since } } },
    { $group: { _id: '$user', items: { $push: { title: '$title', body: '$body', icon: '$icon', at: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limitUsers },
  ])

  let sent = 0
  for (const row of rows) {
    try {
      const user = await User.findById(row._id).select('name email notificationPrefs unsubscribeToken').lean()
      if (!user?.email || !prefsAllow(user, 'digest')) continue
      const token = await unsubscribeToken(user)
      const items = row.items.slice(0, 12)
      const list = items.map(i => `
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
          <span style="font-size:16px">${i.icon || '🔔'}</span>
          <strong style="color:#fff;font-size:14px"> ${escapeHtml(i.title)}</strong>
          ${i.body ? `<div style="color:rgba(255,255,255,0.55);font-size:13px;margin-top:3px">${escapeHtml(i.body)}</div>` : ''}
        </td></tr>`).join('')

      const html = brandedEmail({
        heading: `${row.count} update${row.count === 1 ? '' : 's'} on FlexTag`,
        body: 'Here is what happened while you were away.',
        rawHtml: `<table width="100%" cellpadding="0" cellspacing="0">${list}</table>`,
        ctaLabel: 'Open FlexTag',
        ctaUrl: `${FRONTEND}/`,
        footerNote: `You are getting the daily digest. <a href="${BACKEND}/api/notifications/unsubscribe?token=${token}&type=digest" style="color:#a78bfa">Unsubscribe</a>.`,
      })
      await sendMail({ to: user.email, subject: `${row.count} update${row.count === 1 ? '' : 's'} on FlexTag`, html })
      sent += 1
    } catch (err) {
      console.warn('[digest] failed for user:', err.message)
    }
  }
  return { sent, candidates: rows.length }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ))
}

module.exports = { emailNotification, sendDailyDigest, unsubscribeToken, TRANSACTIONAL }
