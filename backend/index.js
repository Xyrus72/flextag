require('dotenv').config()

const express    = require('express')
const mongoose   = require('mongoose')
const cors       = require('cors')
const session    = require('express-session')
const MongoStore = require('connect-mongo')

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth')
const campaignRoutes     = require('./routes/campaigns')
const productRoutes      = require('./routes/products')
const orderRoutes        = require('./routes/orders')
const postRoutes         = require('./routes/posts')
const transactionRoutes  = require('./routes/transactions')
const userRoutes         = require('./routes/users')
const adminRoutes        = require('./routes/admin')
const settingsRoutes     = require('./routes/settings')
const disputeRoutes      = require('./routes/disputes')
const categoryRoutes     = require('./routes/categories')
const captionRoutes      = require('./routes/captionValidator')

const app  = express()
const PORT = process.env.PORT || 5000

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  tls: true,
  tlsAllowInvalidCertificates: false,
})
  .then(() => console.log('✅  MongoDB connected'))
  .catch((err) => { console.error('❌  MongoDB connection error:', err.message); process.exit(1) })

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'flextag_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60,
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}))

// ─── Mount Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/campaigns',    campaignRoutes)
app.use('/api/products',     productRoutes)
app.use('/api/orders',       orderRoutes)
app.use('/api/posts',        postRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/users',        userRoutes)
app.use('/api/admin',        adminRoutes)
app.use('/api/settings',     settingsRoutes)
app.use('/api/disputes',     disputeRoutes)
app.use('/api/categories',   categoryRoutes)
app.use('/api/caption',      captionRoutes)

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[global error]', err)
  res.status(500).json({ message: err.message || 'Internal server error.' })
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀  FlexTag API running on http://localhost:${PORT}`))
