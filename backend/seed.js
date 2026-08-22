/**
 * Seed the initial admin account:
 *   npm run seed
 *
 * Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD in .env. If no password is
 * set, a strong random one is generated and printed ONCE — copy it somewhere
 * safe. Never hard-code a password here; this script may be run against prod.
 */

require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const crypto   = require('crypto')
const User     = require('./models/User')

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@flextag.com'

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅  Connected to MongoDB')

  const existing = await User.findOne({ email: ADMIN_EMAIL })
  if (existing) {
    console.log('ℹ️   Admin already exists — skipping.')
  } else {
    const generated = !process.env.ADMIN_PASSWORD
    const password  = process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url')
    const hashed    = await bcrypt.hash(password, 10)

    await User.create({
      name: 'FlexTag Admin',
      email: ADMIN_EMAIL,
      password: hashed,
      role: 'admin',
      isVerified: true,
      isSuper: true,
    })

    console.log('✅  Admin created:', ADMIN_EMAIL)
    if (generated) {
      console.log('🔑  Generated password (shown once — save it now):', password)
    } else {
      console.log('🔑  Password: the ADMIN_PASSWORD from your .env')
    }
  }

  await mongoose.disconnect()
  console.log('👋  Done.')
}

seed().catch(console.error)
