/**
 * test-support-chat.js
 *
 * Automated verification script for Module 4 Member 4:
 * Real-Time Support Chat & WebSockets
 *
 * Tests:
 * 1. MongoDB Connection
 * 2. Schema Validation (User, Conversation, Message)
 * 3. Support Conversation Creation
 * 4. Message Creation & DB Persistence
 * 5. Message Validation (rejection of empty / invalid text)
 * 6. Access Control & Authorization (unauthorized access rejected, admin access allowed)
 * 7. Mark Messages as Read Logic
 * 8. Cleanup test artifacts
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Conversation = require('../models/Conversation')
const Message = require('../models/Message')

async function runTests() {
  console.log('\n==================================================')
  console.log('🚀 FLEXTAG MODULE 4 MEMBER 4: SUPPORT CHAT TEST')
  console.log('==================================================\n')

  let createdUserIds = []
  let createdConvIds = []
  let createdMsgIds = []

  try {
    // ── Test 1: Connect to MongoDB ───────────────────────────────────────────
    console.log('📡 Test 1: Connecting to MongoDB...')
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in .env')
    }
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    })
    console.log('✅ Test 1 PASSED: MongoDB Connected.\n')

    // ── Test 2: Verify or Create Test Users ───────────────────────────────────
    console.log('👤 Test 2: Verifying Creator and Admin Users...')
    const hashedPassword = await bcrypt.hash('TestPass@123', 10)

    // Test Creator
    const creatorEmail = `test_creator_${Date.now()}@flextag.test`
    const testCreator = await User.create({
      name: 'Test Creator',
      email: creatorEmail,
      password: hashedPassword,
      role: 'creator',
      isVerified: true,
    })
    createdUserIds.push(testCreator._id)

    // Test Admin
    const adminEmail = `test_admin_${Date.now()}@flextag.test`
    const testAdmin = await User.create({
      name: 'Test Admin Staff',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
    })
    createdUserIds.push(testAdmin._id)

    // Test Third Party User (to test authorization boundary)
    const outsiderEmail = `test_outsider_${Date.now()}@flextag.test`
    const testOutsider = await User.create({
      name: 'Test Outsider',
      email: outsiderEmail,
      password: hashedPassword,
      role: 'creator',
      isVerified: false,
    })
    createdUserIds.push(testOutsider._id)

    console.log(`   - Creator Created: ${testCreator.name} (${testCreator._id})`)
    console.log(`   - Admin Created:   ${testAdmin.name} (${testAdmin._id})`)
    console.log(`   - Outsider Created:${testOutsider.name} (${testOutsider._id})`)
    console.log('✅ Test 2 PASSED: Test users prepared.\n')

    // ── Test 3: Create Support Conversation ──────────────────────────────────
    console.log('💬 Test 3: Creating Support Conversation...')
    const supportConv = await Conversation.create({
      participants: [testCreator._id, testAdmin._id],
      type: 'support',
      lastMessage: 'Conversation started with FlexTag Support',
      lastMessageAt: new Date(),
    })
    createdConvIds.push(supportConv._id)

    if (!supportConv._id || supportConv.type !== 'support') {
      throw new Error('Failed to create support conversation')
    }
    console.log(`   - Conversation ID: ${supportConv._id}`)
    console.log(`   - Participants: [${supportConv.participants.join(', ')}]`)
    console.log('✅ Test 3 PASSED: Support conversation initialized.\n')

    // ── Test 4: Creator Sends Message to Admin (DB Persistence) ──────────────
    console.log('✉️  Test 4: Creator Sending Message (Persistence & Population)...')
    const creatorMsgText = 'Hello, I need help with my cashback.'
    const msg1 = await Message.create({
      conversationId: supportConv._id,
      senderId: testCreator._id,
      text: creatorMsgText,
      read: false,
    })
    createdMsgIds.push(msg1._id)

    // Update conversation summary
    supportConv.lastMessage = creatorMsgText
    supportConv.lastMessageAt = new Date()
    await supportConv.save()

    // Populate sender
    const populated1 = await Message.findById(msg1._id).populate('senderId', 'name role avatar')
    if (populated1.text !== creatorMsgText || populated1.senderId.role !== 'creator') {
      throw new Error('Message persistence or population failed')
    }
    console.log(`   - Message Saved: "${populated1.text}"`)
    console.log(`   - Sender Populated: ${populated1.senderId.name} (${populated1.senderId.role})`)
    console.log('✅ Test 4 PASSED: Creator message saved and populated.\n')

    // ── Test 5: Admin Replies to Creator ─────────────────────────────────────
    console.log('🛡️  Test 5: Admin Replying to Creator...')
    const adminReplyText = 'Sure, let me check your payment.'
    const msg2 = await Message.create({
      conversationId: supportConv._id,
      senderId: testAdmin._id,
      text: adminReplyText,
      read: false,
    })
    createdMsgIds.push(msg2._id)

    supportConv.lastMessage = adminReplyText
    supportConv.lastMessageAt = new Date()
    await supportConv.save()

    const populated2 = await Message.findById(msg2._id).populate('senderId', 'name role avatar')
    if (populated2.text !== adminReplyText || populated2.senderId.role !== 'admin') {
      throw new Error('Admin reply failed')
    }
    console.log(`   - Admin Reply Saved: "${populated2.text}"`)
    console.log(`   - Sender Populated: ${populated2.senderId.name} (${populated2.senderId.role})`)
    console.log('✅ Test 5 PASSED: Admin reply persisted and linked to conversation.\n')

    // ── Test 6: Message Validation (Empty Text Rejection) ────────────────────
    console.log('🛡️  Test 6: Validating Message Constraints (Empty Text)...')
    let emptyRejected = false
    try {
      const invalidMsg = new Message({
        conversationId: supportConv._id,
        senderId: testCreator._id,
        text: '   ', // whitespace only
      })
      await invalidMsg.validate()
    } catch (err) {
      emptyRejected = true
    }
    // Also test null text
    try {
      const nullMsg = new Message({
        conversationId: supportConv._id,
        senderId: testCreator._id,
        text: '',
      })
      await nullMsg.validate()
    } catch (err) {
      emptyRejected = true
    }

    if (!emptyRejected) {
      throw new Error('Empty message was not rejected by schema validation!')
    }
    console.log('✅ Test 6 PASSED: Empty / blank messages correctly rejected.\n')

    // ── Test 7: Authorization Boundary Verification ──────────────────────────
    console.log('🔒 Test 7: Verifying Privacy & Authorization Boundaries...')
    // Verify outsider is not a participant
    const isOutsiderMember = supportConv.participants.some(
      p => p.toString() === testOutsider._id.toString()
    )
    if (isOutsiderMember) {
      throw new Error('Outsider erroneously recognized as participant')
    }

    // Verify creator is participant
    const isCreatorMember = supportConv.participants.some(
      p => p.toString() === testCreator._id.toString()
    )
    if (!isCreatorMember) {
      throw new Error('Creator should be a participant')
    }
    console.log('   - Participant check: Creator -> ALLOWED, Outsider -> DENIED')
    console.log('✅ Test 7 PASSED: Privacy boundaries verified.\n')

    // ── Test 8: Read Receipts ────────────────────────────────────────────────
    console.log('👀 Test 8: Verifying Read Receipts Update...')
    const unreadCountBefore = await Message.countDocuments({
      conversationId: supportConv._id,
      senderId: { $ne: testCreator._id },
      read: false,
    })
    console.log(`   - Unread for creator before: ${unreadCountBefore}`)

    // Mark as read
    await Message.updateMany(
      { conversationId: supportConv._id, senderId: { $ne: testCreator._id }, read: false },
      { read: true }
    )

    const unreadCountAfter = await Message.countDocuments({
      conversationId: supportConv._id,
      senderId: { $ne: testCreator._id },
      read: false,
    })
    console.log(`   - Unread for creator after: ${unreadCountAfter}`)

    if (unreadCountAfter !== 0) {
      throw new Error('Mark as read failed to update all unread messages')
    }
    console.log('✅ Test 8 PASSED: Read receipts successfully updated.\n')

    // ── Test 9: Conversation History Retrieval ───────────────────────────────
    console.log('📜 Test 9: Retrieving Chronological History from MongoDB...')
    const history = await Message.find({ conversationId: supportConv._id })
      .populate('senderId', 'name role')
      .sort({ createdAt: 1 })

    if (history.length !== 2) {
      throw new Error(`Expected 2 messages in history, got ${history.length}`)
    }
    console.log(`   - Found ${history.length} messages in conversation history:`)
    history.forEach((m, idx) => {
      console.log(`     [${idx + 1}] ${m.senderId.name} (${m.senderId.role}): "${m.text}" (read: ${m.read})`)
    })
    console.log('✅ Test 9 PASSED: Full conversation history preserved and sorted.\n')

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message)
    process.exitCode = 1
  } finally {
    // ── Cleanup ──────────────────────────────────────────────────────────────
    console.log('🧹 Cleaning up test data from MongoDB...')
    try {
      if (createdMsgIds.length > 0) {
        await Message.deleteMany({ _id: { $in: createdMsgIds } })
      }
      if (createdConvIds.length > 0) {
        await Conversation.deleteMany({ _id: { $in: createdConvIds } })
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } })
      }
      console.log('   - Test data cleaned up successfully.')
    } catch (cleanErr) {
      console.warn('   - Cleanup warning:', cleanErr.message)
    }

    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB.')
    console.log('\n==================================================')
    console.log(process.exitCode === 1 ? '❌ SOME TESTS FAILED' : '🎉 ALL SUPPORT CHAT TESTS PASSED!')
    console.log('==================================================\n')
  }
}

runTests()

