const Post = require('../models/Post')
const Order = require('../models/Order')
const Transaction = require('../models/Transaction')
const User = require('../models/User')
const Alert = require('../models/Alert')
const { pollInstagramPost } = require('./metaAuditor')

const releaseCashback = async post => {
  if (post.cashbackReleased || !post.orderId) return
  const order = await Order.findById(post.orderId)
  if (!order) return

  const amount = order.cashbackAmount || 500
  const transaction = await Transaction.findOne({ postId: post._id, type: 'cashback' })
  if (transaction) {
    transaction.status = 'completed'
    await transaction.save()
  } else {
    await Transaction.create({
      userId: post.creatorId,
      type: 'cashback',
      amount,
      desc: 'Cashback released after retention period',
      status: 'completed',
      orderId: order._id,
      postId: post._id,
    })
  }

  post.cashbackReleased = true
  post.status = 'approved'
  await post.save()
  if (!order.cashbackReleased) {
    await Order.findByIdAndUpdate(order._id, { cashbackReleased: true })
    await User.findByIdAndUpdate(post.creatorId, { $inc: { totalEarnings: amount, completedCampaigns: 1 } })
  }
}

const flagViolation = async post => {
  if (post.status === 'deleted' && post.retentionViolationAt) return
  post.status = 'deleted'
  post.auditStatus = 'flagged'
  post.retentionViolationAt = new Date()
  await post.save()
  await Transaction.updateMany({ postId: post._id, type: 'cashback' }, { status: 'pending' })
  if (post.orderId) await Order.findByIdAndUpdate(post.orderId, { cashbackReleased: false })

  const existingAlert = await Alert.findOne({ type: 'retention_violation', postId: post._id, acknowledged: false })
  if (!existingAlert) {
    await Alert.create({
      type: 'retention_violation',
      severity: 'critical',
      title: 'Retention violation detected',
      message: `Post ${post.postUrl} was deleted or made private before the retention period ended. Cashback has been frozen in escrow.`,
      postId: post._id,
      orderId: post.orderId,
    })
  }
}

const checkRetention = async () => {
  const now = new Date()
  const posts = await Post.find({
    status: { $in: ['approved', 'monitoring'] },
    cashbackReleased: false,
    retentionDeadline: { $exists: true },
  })

  for (const post of posts) {
    try {
      const result = await pollInstagramPost(post.postUrl)
      post.lastRetentionCheckAt = now
      post.retentionDaysRemaining = Math.max(0, Math.ceil((new Date(post.retentionDeadline) - now) / 86400000))
      await post.save()

      if (!result.isPublic && new Date(post.retentionDeadline) > now) {
        await flagViolation(post)
      } else if (new Date(post.retentionDeadline) <= now && result.isPublic) {
        await releaseCashback(post)
      }
    } catch (error) {
      console.error(`[retention monitor] ${post._id}`, error.message)
    }
  }
}

const startRetentionMonitor = () => {
  const intervalMs = Number(process.env.RETENTION_POLL_INTERVAL_MS) || 60 * 60 * 1000
  checkRetention().catch(error => console.error('[retention monitor]', error.message))
  return setInterval(() => checkRetention().catch(error => console.error('[retention monitor]', error.message)), intervalMs)
}

module.exports = { checkRetention, startRetentionMonitor }
