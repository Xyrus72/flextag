'use strict'
/** CSV parsing — the shapes real spreadsheets actually produce. */
const test = require('node:test')
const assert = require('node:assert')
const { parseCsv, parseCsvObjects } = require('../utils/csv')

test('a comma inside quotes is part of the value, not a new column', () => {
  const rows = parseCsv('name,note\n"Serum, 50ml",nice')
  assert.deepStrictEqual(rows[1], ['Serum, 50ml', 'nice'])
})

test('doubled quotes are one literal quote', () => {
  const rows = parseCsv('a\n"He said ""hi"""')
  assert.deepStrictEqual(rows[1], ['He said "hi"'])
})

test('Excel CRLF line endings and a UTF-8 BOM are handled', () => {
  const rows = parseCsv('﻿name,price\r\nGlow,2200\r\n')
  assert.deepStrictEqual(rows, [['name', 'price'], ['Glow', '2200']])
})

test('blank lines are dropped rather than imported as empty products', () => {
  const rows = parseCsv('name\nA\n\n\nB\n')
  assert.deepStrictEqual(rows, [['name'], ['A'], ['B']])
})

test('a newline inside quotes stays inside the field', () => {
  const rows = parseCsv('name,desc\nA,"line one\nline two"')
  assert.strictEqual(rows[1][1], 'line one\nline two')
})

test('headers normalise, so "Cashback Rate" and cashback_rate are the same column', () => {
  const { headers, rows } = parseCsvObjects('Name,Cashback Rate,instant_split_pct\nGlow,55,30')
  assert.deepStrictEqual(headers, ['name', 'cashbackrate', 'instantsplitpct'])
  assert.strictEqual(rows[0].cashbackrate, '55')
  assert.strictEqual(rows[0].instantsplitpct, '30')
})

test('missing trailing cells read as empty strings, not undefined', () => {
  const { rows } = parseCsvObjects('name,price,category\nGlow,2200')
  assert.strictEqual(rows[0].category, '')
})

test('an empty file is empty, not a crash', () => {
  assert.deepStrictEqual(parseCsvObjects(''), { headers: [], rows: [] })
  assert.deepStrictEqual(parseCsvObjects(null), { headers: [], rows: [] })
})
