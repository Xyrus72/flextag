const express      = require('express')
const router       = express.Router()
const Conversation = require('../models/Conversation')
const Message      = require('../models/Message')
const User         = require('../models/User')
const { requireAuth } = require('../middleware/auth')

// ── GET /api/messages/contacts — fetch contacts for starting chats ─────────
router.get('/contacts', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user._id
    const { role } = req.query
    const query = { _id: { $ne: currentUserId } }

    if (role === 'brand') {
      query.$or = [{ role: 'brand' }, { companyName: { $exists: true, $ne: '' } }]
    } else if (role) {
      query.role = role
    }

    let users = await User.find(query)
      .select('name companyName role instagramHandle avatar logoUrl productCategory email isVerified')
      .sort({ companyName: 1, name: 1 })

    // If looking for brands and 0 brands exist in MongoDB, auto-seed official brand accounts into database
    if (role === 'brand' && users.length === 0) {
      const bcrypt = require('bcryptjs')
      const defaultPassword = await bcrypt.hash('brand123', 10)

      const sampleBrands = [
        { name: 'Aarong Official', companyName: 'Aarong Fashion', email: 'contact@aarong.com', password: defaultPassword, role: 'brand', productCategory: 'Fashion & Lifestyle', isVerified: true },
        { name: 'Apex Team', companyName: 'Apex Footwear', email: 'info@apexfootwear.com', password: defaultPassword, role: 'brand', productCategory: 'Footwear & Accessories', isVerified: true },
        { name: 'Yellow BD', companyName: 'Yellow Clothing', email: 'support@yellowbd.com', password: defaultPassword, role: 'brand', productCategory: 'Apparel & Clothing', isVerified: true },
        { name: 'Samsung BD Team', companyName: 'Samsung Electronics', email: 'official@samsungbd.com', password: defaultPassword, role: 'brand', productCategory: 'Electronics & Tech', isVerified: true },
      ]

      await User.insertMany(sampleBrands)

      users = await User.find(query)
        .select('name companyName role instagramHandle avatar logoUrl productCategory email isVerified')
        .sort({ companyName: 1, name: 1 })
    }

    res.json({ contacts: users })
  } catch (err) {
    console.error('[messages/contacts]', err)
    res.status(500).json({ message: 'Server error loading contacts.' })
  }
})

// ── GET /api/messages/conversations — list user's active conversations ─────
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name companyName role instagramHandle avatar email isVerified')
      .sort({ lastMessageAt: -1 })

    // Compute unread count for each conversation
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: userId },
          read: false,
        })
        const obj = conv.toObject()
        obj.unreadCount = unreadCount
        return obj
      })
    )

    res.json({ conversations: result })
  } catch (err) {
    console.error('[messages/conversations GET]', err)
    res.status(500).json({ message: 'Server error loading conversations.' })
  }
})

// ── POST /api/messages/conversations — start or find a conversation ──────
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user._id
    const { targetUserId, type } = req.body

    let targetId = targetUserId

    // If support chat is requested or no targetUserId provided
    if (type === 'support' || !targetId) {
      if (req.user.role === 'admin') {
        // Logged-in user is already admin -> pick a creator or brand to chat with
        const userToSupport = await User.findOne({ _id: { $ne: currentUserId } })
        if (userToSupport) targetId = userToSupport._id
      } else {
        // Find an admin user in MongoDB
        let admin = await User.findOne({ role: 'admin' })
        if (!admin) {
          // Auto-create default FlexTag Support Admin if none exists yet
          const bcrypt = require('bcryptjs')
          const hashed = await bcrypt.hash('admin123', 10)
          admin = await User.create({
            name: 'FlexTag Support Admin',
            email: 'support@flextag.com',
            password: hashed,
            role: 'admin',
            isVerified: true,
          })
        }
        targetId = admin._id
      }
    }

    if (!targetId) {
      return res.status(400).json({ message: 'Support team member is currently unavailable.' })
    }

    if (targetId.toString() === currentUserId.toString()) {
      return res.status(400).json({ message: 'Cannot start conversation with yourself.' })
    }

    // Look for existing conversation between current user and target user
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, targetId] },
    }).populate('participants', 'name companyName role instagramHandle avatar email isVerified')

    if (!conversation) {
      conversation = new Conversation({
        participants: [currentUserId, targetId],
        type: type || 'support',
        lastMessage: 'Conversation started with FlexTag Support',
        lastMessageAt: new Date(),
      })
      await conversation.save()
      conversation = await conversation.populate('participants', 'name companyName role instagramHandle avatar email isVerified')
    }

    res.json({ conversation })
  } catch (err) {
    console.error('[messages/conversations POST]', err)
    res.status(500).json({ message: 'Server error creating conversation.' })
  }
})

// ── GET /api/messages/conversations/:id — get messages for a conversation ─
router.get('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const convId = req.params.id
    const userId = req.user._id

    const conversation = await Conversation.findById(convId)
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(403).json({ message: 'Access denied to conversation.' })
    }

    const messages = await Message.find({ conversationId: convId })
      .populate('senderId', 'name companyName role avatar')
      .sort({ createdAt: 1 })

    // Mark messages as read
    await Message.updateMany(
      { conversationId: convId, senderId: { $ne: userId }, read: false },
      { read: true }
    )

    res.json({ messages })
  } catch (err) {
    console.error('[messages/:id GET]', err)
    res.status(500).json({ message: 'Server error loading messages.' })
  }
})

// ── POST /api/messages — send a new message ─────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { conversationId, text } = req.body
    const senderId = req.user._id

    if (!conversationId || !text || !text.trim()) {
      return res.status(400).json({ message: 'Conversation ID and text are required.' })
    }

    const conversation = await Conversation.findById(conversationId)
    if (!conversation || !conversation.participants.includes(senderId)) {
      return res.status(403).json({ message: 'Access denied.' })
    }

    const message = new Message({
      conversationId,
      senderId,
      text: text.trim(),
    })
    await message.save()

    // Update conversation summary
    conversation.lastMessage = text.trim()
    conversation.lastMessageAt = new Date()
    await conversation.save()

    const populatedMsg = await message.populate('senderId', 'name companyName role avatar')

    res.status(201).json({ message: populatedMsg })
  } catch (err) {
    console.error('[messages POST]', err)
    res.status(500).json({ message: 'Server error sending message.' })
  }
})

// ── GET /api/messages/all-conversations — admin sees ALL platform conversations ─
router.get('/all-conversations', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' })
    }

    const conversations = await Conversation.find({})
      .populate('participants', 'name companyName role instagramHandle avatar logoUrl email isVerified')
      .sort({ lastMessageAt: -1 })

    // Compute unread count for each conversation (messages not read)
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          read: false,
        })
        const obj = conv.toObject()
        obj.unreadCount = unreadCount
        return obj
      })
    )

    res.json({ conversations: result })
  } catch (err) {
    console.error('[messages/all-conversations]', err)
    res.status(500).json({ message: 'Server error loading all conversations.' })
  }
})

module.exports = router
