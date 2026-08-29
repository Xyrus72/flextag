'use strict'
/**
 * Cashback fraud detection.
 *
 * The attack FlexTag actually faces isn't clever — it's one person with five
 * SIMs, five Gmail plus-addresses and one bKash number, referring themselves in
 * a ring and draining a brand's budget through orders nobody ever intended to
 * keep. Every signal below is a *shared identity* or a *velocity* signal,
 * because those are the two things a ring cannot hide while still collecting
 * the money in one place.
 *
 * Design rules:
 *  - Signals are evidence, not verdicts. Each carries a weight; the score is
 *    the sum, capped at 100, and a human decides on anything ambiguous.
 *  - Nothing here blocks money on its own. Callers ask (`guard`, `payoutHold`,
 *    `shouldAutoApprove`) and the thresholds are admin-tunable settings.
 *  - Every read is a plain query on existing collections — no fingerprinting
 *    scripts, no third-party trackers, no data we don't already hold.
 */
const mongoose = require('mongoose')
const User = require('../models/User')
const Order = require('../models/Order')
const Transaction = require('../models/Transaction')
const { getSettingsMap } = require('../utils/settings')

const DAY = 86_400_000

/** gmail dots/plus-addressing collapse to one identity — the cheapest multi-account trick. */
function canonicalEmail(email) {
  const raw = String(email || '').trim().toLowerCase()
  const [local, domain] = raw.split('@')
  if (!local || !domain) return raw
  let user = local.split('+')[0]
  if (['gmail.com', 'googlemail.com'].includes(domain)) user = user.replace(/\./g, '')
  return `${user}@${domain === 'googlemail.com' ? 'gmail.com' : domain}`
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'yopmail.com', '10minutemail.com', 'tempmail.com',
  'temp-mail.org', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com',
  'maildrop.cc', 'fakeinbox.com', 'throwawaymail.com', 'mohmal.com', 'emailondeck.com',
])

const WEIGHTS = {
  shared_payout_account: 40,   // the money lands in one wallet — the strongest signal there is
  shared_signup_ip:      18,
  shared_phone:          25,
  duplicate_identity:    35,   // same canonical email as another account
  referral_ring:         30,   // referrer and referee are the same person by another signal
  disposable_email:      15,
  order_velocity:        15,
  reward_velocity:       20,
  fake_followers:        20,
  low_ig_health:         10,
  unverified_ig:         10,
  brand_new_high_value:  15,
  return_abuse:          25,   // orders returned after the cashback was paid
}

const LEVEL = (score) => (score >= 70 ? 'high' : score >= 40 ? 'medium' : score > 0 ? 'low' : 'clear')

/** score = capped sum of signal weights. Pure — this is what the tests pin down. */
function scoreSignals(signals = []) {
  const score = Math.min(100, signals.reduce((sum, s) => sum + (Number(s?.weight) || 0), 0))
  return { score, level: LEVEL(score), flags: signals.map(s => s.code) }
}

async function fraudSettings() {
  const m = await getSettingsMap().catch(() => ({}))
  const n = (k, fb) => (Number.isFinite(Number(m[k])) ? Number(m[k]) : fb)
  return {
    blockScore:      Math.max(0, n('fraudBlockScore', 80)),      // refuse new orders at/above this
    holdPayoutScore: Math.max(0, n('fraudHoldPayoutScore', 60)), // payouts need a human at/above this
    reviewScore:     Math.max(0, n('fraudReviewScore', 40)),     // no auto-approval at/above this
    maxOrdersPerDay: Math.max(1, n('fraudMaxOrdersPerDay', 5)),
    enforce:         n('fraudEnforce', 1) !== 0,
  }
}

/**
 * Gather evidence about one creator.
 * @returns {Promise<{ score:number, level:string, flags:string[], signals:Array<{code:string,label:string,weight:number,detail:string,related?:string[]}> }>}
 */
