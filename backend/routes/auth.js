const express  = require('express')
const bcrypt    = require('bcryptjs')
const User      = require('../models/User')
const router    = express.Router()

// ─── Helper: strip password before sending ─────────────────────────────────
const safeUser = (u) => {
  const obj = u.toObject()
  delete obj.password
  return obj
}

// ─── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, phone, role,
      instagramHandle, followersCount, tiktokHandle,
      companyName, website, productCategory,
    } = req.body

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password and role are required.' })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await User.create({
      name, email, password: hashed, phone, role,
      instagramHandle, followersCount, tiktokHandle,
      companyName, website, productCategory,
    })

    // Save to session
    req.session.userId = user._id.toString()
    req.session.role   = user.role

    return res.status(201).json({ message: 'Account created successfully.', user: safeUser(user) })
  } catch (err) {
    console.error('[register]', err)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    // Save to session
    req.session.userId = user._id.toString()
    req.session.role   = user.role

    return res.json({ message: 'Login successful.', user: safeUser(user) })
  } catch (err) {
    console.error('[login]', err)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed.' })
    res.clearCookie('connect.sid')
    return res.json({ message: 'Logged out successfully.' })
  })
})

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated.' })
    }
    const user = await User.findById(req.session.userId)
    if (!user) {
      req.session.destroy()
      return res.status(401).json({ message: 'User not found.' })
    }
    return res.json({ user: safeUser(user) })
  } catch (err) {
    console.error('[me]', err)
    return res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
