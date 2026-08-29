'use strict'
/**
 * Creator payouts — money going OUT of FlexTag.
 *
 * This is the half of the money loop creators judge the platform on: cashback
 * that only ever exists as a "pending" row is not cashback. The queue, the
 * balance reservation, the retry/reject paths, the receipts and the
 * notifications live here; the transfer itself is delegated to a provider
 * chosen with PAYOUT_PROVIDER (manual | http | bkash).
 *
 * Safety rules that must not be relaxed:
 *  - A payout is CLAIMED atomically (queued|failed -> processing) before any
 *    money moves, so two admins (or an admin and the auto-job) cannot send twice.
 *  - The balance is re-checked at send time EXCLUDING this transaction, so a
 *    clawback that landed after the request can still stop the payout.
 *  - An unclear provider answer (timeout, unknown status) leaves the payout
 *    'processing' for a human to reconcile. We never guess "paid", and we never
 *    auto-retry something that may already have moved money.
 */
const Transaction = require('../../models/Transaction')
const { walletBalance } = require('../../utils/balance')
const { normalizeBdMobile, maskMobile } = require('../../utils/phone')
const { notifySafe } = require('../notifications')
const User = require('../../models/User')
const fraud = require('../fraud')

const PROVIDERS = {
  manual: require('./manual'),
  http: require('./http'),
  bkash: require('./bkash'),
}

function getProvider() {
  const chosen = PROVIDERS[String(process.env.PAYOUT_PROVIDER || 'manual').toLowerCase()]
  if (!chosen) return PROVIDERS.manual
  // A half-configured automatic provider would fail every payout — fall back to
  // manual so admins can still pay people by hand.
  return chosen.configured() ? chosen : PROVIDERS.manual
}

function providerInfo() {
  const p = getProvider()
  const requested = String(process.env.PAYOUT_PROVIDER || 'manual').toLowerCase()
  return {
    provider: p.name,
    automatic: !!p.isAutomatic,
    autoSend: process.env.PAYOUT_AUTO === '1' && !!p.isAutomatic,
    requested,
    fellBack: requested !== p.name,
  }
}

/**
 * Send one queued payout.
 * @param {string} txId
 * @param {{ actorId?: any, auto?: boolean }} [opts]
 * @returns {Promise<{ transaction: any, status: string, message: string }>}
 */
async function sendPayout(txId, { actorId = null, auto = false } = {}) {
  // 1. Claim — only a queued/failed payout can be sent, and only by one caller.
  // Withdrawal rows created before payouts existed have no payoutStatus at all;
  // `$in [..., null]` matches a missing field, so old requests stay payable.
  const tx = await Transaction.findOneAndUpdate(
    { _id: txId, type: 'withdrawal', status: 'pending', payoutStatus: { $in: ['queued', 'failed', null] } },
    { $set: { payoutStatus: 'processing', payoutError: '' }, $inc: { payoutAttempts: 1 } },
    { new: true },
  )
  if (!tx) {
    const existing = await Transaction.findById(txId).lean()
    if (!existing) throw Object.assign(new Error('Payout not found.'), { status: 404 })
    throw Object.assign(new Error(`This payout is already ${existing.payoutStatus || existing.status} — nothing to send.`), { status: 409 })
  }

  // 2. Fraud gate. A held account, or one scoring above the payout threshold,
  // does not get money moved on a schedule — an admin clears the flags first
  // (Fraud Review), which is a deliberate human decision, not a retry.
  const owner = await User.findById(tx.userId).select('blocked blockReason riskScore').lean()
  const gate = await fraud.guard(owner, { action: 'payout' })
  if (!gate.allowed) {
    await Transaction.updateOne({ _id: tx._id }, { $set: {
      payoutStatus: 'failed',
      payoutError: `Held for review: ${gate.reason} (risk ${gate.score ?? '—'})`,
    } })
    return {
      transaction: await Transaction.findById(tx._id),
      status: 'failed',
      message: 'Held for fraud review — clear the account in Fraud Review, then send.',
    }
  }

  // 3. Re-check the balance as of NOW, ignoring this reservation.
  const balance = await walletBalance(tx.userId, { excludeTxId: tx._id })
  if (tx.amount > balance.available) {
    await Transaction.updateOne({ _id: tx._id }, { $set: {
      payoutStatus: 'failed',
      payoutError: `Balance fell to ${balance.available} at send time (a clawback or another payout landed first).`,
    } })
    return {
      transaction: await Transaction.findById(tx._id),
      status: 'failed',
      message: 'Insufficient balance at send time — payout held.',
    }
  }

  // 4. Move the money.
  const provider = getProvider()
  const account = normalizeBdMobile(tx.payoutAccount || tx.bkashNumber) || String(tx.payoutAccount || tx.bkashNumber || '')
  const reference = tx.payoutRef || `FT-${String(tx._id).slice(-8).toUpperCase()}`
  let result
  try {
    result = await provider.disburse({ amount: tx.amount, account, method: tx.payoutMethod || 'bkash', reference })
  } catch (err) {
    await Transaction.updateOne({ _id: tx._id }, { $set: { payoutStatus: 'failed', payoutError: err.message } })
    return { transaction: await Transaction.findById(tx._id), status: 'failed', message: err.message }
  }

  // 5. Record the outcome. Only 'paid' completes the ledger row.
  const set = {
    payoutProvider: provider.name,
    payoutRef: result.reference || reference,
    payoutError: result.status === 'failed' ? (result.message || 'Provider rejected the payout.') : '',
  }
  if (result.status === 'paid') {
    set.payoutStatus = 'paid'
    set.status = 'completed'
    set.payoutSentAt = new Date()
    set.settledBy = actorId || null
  } else if (result.status === 'processing') {
    set.payoutStatus = 'processing'
    set.payoutSentAt = new Date()
  } else {
    set.payoutStatus = 'failed'
  }
  await Transaction.updateOne({ _id: tx._id }, { $set: set })
  const updated = await Transaction.findById(tx._id)

  if (result.status === 'paid') {
    notifySafe(tx.userId, {
      type: 'payout', icon: '💸', title: 'Payout sent',
      body: `৳${tx.amount.toLocaleString()} is on its way to ${maskMobile(account)} (ref ${set.payoutRef}).`,
      link: '/creator/wallet',
    })
  } else if (result.status === 'failed' && !auto) {
    notifySafe(tx.userId, {
      type: 'payout', icon: '⚠️', title: 'Payout held',
      body: result.message || 'We could not send your payout yet — support is looking at it.',
      link: '/creator/wallet',
    })
  }
  return { transaction: updated, status: result.status, message: result.message || '' }
}

