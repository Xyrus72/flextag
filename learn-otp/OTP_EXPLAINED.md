# 📬 OTP Flow — Line by Line (FlexTag)

> Everything that happens when a user clicks **"Send Verification Code"** and then enters the OTP.

---

## 🗺️ Big Picture

```
User fills form → clicks "Send Code"
       ↓
  POST /api/auth/send-otp
       ↓
  generateOtp(email)   ← creates + stores 6-digit code
       ↓
  sendOtpEmail(email, code)  ← fires off the email via Gmail
       ↓
  User gets email, types the code
       ↓
  POST /api/auth/verify-otp
       ↓
  verifyOtp(email, otp)  ← checks code is correct + not expired
       ↓
  User.create(...)  ← account is finally made
       ↓
  Session started → user is logged in ✅
```

---

## 📁 Files Involved

| File | What it does |
|------|-------------|
| `utils/otp.js` | Stores, generates, and verifies OTP codes |
| `utils/mailer.js` | Sends the styled email via Gmail (Nodemailer) |
| `routes/auth.js` | The two API routes: `/send-otp` and `/verify-otp` |
| `utils/settings.js` | Provides live admin-editable config (e.g. Instagram rules) |

---

## 🔐 `utils/otp.js` — The OTP Brain

```js
const store = new Map()
```
> 🧠 **The "noticeboard".**
> A `Map` is like a dictionary: key = email, value = `{ code, expiresAt }`.
> Lives in-memory — dies when the server restarts. Fine for single servers.
> For multi-server setups → replace with Redis.

```js
const OTP_TTL_MS = 10 * 60 * 1000  // 10 minutes
```
> ⏱️ **Time-to-live.**
> `10 * 60 * 1000` = 600,000 milliseconds = 10 minutes.
> After this, the code is dead.

---

### `generateOtp(email)` — Creates the code

```js
const code = String(Math.floor(100000 + Math.random() * 900000))
```
> 🎲 **Makes a random 6-digit code.**
> - `Math.random()` → random decimal, e.g. `0.748`
> - `* 900000` → `673200`
> - `+ 100000` → `773200` (guarantees 6 digits, never starts with 0)
> - `Math.floor()` → remove decimal → `773200`
> - `String()` → turn into text `"773200"` (so `=== "773200"` works later)

```js
const expiresAt = new Date(Date.now() + OTP_TTL_MS)
```
> 🕐 **Sets the expiry timestamp.**
> `Date.now()` = right now in ms. Add 10 minutes worth of ms → expiry time.

```js
store.set(email.toLowerCase(), { code, expiresAt })
```
> 💾 **Saves it on the noticeboard.**
> Key = lowercased email. Calling this again replaces the old OTP (no duplicates).

---

### `verifyOtp(email, submittedCode)` — Checks the code

```js
const entry = store.get(key)
if (!entry) return { ok: false, reason: 'No OTP was requested...' }
```
> ❌ **Guard 1:** Did we even send an OTP to this email?
> If not on the noticeboard → reject immediately.

```js
if (Date.now() > entry.expiresAt.getTime()) {
  store.delete(key)
  return { ok: false, reason: 'OTP has expired...' }
}
```
> ❌ **Guard 2:** Is it still fresh?
> `.getTime()` converts the Date object to ms number for comparison.
> If expired → delete the dead entry and tell the user.

```js
if (entry.code !== String(submittedCode).trim()) {
  return { ok: false, reason: 'Invalid OTP...' }
}
```
> ❌ **Guard 3:** Does the code actually match?
> `.trim()` removes accidental spaces the user might type.
> Notice: we do NOT delete on wrong guess — user can retry until expiry.

```js
store.delete(key)
return { ok: true }
```
> ✅ **All checks passed.**
> Code is deleted immediately — **one-time use only**.
> You cannot verify the same code twice.

---

### `hasPendingOtp(email)` — Non-consuming check

```js
function hasPendingOtp(email) {
  const entry = store.get(String(email || '').toLowerCase())
  return !!entry && Date.now() <= entry.expiresAt.getTime()
}
```
> 🔍 **Peeks at the noticeboard without burning the code.**
> Used in `/verify-otp` BEFORE the Instagram precheck runs.
> Why? So the Instagram API can't be abused as a free lookup tool —
> you must have actually requested an OTP first.
> `!!entry` → converts to `true/false`.

---

## 📧 `utils/mailer.js` — The Email Sender

```js
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})
```
> 📮 **The "post office".**
> `nodemailer.createTransport()` sets up a reusable connection to Gmail's SMTP servers.
> `EMAIL_USER` / `EMAIL_PASS` come from `.env` — never hardcoded.
> `EMAIL_PASS` = a **16-character App Password** from Google (not your real password).

```js
await transporter.sendMail({
  from:    `"FlexTag" <${process.env.EMAIL_USER}>`,
  to:      toEmail,
  subject: `${otpCode} is your FlexTag verification code`,
  html,
})
```
> 📨 **Actually sends the email.**
> - `from` → the sender name users see in their inbox
> - `to` → the new user's email
> - `subject` → putting the code in the subject means users see it without opening
> - `html` → the styled email body (purple FlexTag card design)
> - `await` → we wait for Gmail to confirm delivery before responding

