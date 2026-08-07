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
  if (existing) {
    console.log('Admin already exists:', existing.email)
    process.exit(0)
  }

  const hashed = await bcrypt.hash(ADMIN.password, 10)
  const admin  = await User.create({ ...ADMIN, password: hashed })

  console.log('✅ Admin created successfully!')
  console.log('   Email   :', admin.email)
  console.log('   Password:', ADMIN.password)
  console.log('   Role    :', admin.role)
  process.exit(0)
})().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
