const User = require('../models/User')

// ── Require an authenticated session ───────────────────────────────────────
const requireAuth = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Authentication required.' })
  }
  try {
    const user = await User.findById(req.session.userId).select('-password')
    if (!user) {
      req.session.destroy()
      return res.status(401).json({ message: 'User not found.' })
    }
    req.user = user
    next()
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' })
  }
}

// ── Require a specific role (or multiple roles) ────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' })
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied.' })
  }
  next()
}

module.exports = { requireAuth, requireRole }
