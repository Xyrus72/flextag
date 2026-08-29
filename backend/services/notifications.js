'use strict'
/**
 * Create + deliver in-app notifications. Persists to Mongo and pushes over
 * Socket.IO to the recipient's personal room (`user_<id>`). Every helper is
 * fire-and-forget safe: notification failures must never break the action that
 * triggered them (a cashback release, an order update, ...).
 */
const Notification = require('../models/Notification')

/**
 * @param {string|ObjectId} userId
 * @param {{ type?: string, title: string, body?: string, link?: string, icon?: string, meta?: any }} payload
 * @returns {Promise<Notification|null>}
 */
async function notify(userId, payload) {
  if (!userId || !payload?.title) return null
  const doc = await Notification.create({ user: userId, ...payload })
  try {
    // Lazy require to avoid a load-order cycle with socket.js / index.js
    const { getIo } = require('../socket')
    const io = getIo && getIo()
    if (io) io.to(`user_${String(userId)}`).emit('notification', { notification: doc })
  } catch { /* socket optional — the DB row is the source of truth */ }
  return doc
}

/** Never throws — use inside money/order flows. */
function notifySafe(userId, payload) {
  notify(userId, payload).catch((err) => console.warn('[notify]', err.message))
}

module.exports = { notify, notifySafe }
