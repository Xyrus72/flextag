const express = require('express')
const router  = express.Router()
const Notification = require('../models/Notification')
const { requireAuth } = require('../middleware/auth')

// ── GET /api/notifications — current user's notifications + unread count ─────
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const [notifications, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ])
    res.json({ notifications, unread })
  } catch (err) {
    console.error('[notifications GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/notifications/read — mark all (or one via ?id=) as read ─────────
router.put('/read', requireAuth, async (req, res) => {
  try {
    const filter = { user: req.user._id, read: false }
    if (req.query.id) filter._id = req.query.id
    await Notification.updateMany(filter, { $set: { read: true } })
    const unread = await Notification.countDocuments({ user: req.user._id, read: false })
    res.json({ unread })
  } catch (err) {
    console.error('[notifications read]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
