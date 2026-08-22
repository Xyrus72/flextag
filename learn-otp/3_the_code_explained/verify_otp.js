// ─────────────────────────────────────────────────────────────────
// verify_otp.js — The complete OTP flow in one simple file
// Run this with:  node verify_otp.js
//
// This puts everything together — generate, store, and verify an OTP
// No libraries needed! Just plain Node.js.
// ─────────────────────────────────────────────────────────────────

// ── The OTP "noticeboard" ─────────────────────────────────────────
const store = new Map()
const TEN_MINUTES = 10 * 60 * 1000   // 10 min in milliseconds

// ── Helper: make a random 6-digit number ─────────────────────────
// Math.random() alone gives something like 0.384729...
// We multiply and floor it to get a clean integer between 100000-999999
function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// ── Step A: User requests an OTP ─────────────────────────────────
//
// This is what happens when user clicks "Send Verification Code"
//
function requestOtp(email) {
  const code      = makeCode()
  const expiresAt = Date.now() + TEN_MINUTES

  store.set(email, { code, expiresAt })

  // In the real app, this is where we email the code.
  // Here we just print it so you can see it.
  console.log(`\n📧 [SIMULATED EMAIL to ${email}]`)
  console.log(`   Subject: Your verification code`)
  console.log(`   Body: Your OTP is ──► ${code}`)
  console.log(`   (Expires in 10 minutes)\n`)

  return code  // In real app, we do NOT return this to the browser
}

// ── Step B: User submits the OTP ─────────────────────────────────
//
// This is what happens when user types the code and clicks "Verify"
//
function submitOtp(email, codeTheUserTyped) {
  // 1. Find the stored OTP for this email
  const saved = store.get(email)

  // 2. Did we ever send an OTP to this email?
  if (!saved) {
    return { success: false, message: 'No OTP found for this email.' }
  }

  // 3. Has the OTP expired?
  //    Date.now() gives current time in milliseconds
  //    If current time is past expiresAt, it's expired
  if (Date.now() > saved.expiresAt) {
    store.delete(email)   // Clean up the expired entry
    return { success: false, message: 'OTP has expired. Please request a new one.' }
  }

  // 4. Does what the user typed match what we stored?
  if (codeTheUserTyped !== saved.code) {
    return { success: false, message: `Wrong OTP. You typed: ${codeTheUserTyped}` }
  }

  // 5. All checks passed!
  store.delete(email)     // Delete it — can never be used again
  return { success: true, message: 'OTP verified! Creating your account now...' }
}

// ─────────────────────────────────────────────────────────────────
// 🎬 DEMO — Watch the whole flow
// ─────────────────────────────────────────────────────────────────
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('         OTP Verification Demo')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const userEmail = 'student@example.com'

// User requests an OTP
const correctCode = requestOtp(userEmail)

// ── Test 1: User types the WRONG code ────────────────────────────
console.log('Test 1: User types wrong code "000000"')
const result1 = submitOtp(userEmail, '000000')
console.log(result1.success ? '✅' : '❌', result1.message)

// ── Test 2: User types the CORRECT code ──────────────────────────
console.log('\nTest 2: User types the correct code')
const result2 = submitOtp(userEmail, correctCode)
console.log(result2.success ? '✅' : '❌', result2.message)

// ── Test 3: User tries to use the same code again ─────────────────
console.log('\nTest 3: User tries same code again (one-time use!)')
const result3 = submitOtp(userEmail, correctCode)
console.log(result3.success ? '✅' : '❌', result3.message)

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Notice: After a correct submission,')
console.log('the OTP is deleted and cannot be reused!')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
