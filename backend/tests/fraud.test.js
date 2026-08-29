'use strict'
/** Fraud scoring rules — pure functions only (no DB, no network). */
const test = require('node:test')
const assert = require('node:assert')
const { scoreSignals, canonicalEmail, WEIGHTS, LEVEL } = require('../services/fraud')

const sig = (code) => ({ code, weight: WEIGHTS[code] })

test('canonicalEmail: gmail dots and +tags are the same inbox', () => {
  assert.strictEqual(canonicalEmail('Ref.Ath+flex1@gmail.com'), 'refath@gmail.com')
  assert.strictEqual(canonicalEmail('refath@googlemail.com'), 'refath@gmail.com')
})

test('canonicalEmail: non-gmail keeps its dots (they are significant there)', () => {
  assert.strictEqual(canonicalEmail('first.last+tag@outlook.com'), 'first.last@outlook.com')
})

test('canonicalEmail: garbage in, garbage out — never throws', () => {
  assert.strictEqual(canonicalEmail(null), '')
  assert.strictEqual(canonicalEmail('not-an-email'), 'not-an-email')
})

test('score: one shared payout number alone is enough to need a human', () => {
  const { score, level } = scoreSignals([sig('shared_payout_account')])
  assert.strictEqual(score, 40)
  assert.strictEqual(level, 'medium')
})

test('score: the classic ring — shared number + shared IP + self-referral — reads high', () => {
  const { score, level, flags } = scoreSignals([
    sig('shared_payout_account'), sig('shared_signup_ip'), sig('referral_ring'),
  ])
  assert.strictEqual(score, 88)
  assert.strictEqual(level, 'high')
  assert.deepStrictEqual(flags, ['shared_payout_account', 'shared_signup_ip', 'referral_ring'])
})

test('score: audience-quality flags alone stay below the order-block threshold (80)', () => {
  const { score } = scoreSignals([sig('fake_followers'), sig('low_ig_health'), sig('unverified_ig')])
  assert.ok(score < 80, `expected < 80, got ${score}`)
})

test('score: never exceeds 100 however many signals pile up', () => {
  const { score } = scoreSignals(Object.keys(WEIGHTS).map(sig))
  assert.strictEqual(score, 100)
})

test('score: no signals means clear, and unknown weights do not poison the sum', () => {
  assert.deepStrictEqual(scoreSignals([]), { score: 0, level: 'clear', flags: [] })
  assert.strictEqual(scoreSignals([{ code: 'made_up' }]).score, 0)
})

test('levels line up with the enforcement thresholds', () => {
  assert.strictEqual(LEVEL(0), 'clear')
  assert.strictEqual(LEVEL(39), 'low')
  assert.strictEqual(LEVEL(40), 'medium')
  assert.strictEqual(LEVEL(70), 'high')
})
