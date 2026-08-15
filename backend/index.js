require('dotenv').config()

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const cors = require('cors')
const session = require('express-session')
const MongoStore = require('connect-mongo').default

// ─── Routes ────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth')
const campaignRoutes = require('./routes/campaigns')
const productRoutes = require('./routes/products')
const orderRoutes = require('./routes/orders')
const postRoutes = require('./routes/posts')
const transactionRoutes = require('./routes/transactions')
const userRoutes = require('./routes/users')
const adminRoutes = require('./routes/admin')
const settingsRoutes = require('./routes/settings')
const disputeRoutes = require('./routes/disputes')
const categoryRoutes = require('./routes/categories')
const messageRoutes = require('./routes/messages')
const aiRoutes = require('./routes/ai')

// ─── App / Server ──────────────────────────────────────────────────────────
const app = express()
const server = http.createServer(app)

const PORT = process.env.PORT || 9002

// ─── CORS ──────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      /^http:\/\/localhost(:\d+)?$/.test(origin)
    ) {
      callback(null, true)
    } else {
      callback(
        new Error('Not allowed by CORS')
      )
    }
  },
  credentials: true,
}

app.use(cors(corsOptions))

// ─── Body Parsing ─────────────────────────────────────────────────────────
app.use(express.json())
app.use(
  express.urlencoded({
    extended: true,
  })
)

// ─── Session ───────────────────────────────────────────────────────────────
const sessionMiddleware = session({
  secret:
    process.env.SESSION_SECRET ||
    'flextag_secret',

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
    maxAge:
      7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
})

app.use(sessionMiddleware)

// ─── Socket.IO ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        /^http:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        callback(null, true)
      } else {
        callback(
          new Error('Not allowed by CORS')
        )
      }
    },

    credentials: true,
  },
})

// Share Express session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(
    socket.request,
    socket.request.res || {},
    next
  )
})

// Initialize socket handlers
try {
  const initSocket = require('./socket')
  initSocket(io)
} catch (err) {
  console.warn(
    '[socket] Socket handler not loaded:',
    err.message
  )
}

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
  })
})

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/disputes', disputeRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/ai', aiRoutes)

// ─── Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[global error]', err)

  res.status(500).json({
    message:
      err.message ||
      'Internal server error.',
  })
})

// ─── MongoDB Connection ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })

  .then(() => {
    console.log('✅ MongoDB connected')

    // Start server only after MongoDB connects
    server.listen(PORT, () => {
      console.log(
        `🚀 FlexTag API running on http://localhost:${PORT}`
      )
    })
  })

  .catch(err => {
    console.error(
      '❌ MongoDB connection error:',
      err.message
    )

    process.exit(1)
  })