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

let cache = { at: 0, map: null }
const CACHE_MS = 30_000

async function getSettingsMap({ fresh = false } = {}) {
  if (!fresh && cache.map && Date.now() - cache.at < CACHE_MS) return cache.map
  const docs = await Settings.find().lean()
  const map = {}
  for (const d of IG_SETTING_DEFAULTS) map[d.key] = d.value
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

module.exports = { IG_SETTING_DEFAULTS, getSettingsMap, getIgSettings, invalidateSettingsCache }
