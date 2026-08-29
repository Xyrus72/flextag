'use strict'
/** Pure money-path tests — wallet balance rules + payout number handling. No DB, no network. */
const test = require('node:test')
const assert = require('node:assert')
const { computeBalance } = require('../utils/balance')
const { normalizeBdMobile, isValidBdMobile, maskMobile } = require('../utils/phone')

const tx = (type, status, amount) => ({ type, status, amount })

test('balance: completed cashback is earnings and is spendable', () => {
  const b = computeBalance([tx('cashback', 'completed', 1200)])
  assert.strictEqual(b.totalEarnings, 1200)
  assert.strictEqual(b.available, 1200)
  assert.strictEqual(b.pendingEscrow, 0)
})

test('balance: pending cashback is escrow, never spendable', () => {
  const b = computeBalance([tx('cashback', 'pending', 900)])
  assert.strictEqual(b.pendingEscrow, 900)
  assert.strictEqual(b.available, 0)
})

test('balance: a pending withdrawal is RESERVED so it cannot be spent twice', () => {
  const b = computeBalance([tx('cashback', 'completed', 1000), tx('withdrawal', 'pending', 700)])
  assert.strictEqual(b.reserved, 700)
  assert.strictEqual(b.available, 300)
})

test('balance: a rejected payout (failed row) hands the money back', () => {
  const b = computeBalance([tx('cashback', 'completed', 1000), tx('withdrawal', 'failed', 700)])
  assert.strictEqual(b.available, 1000)
})

test('balance: clawback reverses earnings exactly once and can zero the wallet', () => {
  const b = computeBalance([tx('cashback', 'completed', 1000), tx('clawback', 'completed', 1000)])
  assert.strictEqual(b.totalEarnings, 0)
  assert.strictEqual(b.available, 0)
})

test('balance: a clawback bigger than earnings never produces a negative balance', () => {
  const b = computeBalance([tx('cashback', 'completed', 300), tx('clawback', 'completed', 900)])
  assert.strictEqual(b.totalEarnings, 0)
  assert.strictEqual(b.available, 0)
})

test('balance: top-ups and dispute refunds are spendable, escrow rows are not', () => {
  const b = computeBalance([
    tx('top_up', 'completed', 500),
    tx('refund', 'completed', 250),
    tx('escrow', 'completed', 9999),
  ])
  assert.strictEqual(b.available, 750)
})

test('balance: clawback + reserved payout cannot overdraw the wallet', () => {
  const b = computeBalance([
    tx('cashback', 'completed', 1000),
    tx('withdrawal', 'pending', 800),
    tx('clawback', 'completed', 600),
  ])
  assert.strictEqual(b.totalEarnings, 400)
  assert.strictEqual(b.available, 0)   // not -400
})

test('balance: garbage rows are ignored rather than paid out', () => {
  const b = computeBalance([tx('cashback', 'completed', -500), tx('cashback', 'completed', NaN), null, undefined])
  assert.strictEqual(b.available, 0)
})

test('phone: every way a Bangladeshi number gets typed normalises to one form', () => {
  for (const input of ['01712345678', '+8801712345678', '8801712345678', '01712-345678', '01712 345 678', '1712345678']) {
    assert.strictEqual(normalizeBdMobile(input), '01712345678', `failed for ${input}`)
  }
})

test('phone: numbers that would send money nowhere are rejected', () => {
  for (const bad of ['', null, '0171234567', '017123456789', '01212345678', '02012345678', 'abcdefghijk']) {
    assert.strictEqual(isValidBdMobile(bad), false, `accepted ${bad}`)
  }
})

test('phone: masking keeps the operator and last 4 digits only', () => {
  assert.strictEqual(maskMobile('+8801812345678'), '018****5678')
})
