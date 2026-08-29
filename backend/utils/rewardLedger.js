'use strict'
/**
 * Budget bookkeeping for the instant half of the reward split.
 *
 * The instant discount is brand money committed to Campaign.budgetUsed /
 * Product.totalCashbackSpent when an order becomes real (COD: at creation;
 * SSLCommerz: when the payment confirms) and handed back if the order later
 * dies (cancelled/returned). Both directions claim Order.instantCommitted
 * ATOMICALLY first, so no path — status route, checkout callbacks, replays,
 * cancel→revive→cancel loops — can ever double-count or double-refund.
 * The bonus half is accounted separately by services/postApproval.js.
 */
const mongoose = require('mongoose')
const Order = require('../models/Order')
const Campaign = require('../models/Campaign')
const Product = require('../models/Product')

async function applyInstant(order, direction) {
  const amount = Number(order.instantDiscount) || 0
  if (amount <= 0) return false
  // Claim the flag first; only the claimer touches the budget counters.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, instantCommitted: direction === 'reclaim' },
    { $set: { instantCommitted: direction === 'commit' } },
  ).catch(() => null)
  if (!claimed) return false
  const inc = direction === 'commit' ? amount : -amount
  if (order.campaignId) await Campaign.updateOne({ _id: order.campaignId }, { $inc: { budgetUsed: inc } }).catch(() => {})
  if (order.productId) await Product.updateOne({ _id: order.productId }, { $inc: { totalCashbackSpent: inc } }).catch(() => {})
  return true
}

const commitInstant = (order) => applyInstant(order, 'commit')
const reclaimInstant = (order) => applyInstant(order, 'reclaim')

/**
 * Total reward (instant + bonus) a creator currently has "in flight" — live
 * orders whose bonus hasn't been released yet. The unverified-creator cap is
 * enforced against this sum, so it can't be dodged with many small orders.
 */
async function inFlightReward(creatorId) {
  const rows = await Order.aggregate([
    { $match: {
      creatorId: new mongoose.Types.ObjectId(String(creatorId)),
      status: { $nin: ['cancelled', 'returned'] },
      cashbackReleased: false,
    } },
    { $group: { _id: null, total: { $sum: '$rewardTotal' } } },
  ])
  return rows[0]?.total || 0
}

module.exports = { commitInstant, reclaimInstant, inFlightReward }
