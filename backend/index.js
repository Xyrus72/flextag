require('dotenv').config()

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const cors = require('cors')
const session = require('express-session')
const MongoStore = require('connect-mongo')

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

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 1643
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://flextag:refath123@flextag.4gw70zg.mongodb.net/flextag'

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, _res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`, req.body || '')
  }
  next()
})

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
})
  .then(() => console.log('✅  MongoDB connected'))
  .catch((err) => {
    console.warn('⚠️  MongoDB connection notice:', err.message)
  })

if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌  SESSION_SECRET is not set. Refusing to start in production.')
    process.exit(1)
  }
}

let storeInstance
try {
  storeInstance = MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60,
    mongoOptions: {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
    },
  })
} catch (e) {
  storeInstance = undefined
}

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'flextag_dev_only_secret',
  resave: false,
  saveUninitialized: false,
  store: storeInstance,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
})

app.use(sessionMiddleware)

const io = new Server(server, {
  cors: corsOptions,
})

io.engine.use(sessionMiddleware)

io.on('connection', (socket) => {
  const req = socket.request
  const userId = req.session?.userId
  if (userId) {
    socket.join(`user:${userId}`)
  }

  socket.on('disconnect', () => {})
})

app.use((req, _res, next) => {
  req.io = io
  next()
})

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

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` })
})

app.use((err, req, res, next) => {
  console.error('[Error]', err)
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' })
})

server.listen(PORT, () => {
  console.log(`🚀 FlexTag backend running on http://localhost:${PORT}`)
})
