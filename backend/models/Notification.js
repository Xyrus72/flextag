const mongoose = require('mongoose')

/**
 * In-app notifications. Delivered live over Socket.IO (event 'notification' to
 * the user's personal room) and fetched via GET /api/notifications.
 */
const notificationSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:  { type: String, default: 'info' },   // post_verified | cashback | order | referral | system | ...
  title: { type: String, required: true },
  body:  { type: String, default: '' },
  link:  { type: String, default: '' },        // in-app route to open on click
  icon:  { type: String, default: '🔔' },
  read:  { type: Boolean, default: false, index: true },
  meta:  { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true })

notificationSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