/** Admin refuses a request: the reservation is released, the money stays in the wallet. */
async function rejectPayout(txId, { reason = '', actorId = null } = {}) {
  const tx = await Transaction.findOneAndUpdate(
    { _id: txId, type: 'withdrawal', status: 'pending', payoutStatus: { $in: ['queued', 'failed', 'processing', null] } },
    { $set: { status: 'failed', payoutStatus: 'rejected', payoutError: reason || 'Rejected by admin', settledBy: actorId } },
    { new: true },
  )
  if (!tx) throw Object.assign(new Error('This payout is not in a rejectable state.'), { status: 409 })
  notifySafe(tx.userId, {
    type: 'payout', icon: '↩️', title: 'Withdrawal returned',
    body: `Your ৳${tx.amount.toLocaleString()} request went back to your wallet balance.${reason ? ` Reason: ${reason}` : ''}`,
    link: '/creator/wallet',
  })
  return tx
}

/** Mark a 'processing' payout settled by hand — reconciliation for async providers. */
async function reconcilePayout(txId, { reference = '', actorId = null } = {}) {
  const tx = await Transaction.findOneAndUpdate(
    { _id: txId, type: 'withdrawal', payoutStatus: 'processing' },
    { $set: { payoutStatus: 'paid', status: 'completed', payoutSentAt: new Date(), settledBy: actorId, ...(reference ? { payoutRef: reference } : {}) } },
    { new: true },
  )
  if (!tx) throw Object.assign(new Error('Only a processing payout can be reconciled.'), { status: 409 })
  notifySafe(tx.userId, {
    type: 'payout', icon: '💸', title: 'Payout confirmed',
    body: `৳${tx.amount.toLocaleString()} has been sent to your ${tx.payoutMethod || 'bKash'} account.`,
    link: '/creator/wallet',
  })
  return tx
}

/** Send everything waiting — the admin "pay everyone" button and the auto-job. */
async function processQueue({ limit = 25, actorId = null, auto = false, ids = null } = {}) {
  const filter = { type: 'withdrawal', status: 'pending', payoutStatus: { $in: ['queued', null] } }
  if (ids?.length) filter._id = { $in: ids }
  const queued = await Transaction.find(filter).sort({ createdAt: 1 }).limit(limit).select('_id').lean()
  const results = []
  for (const { _id } of queued) {
    try {
      const r = await sendPayout(_id, { actorId, auto })
      results.push({ id: String(_id), status: r.status, message: r.message })
    } catch (err) {
      results.push({ id: String(_id), status: 'failed', message: err.message })
    }
  }
  return results
}

/** Queue totals for the admin payouts page. */
async function queueSummary() {
  const rows = await Transaction.aggregate([
    { $match: { type: 'withdrawal' } },
    { $group: { _id: { $ifNull: ['$payoutStatus', 'queued'] }, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
  ])
  const empty = { count: 0, amount: 0 }
  const by = Object.fromEntries(rows.map(r => [r._id || 'queued', { count: r.count, amount: r.amount }]))
  return {
    queued: by.queued || empty,
    processing: by.processing || empty,
    paid: by.paid || empty,
    failed: by.failed || empty,
    rejected: by.rejected || empty,
  }
}

module.exports = { getProvider, providerInfo, sendPayout, rejectPayout, reconcilePayout, processQueue, queueSummary, PROVIDERS }
