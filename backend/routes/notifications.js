const express = require('express')
const router  = express.Router()
const Notification = require('../models/Notification')
const User = require('../models/User')
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

// ── GET /api/notifications/prefs ─────────────────────────────────────────────
router.get('/prefs', requireAuth, async (req, res) => {
  const email = req.user.notificationPrefs?.email || {}
  res.json({ prefs: { transactional: email.transactional !== false, digest: email.digest !== false } })
})

// ── PUT /api/notifications/prefs  { transactional, digest } ──────────────────
router.put('/prefs', requireAuth, async (req, res) => {
  try {
    const set = {}
    if (req.body?.transactional !== undefined) set['notificationPrefs.email.transactional'] = !!req.body.transactional
    if (req.body?.digest !== undefined) set['notificationPrefs.email.digest'] = !!req.body.digest
    if (!Object.keys(set).length) return res.status(400).json({ message: 'Nothing to update.' })
    const user = await User.findByIdAndUpdate(req.user._id, { $set: set }, { new: true }).select('notificationPrefs')
    const email = user.notificationPrefs?.email || {}
    res.json({ prefs: { transactional: email.transactional !== false, digest: email.digest !== false }, message: 'Email preferences saved.' })
  } catch (err) {
    console.error('[notification prefs]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/notifications/unsubscribe?token=…&type=digest ───────────────────
// One click, no login: the link inside every email. Answers in HTML because a
// person clicked it in their inbox, not an app.
router.get('/unsubscribe', async (req, res) => {
  const { token, type } = req.query
  const page = (title, message) => `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title>
    <style>body{background:#050816;color:#fff;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;text-align:center}
    p{color:rgba(255,255,255,0.55)}a{color:#67e8f9}</style></head>
    <body><main><h1>${title}</h1><p>${message}</p><p><a href="${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}">Back to FlexTag</a></p></main></body></html>`
  try {
    if (!token) return res.status(400).type('html').send(page('Invalid link', 'This unsubscribe link is missing its token.'))
    const field = type === 'transactional' ? 'notificationPrefs.email.transactional' : 'notificationPrefs.email.digest'
    const user = await User.findOneAndUpdate({ unsubscribeToken: token }, { $set: { [field]: false } }, { new: true })
    if (!user) return res.status(404).type('html').send(page('Link expired', 'We could not match this link to an account.'))
    res.type('html').send(page('Unsubscribed',
      type === 'transactional'
        ? 'You will no longer get emails about cashback, payouts or disputes. They still appear in the app.'
        : 'You are off the daily digest. Money and dispute emails still come through.'))
  } catch (err) {
    console.error('[unsubscribe]', err)
    res.status(500).type('html').send(page('Something went wrong', 'Try the link again in a minute.'))
  }
})

module.exports = router
