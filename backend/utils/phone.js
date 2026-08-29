'use strict'
/**
 * Bangladeshi mobile-number handling — one definition shared by payouts
 * (where a wrong digit sends real money to a stranger) and fraud checks
 * (where the SAME number on many accounts is the signal).
 *
 * Accepts what people actually type — "01712-345678", "+8801712345678",
 * "8801712345678", "01712 345 678" — and normalises to the 11-digit local
 * form (01XXXXXXXXX) that bKash/Nagad expect.
 */

const OPERATOR_PREFIXES = ['013', '014', '015', '016', '017', '018', '019']

/** @returns {string} 11-digit local form, or '' when the input can't be one. */
function normalizeBdMobile(input) {
  const digits = String(input || '').replace(/\D/g, '')
  let local = digits
  if (local.startsWith('880')) local = '0' + local.slice(3)
  else if (local.length === 10 && local.startsWith('1')) local = '0' + local
  if (!/^01\d{9}$/.test(local)) return ''
  if (!OPERATOR_PREFIXES.includes(local.slice(0, 3))) return ''
  return local
}

const isValidBdMobile = (input) => !!normalizeBdMobile(input)

/** 01712345678 → 017****5678 — safe to show in admin lists and public tickers. */
function maskMobile(input) {
  const local = normalizeBdMobile(input)
  if (!local) return String(input || '').slice(0, 3) + '****'
  return `${local.slice(0, 3)}****${local.slice(-4)}`
}

module.exports = { normalizeBdMobile, isValidBdMobile, maskMobile, OPERATOR_PREFIXES }
