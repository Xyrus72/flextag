require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const User     = require('./models/User')

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅  Connected to MongoDB')

  // ── 1. Admin User ──────────────────────────────────────────────────────────
  const adminEmail = 'admin@flextag.com'
  const adminHashed = await bcrypt.hash('admin123', 10)
  const existingAdmin = await User.findOne({ email: adminEmail })

  if (existingAdmin) {
    existingAdmin.password = adminHashed
    existingAdmin.role = 'admin'
    existingAdmin.isVerified = true
    existingAdmin.isSuper = true
    await existingAdmin.save()
    console.log('✅  Admin user password synchronized: admin@flextag.com / admin123')
  } else {
    await User.create({
      name: 'FlexTag Admin',
      email: adminEmail,
      password: adminHashed,
      role: 'admin',
      isVerified: true,
      isSuper: true,
    })
    console.log('✅  Admin created: admin@flextag.com / admin123')
  }

  // ── 2. Brand User ──────────────────────────────────────────────────────────
  const brandEmail = 'fatinrahmantaseen2@gmail.com'
  const brandHashed = await bcrypt.hash('brand123', 10)
  const existingBrand = await User.findOne({ email: brandEmail })

  if (existingBrand) {
    existingBrand.password = brandHashed
    existingBrand.role = 'brand'
    existingBrand.isVerified = true
    await existingBrand.save()
    console.log('✅  Brand user password synchronized: fatinrahmantaseen2@gmail.com / brand123')
  } else {
    await User.create({
      name: 'Fatin Rahman Taseen Brand',
      email: brandEmail,
      password: brandHashed,
      role: 'brand',
      companyName: 'FlexTag Brand',
      website: 'https://flextag.com',
      productCategory: 'Food & Grocery',
      isVerified: true,
    })
    console.log('✅  Brand created: fatinrahmantaseen2@gmail.com / brand123')
  }

  // ── 3. Verify Creator User ─────────────────────────────────────────────────
  const creator = await User.findOne({ email: 'fatinrahmantaseen@gmail.com' })
  if (creator) {
    console.log(`ℹ️   Creator verified intact: ${creator.email} (role: ${creator.role})`)
  }

  await mongoose.disconnect()
  console.log('👋  Done.')
}

seed().catch(console.error)
