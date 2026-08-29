require('dotenv').config()

process.on('unhandledRejection', (reason) => {
  if (reason && (reason.code === 'ESERVFAIL' || reason.code === 'ECONNREFUSED')) {
    return
  }
})

const mongoose = require('mongoose')
const Product = require('./models/Product')
const User = require('./models/User')

const PRIMARY_URI = process.env.MONGO_URI || 'mongodb+srv://flextag:refath123@flextag.4gw70zg.mongodb.net/flextag'
const LOCAL_URI = 'mongodb://127.0.0.1:27017/flextag'

const DEMO_PRODUCTS = [
  {
    name: 'AuraGlow Vitamin C Glow Serum',
    brand: 'AuraGlow Beauty',
    price: 1200,
    cashbackRate: 50,
    category: 'Beauty',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
    rating: 4.9,
    reviews: 24,
    inStock: true,
    stock: 25,
    description: 'Brightening vitamin C serum enriched with hyaluronic acid for radiant skin glow.',
    status: 'approved',
    campaignBudget: 50000,
    totalCashbackSpent: 12000,
    creatorCriteria: { minFollowers: 1000, targetCategory: 'Beauty' },
    postingRules: { hashtags: ['#FlexTag', '#AuraGlow', '#SkinGlow'], taggingHandles: ['@flextag.official', '@auraglow.bd'] }
  },
  {
    name: 'SoundPulse Wireless Earbuds Pro',
    brand: 'SoundPulse Tech',
    price: 3500,
    cashbackRate: 40,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500',
    rating: 4.7,
    reviews: 18,
    inStock: true,
    stock: 15,
    description: 'Active noise cancellation earbuds with 30-hour battery life and immersive bass.',
    status: 'approved',
    campaignBudget: 80000,
    totalCashbackSpent: 28000,
    creatorCriteria: { minFollowers: 2500, targetCategory: 'Tech' },
    postingRules: { hashtags: ['#FlexTag', '#SoundPulse', '#TechReview'], taggingHandles: ['@flextag.official', '@soundpulse'] }
  },
  {
    name: 'PureBotanika Hydrating Rose Toner',
    brand: 'PureBotanika',
    price: 850,
    cashbackRate: 40,
    category: 'Beauty',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
    rating: 4.8,
    reviews: 15,
    inStock: true,
    stock: 30,
    description: 'Organic rose water facial mist for instant hydration and skin soothing.',
    status: 'approved',
    campaignBudget: 30000,
    totalCashbackSpent: 6000,
    creatorCriteria: { minFollowers: 1000, targetCategory: 'Beauty' },
    postingRules: { hashtags: ['#FlexTag', '#PureBotanika'], taggingHandles: ['@flextag.official'] }
  },
  {
    name: 'UrbanStep Minimalist Sneakers',
    brand: 'UrbanStep Footwear',
    price: 4200,
    cashbackRate: 35,
    category: 'Fashion',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
    rating: 4.6,
    reviews: 12,
    inStock: true,
    stock: 12,
    description: 'Lightweight breathable canvas sneakers engineered for modern street style.',
    status: 'approved',
    campaignBudget: 100000,
    totalCashbackSpent: 35000,
    creatorCriteria: { minFollowers: 5000, targetCategory: 'Fashion' },
    postingRules: { hashtags: ['#FlexTag', '#UrbanStep', '#StreetStyle'], taggingHandles: ['@flextag.official', '@urbanstep'] }
  },
  {
    name: 'GlowBrew Organic Matcha Green Tea',
    brand: 'GlowBrew Organics',
    price: 950,
    cashbackRate: 50,
    category: 'Lifestyle',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500',
    rating: 4.9,
    reviews: 31,
    inStock: true,
    stock: 40,
    description: 'Ceremonial grade Japanese matcha powder packed with antioxidants.',
    status: 'approved',
    campaignBudget: 40000,
    totalCashbackSpent: 18000,
    creatorCriteria: { minFollowers: 1000, targetCategory: 'Lifestyle' },
    postingRules: { hashtags: ['#FlexTag', '#GlowBrewMatcha'], taggingHandles: ['@flextag.official'] }
  },
  {
    name: 'FlexFit Seamless Gym Set',
    brand: 'FlexFit Active',
    price: 2800,
    cashbackRate: 45,
    category: 'Fashion',
    image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=500',
    rating: 4.8,
    reviews: 20,
    inStock: true,
    stock: 20,
    description: 'High-waisted compression leggings and matching sports bra athletic set.',
    status: 'approved',
    campaignBudget: 60000,
    totalCashbackSpent: 22000,
    creatorCriteria: { minFollowers: 2000, targetCategory: 'Fitness' },
    postingRules: { hashtags: ['#FlexTag', '#FlexFitActive', '#GymStyle'], taggingHandles: ['@flextag.official'] }
  }
]

async function seedProducts() {
  let connected = false
  try {
    await mongoose.connect(PRIMARY_URI, { serverSelectionTimeoutMS: 3000 })
    connected = true
    console.log('✅ Connected to Atlas MongoDB')
  } catch (err) {
    try {
      await mongoose.connect(LOCAL_URI, { serverSelectionTimeoutMS: 3000 })
      connected = true
      console.log('✅ Connected to Local MongoDB')
    } catch (e) {
      console.warn('⚠️ Could not connect to MongoDB server.')
    }
  }

  if (!connected) return

  try {
    const brandUser = await User.findOne({ role: 'brand' })
    const brandId = brandUser ? brandUser._id : new mongoose.Types.ObjectId()

    await Product.deleteMany({})
    console.log('Cleared existing product catalog.')

    const productsToInsert = DEMO_PRODUCTS.map(p => ({
      ...p,
      brandId
    }))

    const inserted = await Product.insertMany(productsToInsert)
    console.log(`🚀 Successfully seeded ${inserted.length} demo products into MongoDB!`)
  } catch (err) {
    console.error('Error seeding products:', err)
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from MongoDB.')
  }
}

seedProducts()
