'use strict'
/**
 * Reward-split math — the ONE place order money is computed, shared by
 * routes/orders.js (COD) and routes/checkout.js (SSLCommerz) so the two
 * paths can never drift.
 *
 * A campaign's reward (price × cashbackRate%) is split by instantSplitPct:
 *   instantDiscount — taken off the price AT CHECKOUT (brand-funded discount)
 *   bonus           — released to the wallet after the post verifies
 * instantSplitPct=0 reproduces the legacy behaviour (pay full price, all
 * cashback later); 100 = pure discount with nothing gated on the post.
 */
const { computeTier, TIERS } = require('./tier')

function computeReward({ price, qty = 1, cashbackRate = 0, instantSplitPct = 0 }) {
  const gross = Math.max(0, Number(price) || 0) * Math.max(1, Number(qty) || 1)
  const rate = Math.min(100, Math.max(0, Number(cashbackRate) || 0))
  const split = Math.min(100, Math.max(0, Number(instantSplitPct) || 0))
  const rewardTotal = Math.round(gross * rate / 100)
  const instantDiscount = Math.min(rewardTotal, Math.round(rewardTotal * split / 100))
  return {
    gross,                                  // full sticker price
    rewardTotal,                            // instant + bonus (the brand's true spend)
    instantDiscount,                        // off the bill now
    bonus: rewardTotal - instantDiscount,   // released on verified post
    payable: gross - instantDiscount,       // what the creator actually pays
  }
}

/**
 * Per-order reward ceiling for creators who have NOT proven ownership of
 * their Instagram handle (bio-code verification). Caps the damage a
 * fake/multi-account can do; tiers earned by completing campaigns raise it.
 * baseCap <= 0 disables the cap. Verified creators are never capped.
 */
function rewardCapFor(user, baseCap) {
  if (!user || user.igVerified) return Infinity
  const cap = Number(baseCap)
  if (!Number.isFinite(cap) || cap <= 0) return Infinity
  const mult = TIERS[computeTier(user.completedCampaigns)]?.capX || 1
  return mult === Infinity ? Infinity : cap * mult
}

module.exports = { computeReward, rewardCapFor }