---

## 🌐 `routes/auth.js` — The API Endpoints

### Route 1: `POST /api/auth/send-otp`

```js
const { email } = req.body
if (!email) return res.status(400).json({ message: 'Email is required.' })
```
> ✋ **Validate input first.**
> Never trust what comes from the browser.

```js
const existing = await User.findOne({ email: email.toLowerCase() })
if (existing) return res.status(409).json({ ... })
```
> 🚫 **Check email isn't taken.**
> No point sending an OTP if the account already exists.
> `409 Conflict` = the standard HTTP code for "already exists".

```js
const code = generateOtp(email)
await sendOtpEmail(email, code)
return res.json({ message: `Verification code sent to ${email}.` })
```
> ✅ **Generate + send.**
> `code` is returned by `generateOtp` but only passed to the email function.
> It is **never** sent back to the browser in the JSON response — that's the whole point!

---

### Route 2: `POST /api/auth/verify-otp`

```js
if (!hasPendingOtp(email)) {
  return res.status(400).json({ message: 'No OTP was requested for this email.' })
}
```
> 🔒 **Instagram gate protection.**
> Runs the Instagram precheck ONLY when a live OTP exists.
> Prevents this route from being used as a free Instagram account lookup.

```js
const igSettings = await getIgSettings()
ig = await igPrecheck(igHandle, { settings: igSettings })
if (igSettings.precheckEnforce && !ig.eligible) {
  return res.status(403).json({ ... })
}
```
> 📸 **Instagram eligibility check.**
> Pulls live admin settings (min followers, block private, etc.) from the DB.
> If the creator isn't eligible AND enforcement is on → reject BEFORE burning the OTP.

```js
const result = verifyOtp(email, otp)
if (!result.ok) return res.status(400).json({ message: result.reason })
```
> 🔑 **Now verify the OTP.**
> Only runs after all pre-checks pass. This is where the code is consumed.

```js
const hashed = await bcrypt.hash(password, 10)
const user = await User.create({ ..., isVerified: true })
```
> 🔒 **Hash password + create account.**
> `bcrypt.hash(password, 10)` → `10` = "salt rounds" (how hard to crack).
> `isVerified: true` because the OTP proved they own the email.

```js
req.session.userId = user._id.toString()
req.session.role   = user.role
```
> 🚪 **Log them in immediately.**
> Session is created right after account creation — no second login needed.

---

## ⚙️ `utils/settings.js` — Why It Matters for OTP

> The `settings.js` file powers the **Instagram gate** that runs inside `/verify-otp`.
> Without it, the OTP step would have no way to know the current admin-configured rules.

```js
const igSettings = await getIgSettings()
```

This one line (in `routes/auth.js`) fetches these values from the DB:

| Setting | Default | Effect on OTP flow |
|---------|---------|-------------------|
| `minFollowers` | 1000 | Creators below this are blocked at OTP verification |
| `blockPrivate` | true | Private IG accounts are blocked at OTP verification |
| `precheckEnforce` | true | If `false`, bad IG accounts get a **warning** but can still register |

```js
let cache = { at: 0, map: null }
const CACHE_MS = 30_000
```
> ⚡ **30-second cache.**
> Every OTP verification doesn't hammer the database.
> Settings are fetched fresh at most once every 30 seconds.

```js
async function getSettingsMap({ fresh = false } = {}) {
  if (!fresh && cache.map && Date.now() - cache.at < CACHE_MS) return cache.map
  // ...fetch from DB only if cache is stale
}
```
> If cache is still warm → return it instantly.
> If stale (or `fresh: true` forced) → hit the DB.

---

## 🔄 Complete Flow, One More Time

```
1.  User submits email
          ↓
2.  /send-otp checks email not taken
          ↓
3.  generateOtp() → random code + store in Map with 10-min expiry
          ↓
4.  sendOtpEmail() → Nodemailer → Gmail SMTP → user's inbox
          ↓
5.  User opens email, gets code, types it in
          ↓
6.  /verify-otp receives: email + code + full signup data
          ↓
7.  hasPendingOtp() → confirms OTP was actually requested
          ↓
8.  getIgSettings() → loads admin config (cached 30s)
          ↓
9.  igPrecheck() → checks creator's Instagram (if applicable)
          ↓
10. verifyOtp() → code correct + not expired → DELETE it
          ↓
11. bcrypt.hash(password) → secure the password
          ↓
12. User.create({ isVerified: true }) → account exists!
          ↓
13. Session started → user is logged in ✅
```

---

## ⚠️ Common Gotchas

| Problem | Why | Fix |
|---------|-----|-----|
| OTP not arriving | `EMAIL_USER`/`EMAIL_PASS` wrong in `.env` | Use Gmail App Password, not your real password |
| OTP expired | User took > 10 min | Click "resend" — `generateOtp()` replaces the old code |
| "No OTP found" on verify | Server restarted (Map cleared) | Use Redis for persistence across restarts |
| Same code used twice | `store.delete()` kills it on first success | Working as intended ✅ |
| Wrong code not rejected | `.trim()` + strict `!==` handles it | Already handled in `verifyOtp()` |
