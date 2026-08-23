'use strict'
/**
 * Approve a post and release its cashback — the ONE code path shared by the
 * admin/brand approve route and automated Instagram verification, so the
 * money logic can never drift between the two.
 *
 * Concurrency-safe: the post is CLAIMED with an atomic pending→approved update
 * and the order's cashback flag is flipped with an atomic conditional update,
 * so two overlapping approvals (e.g. a creator double-clicking "verify" while
 * an admin approves) can never pay twice.
 */
const Post = require('../models/Post')
const Transaction = require('../models/Transaction')
const Order = require('../models/Order')
const User = require('../models/User')

const DAY = 86_400_000

/**
 * @param {import('mongoose').Document} post  Post doc; campaignId/orderId/creatorId may be populated or not
 * @param {{ approvedBy?: any, auto?: boolean }} [opts]
 * @returns {Promise<{ post: any, released: boolean }>}
 */
async function approvePost(post, { approvedBy = null, auto = false } = {}) {
  const campaign = post.campaignId && post.campaignId.retentionDays !== undefined ? post.campaignId : null
  const retentionDays = Number(campaign?.retentionDays) || 7
  const now = new Date()
  // Retention is measured from APPROVAL: the post must still be live this many days later.
  const retention = { status: 'pending', checkAt: new Date(now.getTime() + retentionDays * DAY), checkedAt: null }

  const set = {
    status: 'approved', approvedAt: now, approvedBy: approvedBy || null, autoApproved: !!auto, retention,
    auditStatus: 'passed', retentionDaysRemaining: retentionDays,   // Module-3 auditor contract
  }
  if (post.verification) set.verification = post.verification.toObject ? post.verification.toObject() : post.verification

  // 1. Claim: only a still-pending post can be approved, and only once.
  const claimed = await Post.findOneAndUpdate({ _id: post._id, status: 'pending' }, { $set: set }, { new: true })
  if (!claimed) throw Object.assign(new Error('Post is not pending.'), { status: 400 })

  // 2. Release cashback exactly once per order (never for cancelled orders).
  let released = false
  const orderId = post.orderId?._id || post.orderId
  if (orderId) {
    // Never pay for cancelled or returned orders (fulfillment module's return flow included).
    const order = await Order.findOneAndUpdate(
      { _id: orderId, cashbackReleased: false, status: { $nin: ['cancelled', 'return_requested', 'returned'] } },
      { $set: { cashbackReleased: true } },
      { new: false }, // returns the pre-update doc → cashbackAmount
    )
    if (order) {
      const creatorId = post.creatorId?._id || post.creatorId
      await Transaction.create({
        userId:  creatorId,
        type:    'cashback',
        amount:  order.cashbackAmount,
        desc:    `Cashback for ${post.campaignId?.title || 'campaign'}`,
        status:  'completed',
        orderId: order._id,
        postId:  post._id,
      })
      await User.findByIdAndUpdate(creatorId, { $inc: { totalEarnings: order.cashbackAmount, completedCampaigns: 1 } })
      await Post.updateOne({ _id: post._id }, { $set: { cashbackReleased: true } })
      released = true
    }
  }

  // 3. Mirror the persisted state onto the caller's in-memory document.
  post.status = 'approved'
  post.approvedAt = now
  post.approvedBy = set.approvedBy
  post.autoApproved = set.autoApproved
  post.retention = retention
  post.auditStatus = 'passed'
  post.retentionDaysRemaining = retentionDays
  if (released) post.cashbackReleased = true
  return { post, released }
}

module.exports = { approvePost }
