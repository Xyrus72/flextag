// ─────────────────────────────────────────────────────────────────
// send_email.js — How an OTP email is sent using Nodemailer
//
// ⚠️  To actually RUN this file you need:
//     1. npm install nodemailer   (in this folder)
//     2. A Gmail App Password
//
// But you can READ it without running it — all concepts are explained below.
// ─────────────────────────────────────────────────────────────────

// nodemailer is a helper library that handles talking to Gmail servers for us
// Think of it as a "mail delivery person" in your code
const nodemailer = require('nodemailer')

// ── STEP 1: Set up the "post office" (transporter) ───────────────
//
// We tell nodemailer:
//   - Which mail service to use (Gmail)
//   - What Gmail account to send from (our app's email)
//   - The App Password for that Gmail account
//
// An App Password is a special 16-character password that Google gives you
// so apps can send emails on your behalf — WITHOUT using your real password.
//
const transporter = nodemailer.createTransport({
  service: 'gmail',        // Use Gmail's mail servers
  auth: {
    user: 'yourapp@gmail.com',       // The Gmail that SENDS the email
    pass: 'abcdefghijklmnop',        // The 16-char App Password from Google
  },
})

// ── STEP 2: Write and send the email ─────────────────────────────
//
// transporter.sendMail() takes an object describing the email:
//   from    = who is sending it
//   to      = who should receive it
//   subject = the email subject line
//   html    = the email body (can use HTML for nice formatting)
//
async function sendOtpEmail(toEmail, otpCode) {
  const emailContent = {
    from:    '"MyApp" <yourapp@gmail.com>',   // Sender name + address
    to:      toEmail,                          // Recipient
    subject: `${otpCode} is your verification code`,
    html: `
      <h2>Your verification code</h2>
      <p>Enter this code to verify your email:</p>
      <h1 style="letter-spacing: 10px; color: purple;">${otpCode}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
  }

  // .sendMail() is async — it actually contacts Gmail servers and delivers the email
  // We await it because it takes a second to complete (network request)
  await transporter.sendMail(emailContent)

  console.log(`📧 Email sent to ${toEmail} with code ${otpCode}`)
}

// ── What happens behind the scenes ───────────────────────────────
//
// When sendOtpEmail() is called:
//
//   Your server
//      ↓  (connects to Gmail's SMTP server on port 587)
//   Gmail servers
//      ↓  (Gmail routes the email)
//   Recipient's inbox
//
// SMTP = Simple Mail Transfer Protocol
// It's the "language" computers use to send emails to each other.
// Nodemailer handles all of this for you — you just call sendMail()!

// ── DEMO (won't actually send without real credentials) ──────────
console.log('\n━━━ Email Sender Demo ━━━\n')
console.log('To actually send a test email:')
console.log('1. Replace yourapp@gmail.com with your real Gmail')
console.log('2. Replace abcdefghijklmnop with your App Password')
console.log('3. Run:  node send_email.js')
console.log('\nThe sendOtpEmail function will:')
console.log('  → Connect to Gmail servers')
console.log('  → Deliver the email with the OTP')
console.log('  → Return when delivery is confirmed\n')
