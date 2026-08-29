const express  = require('express')
const router   = express.Router()
const Settings = require('../models/Settings')
const { requireAuth, requireRole } = require('../middleware/auth')
const { IG_SETTING_DEFAULTS, FRAUD_SETTING_DEFAULTS, BRAND_SETTING_DEFAULTS, invalidateSettingsCache } = require('../utils/settings')
const audit = require('../services/audit')

const DEFAULTS = [
  { key: 'commissionRate',  value: 10,   label: 'Commission Rate (%)',             desc: 'Platform commission from each cashback payout' },
  { key: 'listingFee',      value: 500,  label: 'Listing Fee per Campaign (৳)',    desc: 'Flat fee charged when a brand creates a campaign' },
  { key: 'featuredFee',     value: 2000, label: 'Featured Placement Fee (৳)',      desc: 'Fee for premium product placement in catalog' },
  { key: 'minWithdrawal',   value: 500,  label: 'Min Withdrawal Threshold (৳)',    desc: 'Minimum balance required for creator cashout' },
  { key: 'retentionDays',   value: 7,    label: 'Default Retention Period',        desc: 'Days a post must stay live for cashback release' },
  { key: 'maxCashback',     value: 70,   label: 'Max Cashback Rate (%)',           desc: 'Maximum cashback percentage brands can offer' },
  // Instagram audit / verification thresholds (numeric; on/off stored as 1/0)
  ...IG_SETTING_DEFAULTS,
  // Fraud thresholds (services/fraud.js)
  ...FRAUD_SETTING_DEFAULTS,
  // Brand funding (services/brandWallet.js)
  ...BRAND_SETTING_DEFAULTS,
]

// Seed defaults if not present
const seedDefaults = async () => {
  for (const d of DEFAULTS) {
    await Settings.findOneAndUpdate(
      { key: d.key },
      { $setOnInsert: d },
      { upsert: true }
    )
  }
}
seedDefaults().catch(console.error)

// ── GET /api/settings ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.find()
    const obj = {}
    settings.forEach(s => { obj[s.key] = s.value })
    res.json({ settings: obj, raw: settings })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/settings — admin updates settings ────────────────────────────
router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body // { key: value, ... }
    const results = []

    for (const [key, value] of Object.entries(updates)) {
      const before = await Settings.findOne({ key }).lean()
      const s = await Settings.findOneAndUpdate(
        { key },
        { value: Number(value) },
        { new: true }
      )
      if (s) {
        results.push(s)
        // Thresholds decide who gets paid and who gets blocked — every change
        // needs a name against it.
        if (before?.value !== s.value) {
          audit.record({
            actor: req.user, action: audit.ACTIONS.SETTINGS_CHANGED, targetType: 'settings', targetName: key,
            summary: `${key}: ${before?.value ?? '—'} → ${s.value}`, meta: { key, from: before?.value ?? null, to: s.value }, req,
          })
        }
      }
    }
    invalidateSettingsCache()

    res.json({ settings: results, message: 'Settings updated.' })
  } catch (err) {
    console.error('[settings PUT]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
