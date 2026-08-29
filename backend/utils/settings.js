'use strict'
/**
 * Typed access to admin-editable Settings (key/value docs) with env fallbacks
 * and a short in-process cache. routes/settings.js seeds IG_SETTING_DEFAULTS
 * so they show up in the admin Commission & Settings page.
 *
 * All values are NUMERIC because PUT /api/settings coerces with Number():
 * booleans are stored as 1/0.
 */
const Settings = require('../models/Settings')

const envNum = (name, fallback) => {
  const v = Number(process.env[name])
  return Number.isFinite(v) ? v : fallback
}

const IG_SETTING_DEFAULTS = [
  { key: 'igMinFollowers',     value: envNum('IG_MIN_FOLLOWERS', 1000), label: 'IG Minimum Followers',        desc: 'Creators need at least this many Instagram followers to register' },
  { key: 'igBlockPrivate',     value: 1,                                label: 'IG Block Private Accounts',    desc: '1 = private Instagram accounts cannot register, 0 = allow' },
  { key: 'igPrecheckEnforce',  value: process.env.IG_PRECHECK_MODE === 'advisory' ? 0 : 1, label: 'IG Enforce Check at Signup', desc: '1 = block ineligible accounts at signup, 0 = only warn (advisory)' },
  { key: 'igAutoApprovePosts', value: 1,                                label: 'IG Auto-approve Verified Posts', desc: '1 = release cashback automatically when every post check passes, 0 = manual review' },
  { key: 'igAuditTtlDays',     value: envNum('IG_AUDIT_TTL_DAYS', 7),   label: 'IG Audit Freshness (days)',    desc: 'Re-use a cached audit for this many days before re-fetching' },
  { key: 'igFollowerSample',   value: envNum('IG_FOLLOWER_SAMPLE', 200), label: 'IG Follower Sample Size',     desc: 'How many followers to sample for the fake-follower estimate (max 500)' },
  { key: 'igPostsToFetch',     value: envNum('IG_POSTS_TO_FETCH', 30),  label: 'IG Posts to Analyze',          desc: 'How many recent posts to pull per audit (max 60)' },
  { key: 'igUnverifiedRewardCap', value: envNum('IG_UNVERIFIED_REWARD_CAP', 500), label: 'Unverified Reward Cap (৳/order)', desc: 'Max reward per order for creators who have not bio-verified their Instagram (0 = no cap; higher tiers multiply it)' },
]

// Fraud thresholds — admin-tunable so a launch-week false positive can be
// loosened without a deploy. All numeric (PUT /api/settings coerces with Number).
const FRAUD_SETTING_DEFAULTS = [
  { key: 'fraudEnforce',        value: 1,  label: 'Fraud Rules Enforced',          desc: '1 = act on risk scores (block/hold), 0 = only score and show in the admin queue' },
  { key: 'fraudBlockScore',     value: 80, label: 'Block Orders at Risk Score',    desc: 'Creators at or above this risk score cannot place new orders' },
  { key: 'fraudHoldPayoutScore',value: 60, label: 'Hold Payouts at Risk Score',    desc: 'Payouts at or above this score need a human decision before sending' },
  { key: 'fraudReviewScore',    value: 40, label: 'Manual Post Review at Score',   desc: 'Verified posts stop auto-releasing cashback at or above this score' },
  { key: 'fraudMaxOrdersPerDay',value: 5,  label: 'Order Burst Limit (per day)',   desc: 'More orders than this in 24h raises a velocity flag' },
]

// Brand funding (services/brandWallet.js). Enforcement is OFF by default:
// turning it on starts refusing orders on campaigns whose brand has not funded.
const BRAND_SETTING_DEFAULTS = [
  { key: 'requireBrandFunding',  value: 0,    label: 'Require Funded Brand Balance', desc: '1 = refuse orders when the brand has no funded balance left, 0 = track only' },
  { key: 'brandMinFunding',      value: 1000, label: 'Minimum Brand Top-Up (৳)',     desc: 'Smallest amount a brand can add to their campaign balance' },
  { key: 'brandLowBalanceAlert', value: 2000, label: 'Brand Low-Balance Alert (৳)',  desc: 'Warn the brand once their balance drops to this' },
]

let cache = { at: 0, map: null }
const CACHE_MS = 30_000

async function getSettingsMap({ fresh = false } = {}) {
  if (!fresh && cache.map && Date.now() - cache.at < CACHE_MS) return cache.map
  const docs = await Settings.find().lean()
  const map = {}
  for (const d of [...IG_SETTING_DEFAULTS, ...FRAUD_SETTING_DEFAULTS, ...BRAND_SETTING_DEFAULTS]) map[d.key] = d.value
  for (const d of docs) map[d.key] = d.value
  cache = { at: Date.now(), map }
  return map
}

/** Effective Instagram settings with sane clamps. */
async function getIgSettings(opts) {
  const m = await getSettingsMap(opts)
  const n = (k, fb) => (Number.isFinite(Number(m[k])) ? Number(m[k]) : fb)
  return {
    minFollowers: Math.max(0, n('igMinFollowers', 1000)),
    blockPrivate: n('igBlockPrivate', 1) !== 0,
    precheckEnforce: n('igPrecheckEnforce', 1) !== 0,
    autoApprovePosts: n('igAutoApprovePosts', 1) !== 0,
    auditTtlDays: Math.max(0, n('igAuditTtlDays', 7)),
    followerSample: Math.min(500, Math.max(0, n('igFollowerSample', 200))),
    postsToFetch: Math.min(60, Math.max(6, n('igPostsToFetch', 30))),
    retentionDays: Math.max(0, n('retentionDays', 7)),
    unverifiedRewardCap: Math.max(0, n('igUnverifiedRewardCap', 500)),
  }
}

function invalidateSettingsCache() { cache = { at: 0, map: null } }

module.exports = { IG_SETTING_DEFAULTS, FRAUD_SETTING_DEFAULTS, BRAND_SETTING_DEFAULTS, getSettingsMap, getIgSettings, invalidateSettingsCache }
