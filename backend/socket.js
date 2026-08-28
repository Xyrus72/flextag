/**
 * socket.js — FlexTag real-time messaging via Socket.IO
 *
 * Module 4 — Member 4: Real-Time Support Chat & WebSockets
 *
 * Events (client → server):
 *   join_room / support:join       { conversationId }       — user joins a chat room
 *   leave_room / support:leave     { conversationId }       — user leaves a chat room
 *   send_message / support:send   { conversationId, text } — send a message; server saves to DB & broadcasts
 *   typing / support:typing       { conversationId }       — broadcast typing indicator
 *   stop_typing / support:stopTyping { conversationId }   — stop typing indicator
 *   mark_read / support:read      { conversationId }       — mark messages as read in DB & notify
 *
 * Events (server → client):
 *   new_message / support:message   { message }             — new message in a conversation room
 *   conversation_updated            { conversationId, lastMessage, lastMessageAt } — sidebar refresh
 *   user_typing / support:typing    { userId, userName, conversationId }
 *   user_stop_typing / support:stopTyping { userId, conversationId }
 *   messages_read / support:read    { conversationId, userId }
 *   support:error                   { message }
 */

const Conversation = require('./models/Conversation')
const Message      = require('./models/Message')
const User         = require('./models/User')

module.exports = function initSocket(io) {
  // ── Auth middleware: attach authenticated user from session ─────────────────
  io.use(async (socket, next) => {
    try {
      const session = socket.request.session
      if (!session || !session.userId) {
        return next(new Error('Not authenticated'))
      }

      const user = await User.findById(session.userId)
        .select('_id name companyName role avatar logoUrl isVerified isSuper email')

      if (!user) {
        return next(new Error('User not found'))
      }

      socket.user = user
      next()
    } catch (err) {
      console.error('[socket] auth error:', err.message)
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString()
    const isAdmin = socket.user.role === 'admin'
    console.log(`[socket] Connected: ${socket.user.name} (${socket.user.role}) — Socket ID: ${socket.id}`)

    // ── 1. Join personal room for targeted notifications ─────────────────────
    socket.join(`user_${userId}`)

    // ── 2. Admin support room ────────────────────────────────────────────────
    if (isAdmin) {
      socket.join('admin_support')
    }

    // ── 3. Auto-join active conversation rooms on connect ────────────────────
    try {
      let convQuery = { participants: socket.user._id }
      if (isAdmin) {
        // Admins also auto-join all support-type conversations
        convQuery = { $or: [{ participants: socket.user._id }, { type: 'support' }] }
      }

      const convs = await Conversation.find(convQuery).select('_id')
      convs.forEach(c => socket.join(c._id.toString()))
      console.log(`[socket] ${socket.user.name} auto-joined ${convs.length} chat rooms`)
    } catch (err) {
      console.error('[socket] Auto-join error:', err.message)
    }

    // ── Helper: verify room membership / admin permissions ───────────────────
    const canAccessConv = async (conversationId) => {
      if (!conversationId) return { allowed: false, conv: null }
      const conv = await Conversation.findById(conversationId)
      if (!conv) return { allowed: false, conv: null }
      const isParticipant = conv.participants.some(p => p.toString() === userId)
      if (isParticipant || isAdmin) {
        return { allowed: true, conv }
      }
      return { allowed: false, conv: null }
    }

    // ── join_room / support:join ─────────────────────────────────────────────
    const handleJoin = async ({ conversationId }) => {
      try {
        const { allowed, conv } = await canAccessConv(conversationId)
        if (!allowed || !conv) {
          socket.emit('support:error', { message: 'Access denied to conversation room.' })
          return
        }
        socket.join(conversationId)
        console.log(`[socket] ${socket.user.name} joined room ${conversationId}`)
      } catch (err) {
        console.error('[socket] join_room error:', err.message)
      }
    }
    socket.on('join_room', handleJoin)
    socket.on('support:join', handleJoin)

    // ── leave_room / support:leave ───────────────────────────────────────────
    const handleLeave = ({ conversationId }) => {
      if (conversationId) {
        socket.leave(conversationId)
        console.log(`[socket] ${socket.user.name} left room ${conversationId}`)
      }
    }
    socket.on('leave_room', handleLeave)
    socket.on('support:leave', handleLeave)

    // ── send_message / support:send ──────────────────────────────────────────
    const handleSendMessage = async ({ conversationId, text }) => {
      try {
        if (!conversationId) {
          socket.emit('support:error', { message: 'Conversation ID is required.' })
          return
        }

        const trimmed = (text || '').trim()
        if (!trimmed) {
          socket.emit('support:error', { message: 'Message content cannot be empty.' })
          return
        }

        if (trimmed.length > 5000) {
          socket.emit('support:error', { message: 'Message exceeds maximum length of 5000 characters.' })
          return
        }

        // Verify membership & fetch conversation
        const { allowed, conv } = await canAccessConv(conversationId)
        if (!allowed || !conv) {
          socket.emit('support:error', { message: 'Unauthorized to send messages to this conversation.' })
          return
        }

        // If admin joins and replies, ensure admin is in participants list if not already
        if (isAdmin && !conv.participants.some(p => p.toString() === userId)) {
          conv.participants.push(socket.user._id)
        }

        // Save message to MongoDB using authenticated session user ID
        const message = await Message.create({
          conversationId,
          senderId: socket.user._id,
          text: trimmed,
          read: false,
        })

        // Update conversation summary
        conv.lastMessage = trimmed
        conv.lastMessageAt = new Date()
        await conv.save()

        // Populate sender info for frontend rendering
        const populated = await message.populate('senderId', 'name companyName role avatar logoUrl isVerified')

        // 1. Broadcast to everyone in the conversation room (sender and receiver)
        io.to(conversationId).emit('new_message', { message: populated })
        io.to(conversationId).emit('support:message', { message: populated })

        // 2. Notify all participants' personal rooms for instant sidebar refresh
        conv.participants.forEach(participantId => {
          io.to(`user_${participantId.toString()}`).emit('conversation_updated', {
            conversationId,
            lastMessage: trimmed,
            lastMessageAt: conv.lastMessageAt,
            sender: populated.senderId,
          })
        })

        // 3. If it's a support conversation, also notify the admin_support room
        if (conv.type === 'support') {
          io.to('admin_support').emit('conversation_updated', {
            conversationId,
            lastMessage: trimmed,
            lastMessageAt: conv.lastMessageAt,
            sender: populated.senderId,
          })
        }
      } catch (err) {
        console.error('[socket] send_message error:', err)
        socket.emit('support:error', { message: 'Failed to deliver message.' })
      }
    }
    socket.on('send_message', handleSendMessage)
    socket.on('support:send', handleSendMessage)

    // ── typing / support:typing ──────────────────────────────────────────────
    const handleTyping = ({ conversationId }) => {
      if (!conversationId) return
      const payload = {
        userId,
        userName: socket.user.companyName || socket.user.name,
        conversationId,
      }
      socket.to(conversationId).emit('user_typing', payload)
      socket.to(conversationId).emit('support:typing', payload)
    }
    socket.on('typing', handleTyping)
    socket.on('support:typing', handleTyping)

    // ── stop_typing / support:stopTyping ──────────────────────────────────────
    const handleStopTyping = ({ conversationId }) => {
      if (!conversationId) return
      const payload = { userId, conversationId }
      socket.to(conversationId).emit('user_stop_typing', payload)
      socket.to(conversationId).emit('support:stopTyping', payload)
    }
    socket.on('stop_typing', handleStopTyping)
    socket.on('support:stopTyping', handleStopTyping)

    // ── mark_read / support:read ─────────────────────────────────────────────
    const handleMarkRead = async ({ conversationId }) => {
      try {
        if (!conversationId) return
        const { allowed } = await canAccessConv(conversationId)
        if (!allowed) return

        await Message.updateMany(
          { conversationId, senderId: { $ne: socket.user._id }, read: false },
          { read: true }
        )

        const payload = { conversationId, userId }
        io.to(conversationId).emit('messages_read', payload)
        io.to(conversationId).emit('support:read', payload)
      } catch (err) {
        console.error('[socket] mark_read error:', err.message)
      }
    }
    socket.on('mark_read', handleMarkRead)
    socket.on('support:read', handleMarkRead)

    // ── disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[socket] Disconnected: ${socket.user.name} (${reason})`)
    })
  })
}
