'use strict'
/** Brand balance rules — pure math, no DB. */
const test = require('node:test')
const assert = require('node:assert')
const { computeBrandBalance } = require('../services/brandWallet')

const row = (type, amount, status = 'completed') => ({ type, amount, status })

test('funding adds, spending subtracts', () => {
  const b = computeBrandBalance([row('funding', 50000), row('spend', 12000)])
  assert.strictEqual(b.funded, 50000)
  assert.strictEqual(b.spent, 12000)
  assert.strictEqual(b.balance, 38000)
})

test('a declared bank transfer is visible but NOT spendable until confirmed', () => {
  const b = computeBrandBalance([row('funding', 20000, 'pending')])
  assert.strictEqual(b.pendingFunding, 20000)
  assert.strictEqual(b.balance, 0)
})

test('a failed gateway payment counts for nothing', () => {
  const b = computeBrandBalance([row('funding', 10000, 'failed')])
  assert.strictEqual(b.balance, 0)
  assert.strictEqual(b.pendingFunding, 0)
})

test('a returned order refunds the brand', () => {
  const b = computeBrandBalance([row('funding', 10000), row('spend', 4000), row('refund', 4000)])
  assert.strictEqual(b.balance, 10000)
})

test('platform fees come out of the same balance', () => {
  const b = computeBrandBalance([row('funding', 10000), row('fee', 500)])
  assert.strictEqual(b.fees, 500)
  assert.strictEqual(b.balance, 9500)
})

test('overspending shows as a real negative — a brand in debt must not look solvent', () => {
  const b = computeBrandBalance([row('funding', 1000), row('spend', 2500)])
  assert.strictEqual(b.balance, -1500)
})

test('garbage rows are ignored rather than counted', () => {
  const b = computeBrandBalance([row('funding', -500), row('spend', NaN), null, undefined, row('mystery', 900)])
  assert.strictEqual(b.balance, 0)
})
