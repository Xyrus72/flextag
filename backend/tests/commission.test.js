'use strict'
/** Commission math — the platform's revenue rules, pinned down. */
const test = require('node:test')
const assert = require('node:assert')
const { commissionOn } = require('../services/commission')

test('10% of a ৳400 reward is ৳40', () => {
  assert.strictEqual(commissionOn(400, 10), 40)
})

test('the platform rounds DOWN — never in its own favour', () => {
  assert.strictEqual(commissionOn(333, 10), 33)   // not 33.3, not 34
  assert.strictEqual(commissionOn(999, 15), 149)  // 149.85 → 149
})

test('rate 0 means the whole engine is off', () => {
  assert.strictEqual(commissionOn(1000, 0), 0)
})

test('a runaway rate is clamped at 50% — a typo cannot take most of a reward', () => {
  assert.strictEqual(commissionOn(1000, 500), 500)
  assert.strictEqual(commissionOn(1000, 50), 500)
})

test('garbage in, zero out — never a NaN on the books', () => {
  assert.strictEqual(commissionOn(NaN, 10), 0)
  assert.strictEqual(commissionOn(-500, 10), 0)
  assert.strictEqual(commissionOn(1000, NaN), 0)
  assert.strictEqual(commissionOn(undefined, undefined), 0)
})