async function assess(userOrId, { persist = true } = {}) {
  const user = typeof userOrId === 'object' && userOrId?._id ? userOrId : await User.findById(userOrId)
  if (!user) return { score: 0, level: 'clear', flags: [], signals: [] }

  const uid = user._id
  const settings = await fraudSettings()
  const signals = []
  const add = (code, label, detail, related) => signals.push({ code, label, weight: WEIGHTS[code] || 0, detail, related })

  const [
    payoutAccounts, sameIpUsers, samePhoneUsers, emailTwins,
    ordersToday, inFlight, referrer, returnedAfterPayout,
  ] = await Promise.all([
    Transaction.find({ userId: uid, type: 'withdrawal', payoutAccount: { $ne: '' } }).distinct('payoutAccount'),
    user.signupIp ? User.find({ _id: { $ne: uid }, signupIp: user.signupIp }).select('name email role').limit(10).lean() : [],
    user.phone ? User.find({ _id: { $ne: uid }, phone: user.phone }).select('name email').limit(10).lean() : [],
    User.find({ _id: { $ne: uid }, emailCanonical: canonicalEmail(user.email) }).select('email').limit(10).lean(),
    Order.countDocuments({ creatorId: uid, createdAt: { $gte: new Date(Date.now() - DAY) } }),
    Order.aggregate([
      { $match: { creatorId: new mongoose.Types.ObjectId(String(uid)), status: { $nin: ['cancelled', 'returned'] }, cashbackReleased: false } },
      { $group: { _id: null, total: { $sum: '$rewardTotal' } } },
    ]),
    user.referredBy ? User.findById(user.referredBy).select('signupIp phone name').lean() : null,
    Order.countDocuments({ creatorId: uid, cashbackClawedBack: true }),
  ])

  // ── Shared identity ──────────────────────────────────────────────────────
  if (payoutAccounts.length) {
    const others = await Transaction.find({
      userId: { $ne: uid }, type: 'withdrawal', payoutAccount: { $in: payoutAccounts },
    }).distinct('userId')
    if (others.length) {
      add('shared_payout_account', 'Payout number shared with other accounts',
        `${others.length} other account${others.length === 1 ? '' : 's'} withdraw to the same mobile number.`,
        others.map(String))
    }
  }
  if (sameIpUsers.length) {
    add('shared_signup_ip', 'Signed up from the same IP as other accounts',
      `${sameIpUsers.length} other account${sameIpUsers.length === 1 ? '' : 's'} registered from ${user.signupIp}: ${sameIpUsers.map(u => u.name).join(', ')}.`,
      sameIpUsers.map(u => String(u._id)))
  }
  if (samePhoneUsers.length) {
    add('shared_phone', 'Phone number reused across accounts',
      `Same phone as: ${samePhoneUsers.map(u => u.name).join(', ')}.`,
      samePhoneUsers.map(u => String(u._id)))
  }
  if (emailTwins.length) {
    add('duplicate_identity', 'Same email identity as another account',
      `${emailTwins.map(u => u.email).join(', ')} normalise to the same inbox (dots and +tags stripped).`,
      emailTwins.map(u => String(u._id)))
  }
  if (DISPOSABLE_DOMAINS.has(String(user.email || '').split('@')[1])) {
    add('disposable_email', 'Disposable email domain', `${user.email} is a throwaway inbox provider.`)
  }

  // ── Referral ring ────────────────────────────────────────────────────────
  if (referrer) {
    const sameIp = referrer.signupIp && referrer.signupIp === user.signupIp
    const samePhone = referrer.phone && referrer.phone === user.phone
    if (sameIp || samePhone) {
      add('referral_ring', 'Referred by an account that looks like the same person',
        `Referrer "${referrer.name}" shares ${[sameIp && 'a signup IP', samePhone && 'a phone number'].filter(Boolean).join(' and ')}.`,
        [String(user.referredBy)])
    }
  }

  // ── Velocity ─────────────────────────────────────────────────────────────
  if (ordersToday > settings.maxOrdersPerDay) {
    add('order_velocity', 'Unusual order burst', `${ordersToday} orders in the last 24 hours (limit ${settings.maxOrdersPerDay}).`)
  }
  const pendingReward = inFlight[0]?.total || 0
  if (pendingReward > 5000 && !user.igVerified) {
    add('reward_velocity', 'Large unreleased reward on an unverified account', `৳${pendingReward.toLocaleString()} of reward is in flight.`)
  }
  const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / DAY
  if (ageDays < 3 && pendingReward > 2000) {
    add('brand_new_high_value', 'Brand-new account chasing large rewards', `Account is ${ageDays.toFixed(1)} days old with ৳${pendingReward.toLocaleString()} in flight.`)
  }
  if (returnedAfterPayout > 0) {
    add('return_abuse', 'Returns after cashback was paid', `${returnedAfterPayout} order${returnedAfterPayout === 1 ? '' : 's'} clawed back.`)
  }

  // ── Audience quality (already measured by the Instagram audit) ───────────
  if (Number(user.igFakeFollowerPct) >= 35) {
    add('fake_followers', 'High estimated fake-follower share', `${user.igFakeFollowerPct}% of the sampled followers look inauthentic.`)
  }
  if (user.igHealthScore !== null && user.igHealthScore !== undefined && Number(user.igHealthScore) < 40) {
    add('low_ig_health', 'Weak Instagram health score', `Health score ${user.igHealthScore}/100.`)
  }
  if (!user.igVerified && signals.length) {
    add('unverified_ig', 'Instagram ownership never proven', 'No bio-code verification on file, so the handle may not be theirs.')
  }

  // An admin who has looked at the evidence and vouched for the account keeps
  // the signals visible but stops them scoring — otherwise every rescan would
  // re-flag the same known-good family/office/shared-IP case forever.
  const result = user.riskWhitelisted
    ? { score: 0, level: 'clear', flags: [] }
    : scoreSignals(signals)
  const out = { ...result, signals, whitelisted: !!user.riskWhitelisted }

  if (persist) {
    await User.updateOne({ _id: uid }, { $set: {
      riskScore: out.score, riskLevel: out.level, riskFlags: out.flags, riskCheckedAt: new Date(),
    } }).catch(() => {})
  }
  return out
}

