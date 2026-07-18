require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const User     = require('./models/User')

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅  Connected to MongoDB')

  const existing = await User.findOne({ email: 'admin@flextag.com' })
  if (existing) {
    console.log('ℹ️   Admin already exists — skipping.')
  } else {
    const hashed = await bcrypt.hash('admin123', 10)
    await User.create({
      name: 'FlexTag Admin',
      email: 'admin@flextag.com',
      password: hashed,
      role: 'admin',
      isVerified: true,
      isSuper: true,
    })
    console.log('✅  Admin created: admin@flextag.com / admin123')
  }

  await mongoose.disconnect()
  console.log('👋  Done.')
}

seed().catch(console.error)
