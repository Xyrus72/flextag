const express        = require('express')
const bcrypt         = require('bcryptjs')
const User           = require('../models/User')
const { generateOtp, verifyOtp, checkOtp } = require('../utils/otp')
const { sendOtpEmail }           = require('../utils/mailer')
const { requireAuth, requireRole } = require('../middleware/auth')
const { precheck: igPrecheck, auditUserInBackground } = require('../services/instagram/audit')
const { normalizeHandle, handleRegex } = require('../services/instagram/endpoints')
const { getIgSettings }          = require('../utils/settings')
const { createLimiter }          = require('../utils/rateLimit')
const { generateReferralCode, resolveReferrer } = require('../services/referrals')

// OTP endpoints are unauthenticated: cap them per IP so they can't be used to
// spam inboxes, brute-force codes, or drive Instagram lookups through the gate.
const otpSendLimiter   = createLimiter({ windowMs: 10 * 60_000, max: 5,  message: 'Too many verification codes requested — try again in a few minutes.' })
const otpVerifyLimiter = createLimiter({ windowMs: 10 * 60_000, max: 15, message: 'Too many attempts — request a new code in a few minutes.' })
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
router.post('/send-otp', otpSendLimiter, async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const code = await generateOtp(email)
    await sendOtpEmail(email, code)

    return res.json({ message: `Verification code sent to ${email}.` })
  } catch (err) {
    console.error('[send-otp]', err)
    return res.status(500).json({ message: 'Failed to send OTP. Please try again.' })
  }
})

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
// Step 2 of OTP registration: verify the OTP then create the account.
router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
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

    // ── Instagram gate for creators ──────────────────────────────────────
    // Runs BEFORE the OTP is consumed so a failed check doesn't burn the code,
    // but only for callers who already hold the CORRECT code (exact, non-consuming
    // check), so the endpoint can't be abused as a free Instagram lookup.
    let igHandle = ''
    let ig = null          // precheck result when Instagram was reachable
    if (role === 'creator') {
      igHandle = normalizeHandle(instagramHandle)
      if (!igHandle) {
        return res.status(400).json({ message: 'Your Instagram handle is required (letters, numbers, dots, underscores).' })
      }
      const pre = await checkOtp(email, otp)
      if (!pre.ok) return res.status(400).json({ message: pre.reason })
      if (await User.exists({ role: 'creator', instagramHandle: handleRegex(igHandle) })) {
        return res.status(409).json({ message: `@${igHandle} is already linked to another FlexTag account.` })
      }
      const igSettings = await getIgSettings()
      try {
        ig = await igPrecheck(igHandle, { settings: igSettings })
        if (igSettings.precheckEnforce && !ig.eligible) {
          return res.status(403).json({
            message: `@${igHandle} isn't eligible yet: ${ig.reasons.join('; ')}`,
            reasons: ig.reasons,
          })
        }
      } catch (err) {
        if (err.code === 'NOT_FOUND' && igSettings.precheckEnforce) {
          return res.status(403).json({ message: `We couldn't find @${igHandle} on Instagram. Check the spelling.`, reasons: ['Instagram account not found'] })
        }
        if (err.code === 'BAD_INPUT') {
          return res.status(400).json({ message: 'Enter a valid Instagram handle.' })
        }
        // Instagram unreachable / no session / rate-limited → allow signup, flag for a later audit.
        console.warn('[verify-otp] Instagram precheck unavailable:', err.code || '', err.message)
      }
    }

    // Verify the OTP (consumes it)
    const result = await verifyOtp(email, otp)
    if (!result.ok) {
      return res.status(400).json({ message: result.reason })
    }

    // Guard: email still unique (race-condition check)
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const hashed = await bcrypt.hash(password, 10)

    const referralCode = await generateReferralCode()
    const referredBy = await resolveReferrer(req.body.referralCode)
    const user = await User.create({
      name, email, password: hashed, phone, role,
      referralCode, referredBy,
      instagramHandle: role === 'creator' ? igHandle : normalizeHandle(instagramHandle),
      followersCount:  ig ? ig.followers : (Number(followersCount) || 0),
      tiktokHandle,
      companyName, website, productCategory,
      isVerified: true, // email confirmed via OTP
      igPrecheck: role !== 'creator' ? 'skipped' : ig ? (ig.eligible ? 'passed' : 'failed') : 'pending',
      igIsPrivate: ig ? ig.isPrivate : null,
    })

    // Full audit (posts, follower sample, health score) in the background
    if (user.role === 'creator') auditUserInBackground(user)

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
      instagramHandle: normalizeHandle(instagramHandle), followersCount, tiktokHandle,
      companyName, website, productCategory,
      igPrecheck: role === 'creator' ? 'pending' : 'skipped',
    })
    if (user.role === 'creator') auditUserInBackground(user)

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
