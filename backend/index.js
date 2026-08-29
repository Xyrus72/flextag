// Load backend/.env relative to this file so it works from any working directory
require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true })

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
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
const messageRoutes      = require('./routes/messages')

// Error tracking first, so a crash during boot is still reported (no-op without SENTRY_DSN).
const errors = require('./utils/errorReporting')
errors.init()

const app    = express()
const server = http.createServer(app)
const PORT   = process.env.PORT || 1643
const IS_PROD = process.env.NODE_ENV === 'production'

// Render/Railway/etc terminate TLS at a proxy in front of the app, so Express
// sees a plain HTTP connection unless told to trust the proxy's X-Forwarded-*
// headers — without this, secure cookies (below) silently never get set.
if (IS_PROD) app.set('trust proxy', 1)

// ─── CORS ────────────────────────────────────────────────────────────────────
// Deployed frontend origins (Vercel, etc) come from ALLOWED_ORIGINS — a
// comma-separated list in .env. Localhost is always allowed for local dev.
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
)
const isAllowedOrigin = (origin) =>
  !origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || allowedOrigins.has(origin)

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) callback(null, true)
    else callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}
app.use(cors(corsOptions))

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Request Logger ───────────────────────────────────────────────────────────
// Secrets never belong in logs — mask credential-like fields before printing.
const REDACT = new Set(['password', 'otp', 'newPassword', 'currentPassword', 'token', 'sessionid'])
const redact = (body) => (body && typeof body === 'object' && !Array.isArray(body))
  ? Object.fromEntries(Object.entries(body).map(([k, v]) => [k, REDACT.has(k) ? '[redacted]' : v]))
  : body
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`, redact(req.body) || '')
  }
  next()
})


// ─── Connect to MongoDB ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
})
  .then(() => console.log('✅  MongoDB connected'))
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message)
    console.log('\n======================================================')
    console.log('⚠️  DATABASE CONNECTION TIMED OUT / REJECTED!')
    console.log('This is 100% because your IP address is not whitelisted in MongoDB Atlas.')
    console.log('Please follow these steps to fix it in 2 minutes:')
    console.log('1. Go to https://cloud.mongodb.com and log in.')
    console.log('2. Click "Network Access" in the left sidebar under "Security".')
    console.log('3. Click "+ Add IP Address" and select "Allow Access From Anywhere" (0.0.0.0/0).')
    console.log('4. Click "Confirm" and wait 1 minute, then try running this again.')
    console.log('======================================================\n')
    process.exit(1)
  })

// ─── Session ──────────────────────────────────────────────────────────────────
// A predictable secret lets anyone forge a session cookie, so refuse to boot
// in production without a real one.
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌  SESSION_SECRET is not set. Refusing to start in production.')
    process.exit(1)
  }
  console.warn('⚠️   SESSION_SECRET is not set — using an insecure development default.')
}

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'flextag_dev_only_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60,
    mongoOptions: {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
    },
  }),
  cookie: {
    // Cross-domain deploy (frontend on vercel.app, API on onrender.com) needs
    // SameSite=None + Secure for the browser to send the cookie at all; local
    // dev (same-site, plain http) needs the opposite or the cookie is rejected.
    secure: IS_PROD,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: IS_PROD ? 'none' : 'lax',
  },
})
app.use(sessionMiddleware)

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true)
      else callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  },
})

// Share Express session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next)
})

// Initialize socket event handlers
const initSocket = require('./socket')
initSocket(io)

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
app.use('/api/messages',     messageRoutes)
app.use('/api/instagram',    require('./routes/instagram'))
app.use('/api/ai',           require('./routes/ai'))
app.use('/api/stats',        require('./routes/stats'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/checkout',     require('./routes/checkout'))

// ─── Public share pages (crawler meta + OG images; NOT under /api) ───────────
app.use('/share', require('./routes/share'))

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errors.errorHandler())
app.use((err, req, res, _next) => {
  res.status(500).json({ message: err.message || 'Internal server error.' })
})

// Nothing else catches these: an unhandled rejection in a background job used to
// vanish into the log (or take the process down on newer Node).
process.on('unhandledRejection', (reason) => errors.captureError(reason, { tag: 'unhandledRejection' }))
process.on('uncaughtException', (err) => { errors.captureError(err, { tag: 'uncaughtException' }); })

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => console.log(`🚀  FlexTag API running on http://localhost:${PORT}`))

// Background Instagram jobs (retention re-checks, stale re-audits). No-op without a session.
require('./jobs/instagramJobs').start()
// Automatic creator payouts. No-op unless PAYOUT_AUTO=1 with an automatic provider.
require('./jobs/payoutJobs').start()
// Daily email digest of unread notifications. No-op without mail credentials.
require('./jobs/digestJobs').start()
