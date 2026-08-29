'use strict'
/**
 * Automatic payout runner.
 *
 * Off by default: only starts when PAYOUT_AUTO=1 AND the configured provider is
 * an automatic one (services/payouts falls back to `manual` whenever an
 * automatic provider is half-configured, and a "manual" auto-runner would just
 * mark money paid that nobody actually sent).
 *
 * PAYOUT_AUTO_INTERVAL_MIN  minutes between runs (default 15)
 * PAYOUT_AUTO_BATCH         payouts per run     (default 20)
 */
const payouts = require('../services/payouts')

let timer = null

async function runOnce() {
  try {
    const results = await payouts.processQueue({ limit: Number(process.env.PAYOUT_AUTO_BATCH) || 20, auto: true })
    if (results.length) {
      const paid = results.filter(r => r.status === 'paid').length
      console.log(`[payouts] auto-run: ${paid}/${results.length} sent`)
    }
  } catch (err) {
    console.warn('[payouts] auto-run failed:', err.message)
  }
}

function start() {
  const info = payouts.providerInfo()
  if (!info.autoSend) {
    console.log(`[payouts] provider=${info.provider} — automatic sending is off (admin settles from /admin/payouts).`)
    return
  }
  const minutes = Math.max(1, Number(process.env.PAYOUT_AUTO_INTERVAL_MIN) || 15)
  console.log(`[payouts] auto-send ON via ${info.provider}, every ${minutes} min`)
  timer = setInterval(runOnce, minutes * 60_000)
  timer.unref?.()
  setTimeout(runOnce, 30_000).unref?.()   // first pass shortly after boot
}

function stop() { if (timer) clearInterval(timer); timer = null }

module.exports = { start, stop, runOnce }
