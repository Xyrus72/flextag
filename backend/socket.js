/**
 * socket.js — FlexTag real-time messaging via Socket.IO
 *
 * Events (client → server):
 *   join_room    { conversationId }       — user joins a chat room
 *   leave_room   { conversationId }       — user leaves a chat room
 *   send_message { conversationId, text } — send a message; server saves to DB & broadcasts
 *   typing       { conversationId }       — broadcast typing indicator
 *   stop_typing  { conversationId }       — stop typing indicator
 *
 * Events (server → client):
 *   new_message         { message }       — new message in a conversation room
 *   conversation_updated { conversationId, lastMessage, lastMessageAt } — sidebar refresh
 *   user_typing         { userId, conversationId }
 *   user_stop_typing    { userId, conversationId }
 */

const Conversation = require('./models/Conversation')
const Message      = require('./models/Message')
const User         = require('./models/User')

/**
Conversation → Access conversation data
Message      → Access message data
User         → Access user data
 
 */
let ioRef = null
/** The live Socket.IO server (or null before init) — used by services/notifications.js. */
function getIo() { return ioRef }

function initSocket(io) {
  ioRef = io
  // ── Auth middleware: attach user from session ─────────────────────────────
  io.use((socket, next) => {
    const session = socket.request.session
    if (session && session.userId) {
      User.findById(session.userId)
        .select('_id name companyName role avatar logoUrl isVerified')
        .then(user => {
          if (!user) return next(new Error('User not found'))
          socket.user = user
          next()
        })
        .catch(next)
    } else {
      next(new Error('Not authenticated'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString()
    console.log(`[socket] connected: ${socket.user.name} (${socket.user.role}) — ${socket.id}`)

    // ── Join all of a user's conversation rooms on connect ──────────────────
    Conversation.find({ participants: socket.user._id })
      .select('_id')
      .then(convs => {
        convs.forEach(c => socket.join(c._id.toString()))
        console.log(`[socket] ${socket.user.name} auto-joined ${convs.length} rooms`)
      })
      .catch(err => console.error('[socket] auto-join error:', err))

    // ── join_room ───────────────────────────────────────────────────────────
    socket.on('join_room', async ({ conversationId }) => {
      try {
        const conv = await Conversation.findById(conversationId)
        if (!conv) return
        const isMember = conv.participants.some(p => p.toString() === userId)
        if (!isMember) return
        socket.join(conversationId)
        console.log(`[socket] ${socket.user.name} joined room ${conversationId}`)
      } catch (err) {
        console.error('[socket] join_room error:', err)
      }
    })

    // ── leave_room ──────────────────────────────────────────────────────────
    socket.on('leave_room', ({ conversationId }) => {
      socket.leave(conversationId)
    })

    // ── send_message ────────────────────────────────────────────────────────
    socket.on('send_message', async ({ conversationId, text }) => {
      try {
        if (!conversationId || !text?.trim()) return

        // Verify membership
        const conv = await Conversation.findById(conversationId)
        if (!conv) return
        const isMember = conv.participants.some(p => p.toString() === userId)
        if (!isMember) return

        // Save to MongoDB
        const message = await Message.create({
          conversationId,
          senderId: socket.user._id,
          text: text.trim(),
        })

        // Update conversation summary
        conv.lastMessage = text.trim()
        conv.lastMessageAt = new Date()
        await conv.save()

        // Populate sender for frontend display
        const populated = await message.populate('senderId', 'name companyName role avatar logoUrl')

        // Broadcast to everyone in the room (including sender)
        io.to(conversationId).emit('new_message', { message: populated })

        // Notify all participants for sidebar update
        conv.participants.forEach(participantId => {
          io.to(`user_${participantId.toString()}`).emit('conversation_updated', {
            conversationId,
            lastMessage:   text.trim(),
            lastMessageAt: conv.lastMessageAt,
          })
        })
      } catch (err) {
        console.error('[socket] send_message error:', err)
      }
    })

    // ── typing indicators ───────────────────────────────────────────────────
    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user_typing', {
        userId,
        userName: socket.user.companyName || socket.user.name,
        conversationId,
      })
    })

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user_stop_typing', { userId, conversationId })
    })

    // ── join personal room for sidebar notifications ─────────────────────────
    socket.join(`user_${userId}`)

    // ── disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.user.name}`)
    })
  })
}

module.exports = initSocket
module.exports.getIo = getIo
