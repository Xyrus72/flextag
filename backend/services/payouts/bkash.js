'use strict'
/**
 * bKash disbursement (B2C) provider.
 *
 * bKash hands each merchant their own base URL, credentials and disbursement
 * path with the contract, and sandbox/production differ — so every path is
 * env-driven with the tokenized-API defaults rather than baked in:
 *
 *   BKASH_BASE_URL       https://tokenized.sandbox.bka.sh/v1.2.0-beta
 *   BKASH_APP_KEY / BKASH_APP_SECRET / BKASH_USERNAME / BKASH_PASSWORD
 *   BKASH_TOKEN_PATH     /tokenized/checkout/token/grant     (default)
 *   BKASH_DISBURSE_PATH  /tokenized/checkout/payout/create   (default — CHECK your merchant docs)
 *
 * If a path does not match your contract the call fails loudly and the payout
 * stays queued; it never silently reports success.
 */
const name = 'bkash'

const env = (k, fb = '') => process.env[k] || fb
const configured = () =>
  !!(env('BKASH_BASE_URL') && env('BKASH_APP_KEY') && env('BKASH_APP_SECRET') && env('BKASH_USERNAME') && env('BKASH_PASSWORD'))

let token = { value: '', expiresAt: 0 }

async function grantToken() {
  if (token.value && Date.now() < token.expiresAt - 60_000) return token.value
  const res = await fetch(env('BKASH_BASE_URL') + env('BKASH_TOKEN_PATH', '/tokenized/checkout/token/grant'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      username: env('BKASH_USERNAME'),
      password: env('BKASH_PASSWORD'),
    },
    body: JSON.stringify({ app_key: env('BKASH_APP_KEY'), app_secret: env('BKASH_APP_SECRET') }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.id_token) {
    throw new Error(body.statusMessage || body.message || `bKash token grant failed (HTTP ${res.status})`)
  }
  // expires_in is seconds (bKash returns 3600); fall back to 45 minutes.
  token = { value: body.id_token, expiresAt: Date.now() + (Number(body.expires_in) || 2700) * 1000 }
  return token.value
}

async function disburse({ amount, account, reference }) {
  if (!configured()) throw new Error('bKash payout credentials are not set.')
  const idToken = await grantToken()
  const res = await fetch(env('BKASH_BASE_URL') + env('BKASH_DISBURSE_PATH', '/tokenized/checkout/payout/create'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: idToken,
      'x-app-key': env('BKASH_APP_KEY'),
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: 'BDT',
      receiverMSISDN: account,
      merchantInvoiceNumber: reference,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.errorCode) {
    return { status: 'failed', message: body.errorMessage || body.statusMessage || `bKash returned HTTP ${res.status}`, reference: body.trxID || '', raw: body }
  }
  const settled = String(body.transactionStatus || body.status || '').toLowerCase() === 'completed'
  return {
    status: settled ? 'paid' : 'processing',
    reference: body.trxID || body.paymentID || reference,
    message: body.statusMessage || '',
    raw: body,
  }
}

module.exports = { name, configured, disburse, isAutomatic: true }
