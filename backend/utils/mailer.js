const nodemailer = require('nodemailer')

// ─── Transporter ─────────────────────────────────────────────────────────────
// Uses Gmail with an App Password.
// To set up: Google Account → Security → 2-Step Verification → App Passwords
// Set EMAIL_USER and EMAIL_PASS in your .env file.

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

/**
 * Send a stylised OTP verification email.
 * @param {string} toEmail   Recipient email address
 * @param {string} otpCode   6-digit OTP string
 */
async function sendOtpEmail(toEmail, otpCode) {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Verify your FlexTag account</title>
  </head>
  <body style="margin:0;padding:0;background:#050816;font-family:'Inter',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#050816;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0"
            style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;max-width:520px;width:100%;">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:32px;text-align:center;">
                <div style="display:inline-flex;align-items:center;gap:10px;">
                  <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;font-style:italic;color:#fff;">F</div>
                  <span style="font-size:26px;font-weight:900;font-style:italic;color:#fff;letter-spacing:-0.03em;">FlexTag™</span>
                </div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 12px;letter-spacing:-0.02em;">
                  Verify your email address
                </h1>
                <p style="font-size:14px;color:rgba(255,255,255,0.5);margin:0 0 28px;line-height:1.7;">
                  Use the 6-digit code below to complete your FlexTag registration.
                  This code expires in <strong style="color:rgba(255,255,255,0.7);">10 minutes</strong>.
                </p>

                <!-- OTP Box -->
                <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.3);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;box-shadow:0 0 40px rgba(124,58,237,0.1);">
                  <p style="font-size:11px;font-weight:700;color:rgba(167,139,250,0.7);letter-spacing:0.2em;text-transform:uppercase;margin:0 0 14px;">Your verification code</p>
                  <span style="font-size:44px;font-weight:900;color:#fff;letter-spacing:0.18em;font-variant-numeric:tabular-nums;">${otpCode}</span>
                </div>

                <p style="font-size:13px;color:rgba(255,255,255,0.3);margin:0;line-height:1.7;">
                  If you didn't create a FlexTag account, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="border-top:1px solid rgba(255,255,255,0.06);padding:20px 40px;text-align:center;">
                <p style="font-size:12px;color:rgba(255,255,255,0.2);margin:0;">
                  © ${new Date().getFullYear()} FlexTag. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `

  await transporter.sendMail({
    from:    `"FlexTag" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: `${otpCode} is your FlexTag verification code`,
    html,
  })
}

/**
 * Send a campaign deadline reminder to a creator.
 * @param {string} toEmail   Creator's email address
 * @param {object} campaign  Campaign details { title, brand, hoursLeft }
 * @param {string} window    Reminder window: '48h', '24h', or '6h'
 */
async function sendDeadlineReminder(toEmail, campaign, window) {
  const { title, brand, hoursLeft } = campaign
  const urgencyColor = window === '6h' ? '#ef4444' : window === '24h' ? '#f59e0b' : '#7c3aed'
  const urgencyText = window === '6h' ? 'URGENT' : 'REMINDER'
  
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Campaign Deadline Reminder</title>
  </head>
  <body style="margin:0;padding:0;background:#050816;font-family:'Inter',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#050816;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0"
            style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;max-width:520px;width:100%;">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,${urgencyColor},#06b6d4);padding:32px;text-align:center;">
                <div style="display:inline-flex;align-items:center;gap:10px;">
                  <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;font-style:italic;color:#fff;">F</div>
                  <span style="font-size:26px;font-weight:900;font-style:italic;color:#fff;letter-spacing:-0.03em;">FlexTag™</span>
                </div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <div style="background:rgba(${urgencyColor === '#ef4444' ? '239,68,68' : urgencyColor === '#f59e0b' ? '245,158,11' : '124,58,237'},0.1);border-left:4px solid ${urgencyColor};padding:12px 16px;margin-bottom:28px;border-radius:8px;">
                  <p style="font-size:12px;font-weight:700;color:${urgencyColor};margin:0;letter-spacing:0.1em;text-transform:uppercase;">${urgencyText}</p>
                </div>
                
                <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 12px;letter-spacing:-0.02em;">
                  ${hoursLeft} hours left to post!
                </h1>
                <p style="font-size:14px;color:rgba(255,255,255,0.5);margin:0 0 28px;line-height:1.7;">
                  Your posting deadline for <strong style="color:rgba(255,255,255,0.7);">${title}</strong> by ${brand} is approaching.
                </p>

                <!-- Campaign Details Box -->
                <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:20px;margin-bottom:28px;">
                  <p style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);margin:0 0 8px;letter-spacing:0.1em;text-transform:uppercase;">Campaign Details</p>
                  <p style="font-size:14px;color:#fff;margin:0 0 6px;font-weight:600;">${title}</p>
                  <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:0;">Brand: ${brand}</p>
                </div>

                <p style="font-size:13px;color:rgba(255,255,255,0.3);margin:0 0 20px;line-height:1.7;">
                  <strong style="color:rgba(255,255,255,0.5);">⏰ ${hoursLeft} hours remaining</strong><br/>
                  Submit your post URL now to lock in your cashback.
                </p>

                <table cellpadding="0" cellspacing="0" style="width:100%;">
                  <tr>
                    <td align="center">
                      <a href="https://flextag.vercel.app/creator/campaigns" style="display:inline-block;background:linear-gradient(135deg,${urgencyColor},#06b6d4);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px;">
                        📱 Go to Campaign Tracker
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="border-top:1px solid rgba(255,255,255,0.06);padding:20px 40px;text-align:center;">
                <p style="font-size:12px;color:rgba(255,255,255,0.2);margin:0;">
                  © ${new Date().getFullYear()} FlexTag. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `

  await transporter.sendMail({
    from:    `"FlexTag" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: `${window} ⏰ Deadline reminder for "${title}" — Post now!`,
    html,
  })
}

module.exports = { sendOtpEmail, sendDeadlineReminder }
