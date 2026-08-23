'use strict'
/**
 * Referral program + tier maintenance.
 * - Every user gets a referralCode; signing up with ?ref=CODE links referredBy.
 * - When a referred creator completes their FIRST campaign, both the referrer
 *   and the referee get a one-time wallet bonus.
 * - Tier is recomputed from completedCampaigns whenever a campaign completes.
 * All helpers are safe to call from the money path (never throw).
 */
const crypto = require('crypto')
const User = require('../models/User')
const Transaction = require('../models/Transaction')
const { notifySafe } = require('./notifications')
const { computeTier } = require('../utils/tier')

const REFERRAL_BONUS = Number(process.env.REFERRAL_BONUS) || 100

async function generateReferralCode() {
  for (let i = 0; i < 6; i++) {
    const code = 'FLEX' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6)
    if (!(await User.exists({ referralCode: code }))) return code
  }
  return 'FLEX' + Date.now().toString(36).toUpperCase().slice(-6)
}

/** Resolve a referral code → referrer id (null if invalid or self). */
async function resolveReferrer(code, selfId) {
  if (!code) return null
  const u = await User.findOne({ referralCode: String(code).trim().toUpperCase() }).select('_id').lean()
  if (!u || (selfId && String(u._id) === String(selfId))) return null
  return u._id
}

/**
 * Called after a creator's completedCampaigns is incremented (post approval →
 * cashback). Updates their tier; on the first completion, pays the referral
 * bonus to both parties exactly once.
 */
async function onCampaignCompleted(creatorId) {
  try {
    const u = await User.findById(creatorId).select('completedCampaigns tier referredBy referralRewarded name')
    if (!u) return
    const tier = computeTier(u.completedCampaigns)
    if (tier !== u.tier) await User.updateOne({ _id: u._id }, { $set: { tier } })

    if (u.completedCampaigns === 1 && u.referredBy && !u.referralRewarded) {
      // Atomic claim so the bonus can't be paid twice under concurrency.
      const claimed = await User.findOneAndUpdate({ _id: u._id, referralRewarded: { $ne: true } }, { $set: { referralRewarded: true } })
      if (claimed) {
        for (const [uid, desc] of [
          [u.referredBy, `Referral bonus — ${u.name} completed their first campaign 🎉`],
          [u._id,        'Welcome bonus for joining via a referral 🎁'],
        ]) {
          await Transaction.create({ userId: uid, type: 'top_up', amount: REFERRAL_BONUS, desc, status: 'completed' }).catch(() => {})
          notifySafe(uid, { type: 'referral', icon: '🎁', title: 'Referral bonus!', body: `৳${REFERRAL_BONUS} added to your wallet.`, link: '/creator/wallet' })
        }
      }
    }
  } catch (err) {
    console.warn('[referrals] onCampaignCompleted:', err.message)
  }
}

module.exports = { generateReferralCode, resolveReferrer, onCampaignCompleted, REFERRAL_BONUS }
