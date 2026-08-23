'use strict'
/** Creator tier from completed campaigns — unlocks perks (priority in discovery, badges). */
function computeTier(completedCampaigns) {
  const n = Number(completedCampaigns) || 0
  if (n >= 25) return 'platinum'
  if (n >= 10) return 'gold'
  if (n >= 3)  return 'silver'
  return 'bronze'
}

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum']
const TIERS = {
  bronze:   { min: 0,  perk: 'Standard cashback' },
  silver:   { min: 3,  perk: 'Priority in brand discovery' },
  gold:     { min: 10, perk: 'Priority + featured portfolio' },
  platinum: { min: 25, perk: 'Top priority + early campaign access' },
}

module.exports = { computeTier, TIER_ORDER, TIERS }