/** Cheap, cached-enough read for the money path: has an admin blocked them, or is the stored score damning? */
async function guard(user, { action = 'order' } = {}) {
  if (!user) return { allowed: true }
  if (user.blocked) {
    return { allowed: false, reason: user.blockReason || 'This account is on hold. Contact support@flextag.com.' }
  }
  const settings = await fraudSettings()
  if (!settings.enforce) return { allowed: true }
  const score = Number(user.riskScore) || 0
  const threshold = action === 'payout' ? settings.holdPayoutScore : settings.blockScore
  if (score >= threshold) {
    return {
      allowed: false,
      reason: action === 'payout'
        ? 'This payout needs a manual review before it can be sent.'
        : 'Your account is under review. Please contact support before ordering again.',
      score,
    }
  }
  return { allowed: true, score }
}

/** Should a verified post release money automatically, or wait for a human? */
async function shouldAutoApprove(userId) {
  const user = await User.findById(userId).select('riskScore blocked').lean().catch(() => null)
  if (!user) return true
  if (user.blocked) return false
  const settings = await fraudSettings()
  if (!settings.enforce) return true
  return (Number(user.riskScore) || 0) < settings.reviewScore
}

/** Re-assess in the background after a money event. Never throws into the caller. */
function assessInBackground(userId) {
  setImmediate(() => { assess(userId).catch(err => console.warn('[fraud] assess failed:', err.message)) })
}

module.exports = {
  assess, assessInBackground, guard, shouldAutoApprove, scoreSignals,
  canonicalEmail, fraudSettings, WEIGHTS, LEVEL,
}
