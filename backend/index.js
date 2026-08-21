require('dotenv').config()

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const cors = require('cors')
const session = require('express-session')

// Compatible with connect-mongo versions
const connectMongo = require('connect-mongo')
const MongoStore =
  connectMongo.default ||
  connectMongo.MongoStore ||
  connectMongo


// ============================================================
// ROUTES
// ============================================================

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


// ============================================================
// MODULE 3 - MEMBER 4
// ESCROW SERVICE
// ============================================================

const {
  releaseExpiredEscrows
} = require('./services/escrowService')


// ============================================================
// APP / SERVER
// ============================================================

const app = express()

const server = http.createServer(app)

const PORT = process.env.PORT || 5001


// ============================================================
// CORS
// ============================================================

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

  credentials: true

}

app.use(cors(corsOptions))


// ============================================================
// BODY PARSING
// ============================================================

app.use(express.json())

app.use(
  express.urlencoded({
    extended: true
  })
)


// ============================================================
// SESSION
// ============================================================

const sessionMiddleware = session({

  secret:
    process.env.SESSION_SECRET ||
    'flextag_secret',

  resave: false,

  saveUninitialized: false,

  store: MongoStore.create({

    mongoUrl: process.env.MONGO_URI,

    collectionName: 'sessions',

    ttl: 7 * 24 * 60 * 60

  }),

  cookie: {

    secure: false,

    httpOnly: true,

    maxAge:
      7 * 24 * 60 * 60 * 1000,

    sameSite: 'lax'

  }

})

app.use(sessionMiddleware)


// ============================================================
// SOCKET.IO
// ============================================================

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

    credentials: true

  }

})


// Share Express session with Socket.IO

io.use((socket, next) => {

  sessionMiddleware(
    socket.request,
    socket.request.res || {},
    next
  )

})


// ============================================================
// SOCKET HANDLERS
// ============================================================

try {

  const initSocket = require('./socket')

  initSocket(io)

} catch (err) {

  console.warn(
    '[Socket] Socket handler could not be loaded:',
    err.message
  )

}


// ============================================================
// ROUTES
// ============================================================

app.use('/api/auth', authRoutes)

app.use(
  '/api/campaigns',
  campaignRoutes
)

app.use(
  '/api/products',
  productRoutes
)

app.use(
  '/api/orders',
  orderRoutes
)

app.use(
  '/api/posts',
  postRoutes
)

app.use(
  '/api/transactions',
  transactionRoutes
)

app.use(
  '/api/users',
  userRoutes
)

app.use(
  '/api/admin',
  adminRoutes
)

app.use(
  '/api/settings',
  settingsRoutes
)

app.use(
  '/api/disputes',
  disputeRoutes
)

app.use(
  '/api/categories',
  categoryRoutes
)

app.use(
  '/api/messages',
  messageRoutes
)


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  '/api/health',
  (_req, res) => {

    res.json({

      status: 'ok',

      time:
        new Date().toISOString()

    })

  }
)


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (err, req, res, _next) => {

    console.error(
      '[Global Error]',
      err
    )

    res.status(500).json({

      message:
        err.message ||
        'Internal server error.'

    })

  }
)


// ============================================================
// START ESCROW CHECKER
// ============================================================

function startEscrowChecker() {

  console.log(
    '💰 Escrow checker started'
  )


  // ----------------------------------------------------------
  // Run once immediately
  // ----------------------------------------------------------

  releaseExpiredEscrows()
    .then(result => {

      console.log(
        `[Escrow] Initial check finished. Released: ${result.released}`
      )

    })
    .catch(err => {

      console.error(
        '[Escrow] Initial check failed:',
        err.message
      )

    })


  // ----------------------------------------------------------
  // Run every 60 seconds
  // ----------------------------------------------------------

  setInterval(async () => {

    try {

      const result =
        await releaseExpiredEscrows()


      // Only print when money was actually released

      if (result.released > 0) {

        console.log(
          `[Escrow] Released ${result.released} cashback payment(s).`
        )

      }

    } catch (err) {

      console.error(
        '[Escrow] Automatic check failed:',
        err.message
      )

    }

  }, 60 * 1000)

}


// ============================================================
// DATABASE + SERVER START
// ============================================================

async function startServer() {

  try {

    // --------------------------------------------------------
    // Connect MongoDB
    // --------------------------------------------------------

    await mongoose.connect(
      process.env.MONGO_URI,
      {

        serverSelectionTimeoutMS: 10000,

        socketTimeoutMS: 45000

      }
    )


    console.log(
      '✅ MongoDB connected'
    )


    // --------------------------------------------------------
    // Start Module 3 escrow checker
    // --------------------------------------------------------

    startEscrowChecker()


    // --------------------------------------------------------
    // Start Express server
    // --------------------------------------------------------

    server.listen(
      PORT,
      () => {

        console.log(
          `🚀 FlexTag API running on http://localhost:${PORT}`
        )

      }
    )


  } catch (err) {

    console.error(
      '❌ MongoDB connection error:',
      err.message
    )

    process.exit(1)

  }

}


// ============================================================
// RUN SERVER
// ============================================================

startServer()