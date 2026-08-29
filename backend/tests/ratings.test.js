'use strict'
/** Reputation math — pure helpers only (no DB, no network). */
const test = require('node:test')
const assert = require('node:assert')
const { clampStar, avg, orderScore } = require('../services/ratings')

test('clampStar: keeps every rating inside 1-5 whatever the client sends', () => {
  assert.strictEqual(clampStar(0), 1)
  assert.strictEqual(clampStar(-3), 1)
  assert.strictEqual(clampStar(9), 5)
  assert.strictEqual(clampStar('4'), 4)
  assert.strictEqual(clampStar(3.4), 3)
  assert.strictEqual(clampStar(3.6), 4)
  assert.strictEqual(clampStar(undefined), 1)
})

test('avg: two decimals, and an empty set scores 0 rather than NaN', () => {
  assert.strictEqual(avg([5, 4, 4]), 4.33)
  assert.strictEqual(avg([]), 0)
})

test('orderScore: averages the three creator scores', () => {
  assert.strictEqual(orderScore({ quality: 5, shipping: 4, support: 3 }), 4)
})

test('orderScore: a missing dimension does not drag the average to zero', () => {
  assert.strictEqual(orderScore({ quality: 5, shipping: 4 }), 4.5)
  assert.strictEqual(orderScore({}), 0)
  assert.strictEqual(orderScore(null), 0)
})
