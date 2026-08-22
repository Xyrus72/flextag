const express        = require('express')
const bcrypt         = require('bcryptjs')
const User           = require('../models/User')
const { generateOtp, verifyOtp } = require('../utils/otp')
const { sendOtpEmail }           = require('../utils/mailer')
const { requireAuth, requireRole } = require('../middleware/auth')
const router         = express.Router()

// ─── Helper: strip password before sending ─────────────────────────────────
const safeUser = (u) => {
  const obj = u.toObject()
  delete obj.password
  return obj
}

// ─── Roles a visitor may self-assign at signup ─────────────────────────────
// 'admin' is deliberately excluded — admins are created by an existing admin
// via /register, or offline with `node createAdmin.js`.
const SELF_SIGNUP_ROLES = ['creator', 'brand']

// ─── POST /api/auth/send-otp ─────────────────────────────────────────────────
// Step 1 of OTP registration: validate the email isn't taken, then send OTP.
// The full registration payload is NOT saved yet — it stays on the client.
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const code = generateOtp(email)
    await sendOtpEmail(email, code)

    return res.json({ message: `Verification code sent to ${email}.` })
  } catch (err) {
    console.error('[send-otp]', err)
    return res.status(500).json({ message: 'Failed to send OTP. Please try again.' })
  }
})

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
// Step 2 of OTP registration: verify the OTP then create the account.
router.post('/verify-otp', async (req, res) => {
  try {
    const {
      otp,
      name, email, password, phone, role,
      instagramHandle, followersCount, tiktokHandle,
      companyName, website, productCategory,
    } = req.body

    if (!otp || !email) {
      return res.status(400).json({ message: 'Email and OTP are required.' })
    }
    if (!name || !password || !role) {
      return res.status(400).json({ message: 'Name, password and role are required.' })
    }
    if (!SELF_SIGNUP_ROLES.includes(role)) {
      return res.status(403).json({ message: 'Invalid role. Choose creator or brand.' })
    }

    // Verify the OTP
    const result = verifyOtp(email, otp)
    if (!result.ok) {
      return res.status(400).json({ message: result.reason })
    }

    // Guard: email still unique (race-condition check)
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await User.create({
      name, email, password: hashed, phone, role,
      instagramHandle, followersCount, tiktokHandle,
      companyName, website, productCategory,
      isVerified: true, // email confirmed via OTP
    })

    // Start session
    req.session.userId = user._id.toString()
    req.session.role   = user.role

    return res.status(201).json({ message: 'Account created successfully.', user: safeUser(user) })
  } catch (err) {
    console.error('[verify-otp]', err)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Admin-only direct registration (bypasses OTP). Because it accepts an
// arbitrary `role`, it MUST stay behind an admin session — otherwise anyone
// could POST role:'admin' and grant themselves the admin panel.
// Public signup goes through /send-otp → /verify-otp instead.
router.post('/register', requireAuth, requireRole('admin'), async (req, res) => {
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

    // NOTE: no session is started here — the caller is an admin creating an
    // account for someone else, and must stay logged in as themselves.
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
