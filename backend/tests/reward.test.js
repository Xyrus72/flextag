'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { computeReward, rewardCapFor } = require('../utils/reward')

test('computeReward: legacy behaviour at split 0 — full price now, all reward later', () => {
  const r = computeReward({ price: 1000, qty: 2, cashbackRate: 50, instantSplitPct: 0 })
  assert.deepStrictEqual(r, { gross: 2000, rewardTotal: 1000, instantDiscount: 0, bonus: 1000, payable: 2000 })
})

test('computeReward: 50/50 split halves the bill reduction and the bonus', () => {
  const r = computeReward({ price: 1000, qty: 1, cashbackRate: 50, instantSplitPct: 50 })
  assert.strictEqual(r.instantDiscount, 250)
  assert.strictEqual(r.bonus, 250)
  assert.strictEqual(r.payable, 750)
})

test('computeReward: 100% split = pure discount, nothing gated on the post', () => {
  const r = computeReward({ price: 800, qty: 1, cashbackRate: 25, instantSplitPct: 100 })
  assert.strictEqual(r.instantDiscount, 200)
  assert.strictEqual(r.bonus, 0)
  assert.strictEqual(r.payable, 600)
})

test('computeReward: rounding never leaks money — parts always sum exactly', () => {
  for (const price of [999, 1234, 555]) {
    for (const rate of [33, 47, 15]) {
      for (const split of [1, 33, 50, 66, 99]) {
        const r = computeReward({ price, qty: 1, cashbackRate: rate, instantSplitPct: split })
        assert.strictEqual(r.instantDiscount + r.bonus, r.rewardTotal, `${price}/${rate}/${split} reward split leaks`)
        assert.strictEqual(r.payable + r.instantDiscount, r.gross, `${price}/${rate}/${split} bill split leaks`)
        assert.ok(r.instantDiscount >= 0 && r.bonus >= 0 && r.payable >= 0)
      }
    }
  }
})

test('computeReward: clamps garbage input instead of paying out on it', () => {
  const r = computeReward({ price: -50, qty: 0, cashbackRate: 250, instantSplitPct: 999 })
  assert.strictEqual(r.gross, 0)
  assert.strictEqual(r.rewardTotal, 0)
  assert.strictEqual(r.payable, 0)
})

test('rewardCapFor: verified creators are never capped', () => {
  assert.strictEqual(rewardCapFor({ igVerified: true, completedCampaigns: 0 }, 500), Infinity)
})

test('rewardCapFor: unverified bronze gets the base cap, tiers multiply it', () => {
  assert.strictEqual(rewardCapFor({ igVerified: false, completedCampaigns: 0 }, 500), 500)     // bronze ×1
  assert.strictEqual(rewardCapFor({ igVerified: false, completedCampaigns: 3 }, 500), 1000)    // silver ×2
  assert.strictEqual(rewardCapFor({ igVerified: false, completedCampaigns: 10 }, 500), 2000)   // gold ×4
  assert.strictEqual(rewardCapFor({ igVerified: false, completedCampaigns: 25 }, 500), Infinity) // platinum
})

test('rewardCapFor: cap 0 (or unset) disables the cap', () => {
  assert.strictEqual(rewardCapFor({ igVerified: false, completedCampaigns: 0 }, 0), Infinity)
  assert.strictEqual(rewardCapFor({ igVerified: false, completedCampaigns: 0 }, undefined), Infinity)
})
