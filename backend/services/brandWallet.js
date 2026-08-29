'use strict'
/**
 * Brand balance: what a brand has funded, minus what the platform has paid out
 * on their behalf.
 *
 * Design rules, learned from the creator wallet:
 *  - ONE definition of the balance (`computeBrandBalance`), used by the brand's
 *    own page, the funding flow, the spend path and the admin float view.
 *  - Spends are idempotent by `ref`, because they are triggered from webhook-ish
 *    paths (payment confirmations, post approvals) that legitimately fire twice.
 *  - Nothing here throws into the money path. A brand ledger write must never be
 *    the reason a creator's cashback fails to release — if the debit can't be
 *    recorded, the reward still goes out and the row is logged as owed.
 *  - Enforcement is opt-in (`requireBrandFunding` setting, default off), so
 *    turning the ledger on does not retroactively freeze existing campaigns.
 */
const BrandLedger = require('../models/BrandLedger')
const { getSettingsMap } = require('../utils/settings')
const { notifySafe } = require('./notifications')

const CREDIT = new Set(['funding', 'refund'])
const DEBIT = new Set(['spend', 'fee'])

/** @param {Array<{type:string,status:string,amount:number}>} rows */
function computeBrandBalance(rows = []) {
  let funded = 0, refunded = 0, spent = 0, fees = 0, pending = 0
  for (const r of rows) {
    const amount = Number(r?.amount) || 0
    if (amount <= 0) continue
    if (r.status === 'pending') { if (r.type === 'funding') pending += amount; continue }
    if (r.status !== 'completed') continue
    if (r.type === 'funding') funded += amount
    else if (r.type === 'refund') refunded += amount
    else if (r.type === 'spend') spent += amount
    else if (r.type === 'fee') fees += amount
  }
  const balance = funded + refunded - spent - fees
  return { funded, refunded, spent, fees, pendingFunding: pending, balance }
}

async function brandBalance(brandId) {
  const rows = await BrandLedger.find({ brandId }).select('type status amount').lean()
  return computeBrandBalance(rows)
}

/**
 * Record money the platform paid out on a brand's behalf. Idempotent by `ref`.
 * @returns {Promise<boolean>} true when this call created the row
 */
async function debit({ brandId, amount, ref, desc = '', orderId, campaignId, productId, type = 'spend' }) {
  if (!brandId || !(Number(amount) > 0)) return false
  try {
    await BrandLedger.create({ brandId, type, amount: Number(amount), status: 'completed', ref, desc, orderId, campaignId, productId })
    lowBalanceCheck(brandId).catch(() => {})
    return true
  } catch (err) {
    // Duplicate key = this spend was already recorded. That is the guard working.
    if (err?.code === 11000) return false
    console.warn('[brandWallet] debit failed (reward still went out):', err.message)
    return false
  }
}

/** Hand money back — cancelled/returned order, closed campaign. Idempotent by `ref`. */
async function credit({ brandId, amount, ref, desc = '', orderId, campaignId, type = 'refund' }) {
  if (!brandId || !(Number(amount) > 0)) return false
  try {
    await BrandLedger.create({ brandId, type, amount: Number(amount), status: 'completed', ref, desc, orderId, campaignId })
    return true
  } catch (err) {
    if (err?.code === 11000) return false
    console.warn('[brandWallet] credit failed:', err.message)
    return false
  }
}

async function settings() {
  const m = await getSettingsMap().catch(() => ({}))
  const n = (k, fb) => (Number.isFinite(Number(m[k])) ? Number(m[k]) : fb)
  return {
    enforce: n('requireBrandFunding', 0) !== 0,
    lowBalanceAlert: Math.max(0, n('brandLowBalanceAlert', 2000)),
    minFunding: Math.max(100, n('brandMinFunding', 1000)),
  }
}

/**
 * Can this brand afford one more order's reward?
 * Off by default — turning `requireBrandFunding` on is a deliberate decision to
 * start refusing orders brands haven't funded.
 */
async function canAfford(brandId, amount) {
  const s = await settings()
  if (!s.enforce) return { allowed: true, enforced: false }
  const { balance } = await brandBalance(brandId)
  if (balance >= Number(amount || 0)) return { allowed: true, enforced: true, balance }
  return {
    allowed: false,
    enforced: true,
    balance,
    reason: 'This brand has run out of funded budget — they have been told, and it usually comes back within a day.',
  }
}

/** Warn a brand once they drop under the alert threshold. */
async function lowBalanceCheck(brandId) {
  const s = await settings()
  if (!s.lowBalanceAlert) return
  const { balance } = await brandBalance(brandId)
  if (balance > s.lowBalanceAlert) return
  // Only nag once a day: look for a recent notification-worthy dip.
  const since = new Date(Date.now() - 86_400_000)
  const recentDip = await BrandLedger.exists({ brandId, type: 'spend', createdAt: { $gte: since }, desc: /low-balance-notified/ })
  if (recentDip) return
  notifySafe(brandId, {
    type: 'wallet', icon: '⚠️', title: balance <= 0 ? 'Your campaign balance is empty' : 'Low campaign balance',
    body: balance <= 0
      ? 'Creators cannot be rewarded from an empty balance — top up to keep your campaigns running.'
      : `Only ৳${balance.toLocaleString()} left. Top up before it stops your campaigns.`,
    link: '/brand/wallet',
  })
}

module.exports = { computeBrandBalance, brandBalance, debit, credit, canAfford, settings, lowBalanceCheck, CREDIT, DEBIT }
