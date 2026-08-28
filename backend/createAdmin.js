/**
 * Run once to create an admin user:
 *   node createAdmin.js
 */

require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const User     = require('./models/User')

const ADMIN = {
  name:     'Admin',
  email:    'admin@flextag.com',
  password: 'Admin@1234',
  role:     'admin',
  isSuper:  true,
}

;(async () => {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')

  const existing = await User.findOne({ email: ADMIN.email })
  const hashed = await bcrypt.hash(ADMIN.password, 10)

  let admin
  if (existing) {
    existing.password = hashed
    existing.role = 'admin'
    existing.isSuper = true
    existing.isVerified = true
    admin = await existing.save()
    console.log('✅ Admin password updated successfully!')
  } else {
    admin = await User.create({ ...ADMIN, password: hashed, isVerified: true })
    console.log('✅ Admin created successfully!')
  }

  console.log('   Email   :', admin.email)
  console.log('   Role    :', admin.role)
  process.exit(0)
})().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
