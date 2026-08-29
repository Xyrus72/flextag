'use strict'
/**
 * Generic disbursement provider — POSTs the payout to whatever API the operator
 * has (an aggregator, a bank middleware, an internal ops service). Everything
 * is env-driven, so no endpoint is hard-coded and nothing is guessed:
 *
 *   PAYOUT_API_URL     https://.../disburse         (required)
 *   PAYOUT_API_TOKEN   bearer token                 (optional)
 *   PAYOUT_API_HEADERS {"X-Key":"..."} as JSON      (optional)
 *
 * Contract: we POST { amount, account, method, reference } and read the reply as
 *   { status: 'paid' | 'processing' | 'failed', reference?, message? }
 * Anything else is treated as 'processing' and reconciled by a human — we never
 * mark money paid on an answer we do not understand.
 */
const name = 'http'
const endpoint = () => process.env.PAYOUT_API_URL || ''
const configured = () => !!endpoint()

function headers() {
  const h = { 'content-type': 'application/json' }
  if (process.env.PAYOUT_API_TOKEN) h.authorization = `Bearer ${process.env.PAYOUT_API_TOKEN}`
  try { Object.assign(h, JSON.parse(process.env.PAYOUT_API_HEADERS || '{}')) } catch { /* ignore malformed JSON */ }
  return h
}

async function disburse({ amount, account, method, reference }) {
  if (!configured()) throw new Error('PAYOUT_API_URL is not set.')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ amount, account, method, reference }),
      signal: ctrl.signal,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { status: 'failed', reference: body.reference || '', message: body.message || `Provider returned HTTP ${res.status}`, raw: body }
    }
    const status = ['paid', 'processing', 'failed'].includes(body.status) ? body.status : 'processing'
    return { status, reference: body.reference || reference, message: body.message || '', raw: body }
  } catch (err) {
    // A timeout is NOT a failure — the money may well have moved. Leave it
    // processing so an admin reconciles, instead of paying twice on a retry.
    return { status: 'processing', reference, message: `No confirmation from provider (${err.message}) — reconcile before retrying.`, raw: null }
  } finally {
    clearTimeout(timer)
  }
}

module.exports = { name, configured, disburse, isAutomatic: true }
