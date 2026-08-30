'use strict'
/**
 * Platform commission — how FlexTag actually earns.
 *
 * Until now the "Commission Rate (%)" setting existed, the admin dashboard
 * displayed "commission revenue"… and no commission was ever charged. The
 * number was an estimate multiplied on at display time. A platform whose
 * revenue is a display-time estimate has no revenue.
 *
 * The model, kept deliberately simple to explain to a Dhaka brand owner:
 *   FlexTag takes commissionRate% of each reward it successfully delivers.
 * Charged when the reward is actually delivered (the moment cashback is
 *   released on a verified post), as a real `fee` row in the brand's ledger —
 *   so it shows on their statement, reduces their balance, and sums into the
 *   platform's books with no ×0.10 anywhere.
 * Refunded when the reward is clawed back (order returned after payout):
 *   FlexTag does not keep a success fee on a failed transaction. That is not
 *   generosity — it is the pricing pitch: "we only earn when it works."
 *
 * Idempotent by ledger ref (`fee:commission:<orderId>`), so approval paths
 * racing each other can never double-charge, and refunds can never double-pay.
 * commissionRate = 0 turns the whole thing off.
 */
const brandWallet = require('./brandWallet')
const { getSettingsMap } = require('../utils/settings')

/** The admin-set rate, clamped to something sane. */
async function commissionRate() {
  const m = await getSettingsMap().catch(() => ({}))
  const rate = Number(m.commissionRate)
  if (!Number.isFinite(rate)) return 10
  return Math.min(50, Math.max(0, rate))
}

/** ৳ commission on one reward, rounded down — the platform never rounds in its own favour. */
function commissionOn(rewardTotal, rate) {
  const base = Math.max(0, Number(rewardTotal) || 0)
  const pct = Math.min(50, Math.max(0, Number(rate) || 0))
  return Math.floor(base * pct / 100)
}

/**
 * Charge the success fee for one delivered reward. Call AFTER the reward is
 * irrevocably released. Never throws — a billing failure must not undo a
 * creator's cashback; it logs and the row can be added by hand.
 * @returns {Promise<number>} the amount charged (0 = disabled or already charged)
 */
async function chargeCommission(order) {
  try {
    if (!order?.brandId) return 0
    const rate = await commissionRate()
    const amount = commissionOn(order.rewardTotal || order.cashbackAmount, rate)
    if (amount <= 0) return 0
    const created = await brandWallet.debit({
      brandId: order.brandId,
      amount,
      type: 'fee',
      ref: `fee:commission:${order._id}`,
      orderId: order._id,
      campaignId: order.campaignId,
      desc: `FlexTag commission (${rate}%) — ${order.product}`,
    })
    return created ? amount : 0
  } catch (err) {
    console.warn('[commission] charge failed (reward unaffected):', err.message)
    return 0
  }
}

/** Hand the fee back when the reward it was charged on is clawed back. */
async function refundCommission(order) {
  try {
    if (!order?.brandId) return 0
    // Refund exactly what was charged — read the fee row, don't recompute
    // (the admin may have changed the rate since).
    const BrandLedger = require('../models/BrandLedger')
    const feeRow = await BrandLedger.findOne({ brandId: order.brandId, ref: `fee:commission:${order._id}` }).lean()
    if (!feeRow) return 0
    const created = await brandWallet.credit({
      brandId: order.brandId,
      amount: feeRow.amount,
      ref: `refund:commission:${order._id}`,
      orderId: order._id,
      campaignId: order.campaignId,
      desc: `Commission refunded — ${order.product} was returned`,
    })
    return created ? feeRow.amount : 0
  } catch (err) {
    console.warn('[commission] refund failed:', err.message)
    return 0
  }
}

/**
 * The platform's real books, from real rows: fees charged minus fees refunded.
 * This replaces every ×0.10 estimate in the admin dashboards.
 */
async function platformRevenue() {
  const BrandLedger = require('../models/BrandLedger')
  const rows = await BrandLedger.aggregate([
    { $match: { status: 'completed', ref: { $regex: '^(fee|refund):commission:' } } },
    { $group: {
      _id: null,
      charged:  { $sum: { $cond: [{ $eq: ['$type', 'fee'] }, '$amount', 0] } },
      refunded: { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, '$amount', 0] } },
      count:    { $sum: { $cond: [{ $eq: ['$type', 'fee'] }, 1, 0] } },
    } },
  ])
  const r = rows[0] || { charged: 0, refunded: 0, count: 0 }
  return { revenue: Math.max(0, r.charged - r.refunded), charged: r.charged, refunded: r.refunded, transactions: r.count }
}

module.exports = { commissionRate, commissionOn, chargeCommission, refundCommission, platformRevenue }
