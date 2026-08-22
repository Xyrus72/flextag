// ─────────────────────────────────────────────────────────────────
// otp_store.js — How the OTP is stored and checked in memory
// Run this file with:  node otp_store.js
// ─────────────────────────────────────────────────────────────────

// ── STEP 1: Create a "noticeboard" (Map) to store OTPs ───────────
//
// A Map is like a dictionary:
//   Key   = email address
//   Value = { code, expiresAt }
//
const store = new Map()

// ── STEP 2: Generate and save an OTP ─────────────────────────────
//
// Math.random()         → gives a random decimal, e.g. 0.748291
// * 900000              → scale it up,           e.g. 673461.9
// + 100000              → make it 6 digits min,  e.g. 773461.9
// Math.floor(...)       → remove decimals,        e.g. 773461
// String(...)           → turn it into text,      e.g. "773461"
//
function generateOtp(email) {
  const code      = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

  // Save it on the noticeboard
  store.set(email, { code, expiresAt })

  console.log(`✅ OTP generated for ${email}: ${code}`)
  console.log(`   Expires at: ${expiresAt.toLocaleTimeString()}`)
  return code
}

// ── STEP 3: Verify a submitted OTP ───────────────────────────────
function verifyOtp(email, submittedCode) {
  // 1. Look up this email on the noticeboard
  const entry = store.get(email)

  // 2. Is there even an OTP for this email?
  if (!entry) {
    return '❌ Error: No OTP was sent to this email.'
  }

  // 3. Has the OTP expired?
  if (Date.now() > entry.expiresAt.getTime()) {
    store.delete(email) // clean up expired entry
    return '❌ Error: OTP has expired. Please request a new one.'
  }

  // 4. Does the submitted code match what we stored?
  if (entry.code !== submittedCode) {
    return '❌ Error: Wrong OTP. Please check and try again.'
  }

  // 5. ✅ All checks passed!
  store.delete(email) // one-time use — delete it now
  return '✅ Success! OTP is valid. Account can be created.'
}

// ── DEMO: Watch it in action ──────────────────────────────────────
console.log('\n━━━ OTP Store Demo ━━━\n')

// Generate an OTP
const myEmail = 'student@example.com'
const myCode  = generateOtp(myEmail)

console.log('\n--- Testing wrong code ---')
console.log(verifyOtp(myEmail, '000000'))       // wrong code

console.log('\n--- Testing correct code ---')
// Re-generate since the previous try didn't consume it (it was wrong)
generateOtp(myEmail)
console.log(verifyOtp(myEmail, myCode))          // correct!

console.log('\n--- Testing same code again (should fail — one-time use) ---')
console.log(verifyOtp(myEmail, myCode))          // already deleted!
