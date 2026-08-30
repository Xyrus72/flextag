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
const Campaign = require('../models/Campaign')
const Product = require('../models/Product')
const { notifySafe } = require('./notifications')
const { onCampaignCompleted } = require('./referrals')
const brandWallet = require('./brandWallet')
const audit = require('./audit')
const commission = require('./commission')

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
    retentionDeadline: retention.checkAt,                            // legacy field shown by CampaignTracker — keep it on the same clock
    auditStatus: 'passed', retentionDaysRemaining: retentionDays,   // Module-3 auditor contract
  }
  if (post.verification) set.verification = post.verification.toObject ? post.verification.toObject() : post.verification
  if (post.auditResults) set.auditResults = post.auditResults.toObject ? post.auditResults.toObject() : post.auditResults

  // 1. Claim: only a still-pending post can be approved, and only once.
  const claimed = await Post.findOneAndUpdate({ _id: post._id, status: 'pending' }, { $set: set }, { new: true })
  if (!claimed) throw Object.assign(new Error('Post is not pending.'), { status: 400 })

  // 2. Release cashback exactly once per order (never for cancelled orders).
  let released = false
  let releasedAmount = 0
  const orderId = post.orderId?._id || post.orderId
  if (orderId) {
    // Only a DELIVERED order earns cashback — never processing/shipped, cancelled or returned.
    const order = await Order.findOneAndUpdate(
      { _id: orderId, cashbackReleased: false, status: 'delivered' },
      { $set: { cashbackReleased: true } },
      { new: false }, // returns the pre-update doc → cashbackAmount
    )
    if (order) {
      const creatorId = post.creatorId?._id || post.creatorId
      const amount = order.cashbackAmount
      await Transaction.create({
        userId:  creatorId,
        type:    'cashback',
        amount,
        desc:    `Cashback for ${post.campaignId?.title || 'campaign'}`,
        status:  'completed',
        orderId: order._id,
        postId:  post._id,
      })
      await User.findByIdAndUpdate(creatorId, { $inc: { totalEarnings: amount, completedCampaigns: 1 } })
      onCampaignCompleted(creatorId)   // tier bump + first-campaign referral bonus (fire-and-forget)
      await Post.updateOne({ _id: post._id }, { $set: { cashbackReleased: true } })
      releasedAmount = amount
      // Spend tracking for budget caps (Campaign.budgetUsed, module-2 Product.totalCashbackSpent)
      const campaignId = post.campaignId?._id || post.campaignId || order.campaignId
      if (campaignId) {
        const c = await Campaign.findByIdAndUpdate(campaignId, { $inc: { budgetUsed: amount } }, { new: true }).select('productId').lean().catch(() => null)
        const productId = c?.productId || order.productId
        if (productId) await Product.updateOne({ _id: productId }, { $inc: { totalCashbackSpent: amount } }).catch(() => {})
      }
      // The brand's funded balance pays for this. Keyed on the order, so an
      // approval that races itself can only ever debit once — and a ledger
      // failure never blocks money already promised to the creator.
      if (order.brandId) {
        await brandWallet.debit({
          brandId: order.brandId, amount, orderId: order._id, campaignId,
          ref: `spend:bonus:${order._id}`, desc: `Cashback bonus on ${order.product}`,
        }).catch(() => {})
        // The success fee: FlexTag only earns on rewards it actually delivered.
        await commission.chargeCommission(order)
      }
      audit.record({
        actor: approvedBy || null, action: audit.ACTIONS.CASHBACK_RELEASED,
        targetType: 'order', targetId: order._id, targetName: order.orderId, amount,
        summary: `Released ৳${amount} cashback for ${order.product}${auto ? ' (automatic verification)' : ''}`,
      })
      released = true
    }
  }

  // 3. Mirror the persisted state onto the caller's in-memory document.
  post.status = 'approved'
  post.approvedAt = now
  post.approvedBy = set.approvedBy
  post.autoApproved = set.autoApproved
  post.retention = retention
  post.retentionDeadline = retention.checkAt
  post.auditStatus = 'passed'
  post.retentionDaysRemaining = retentionDays
  if (released) post.cashbackReleased = true

  // Tell the creator (never blocks the money path)
  const creatorId = post.creatorId?._id || post.creatorId
  if (released) {
    notifySafe(creatorId, { type: 'cashback', icon: '💰', title: 'Cashback released!',
      body: `৳${(releasedAmount || 0).toLocaleString()} for ${post.campaignId?.title || 'your campaign'} is in your wallet.`, link: '/creator/wallet' })
  } else {
    notifySafe(creatorId, { type: 'post_verified', icon: '✅', title: 'Post approved',
      body: 'Your post passed verification. Keep it live for the retention period.', link: '/creator/campaign-tracker' })
  }
  return { post, released }
}

module.exports = { approvePost }
