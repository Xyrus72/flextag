/**
 * Run once to create an admin user:
 *   node createAdmin.js
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

const ADMIN = {
  name:    process.env.ADMIN_NAME  || 'Admin',
  email:   process.env.ADMIN_EMAIL || 'admin@flextag.com',
  role:    'admin',
  isSuper: true,
}

;(async () => {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')

  const existing = await User.findOne({ email: ADMIN.email })
  if (existing) {
    console.log('Admin already exists:', existing.email)
    process.exit(0)
  }

  const generated = !process.env.ADMIN_PASSWORD
  const password  = process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url')
  const hashed    = await bcrypt.hash(password, 10)
  const admin     = await User.create({ ...ADMIN, password: hashed })

  console.log('✅ Admin created successfully!')
  console.log('   Email   :', admin.email)
  console.log('   Role    :', admin.role)
  if (generated) {
    console.log('   Password: (generated, shown once — save it now)', password)
  } else {
    console.log('   Password: the ADMIN_PASSWORD from your .env')
  }
  process.exit(0)
})().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
