'use strict'
/**
 * ONE definition of a creator's wallet balance.
 *
 * Every place that reads or spends the wallet — the Wallet page, the withdraw
 * request, the payout send, the admin payout queue — goes through here, so the
 * number a creator sees and the number we pay out can never drift apart.
 *
 * Ledger rules:
 *   credit  cashback (completed) · top_up · refund      (dispute refunds)
 *   debit   withdrawal (completed AND pending) · clawback
 * Pending withdrawals are RESERVED, not free money: a queued payout must not be
 * spendable twice, and a clawback landing mid-payout must not overdraw.
 */
const mongoose = require('mongoose')
const Transaction = require('../models/Transaction')

const CREDIT_TYPES = ['cashback', 'top_up', 'refund']
const DEBIT_TYPES  = ['withdrawal', 'clawback']

/**
 * @param {Array<{type:string,status:string,amount:number}>} txs
 * @returns {{ totalEarnings:number, pendingEscrow:number, available:number, topUps:number, refunds:number, withdrawn:number, reserved:number, clawedBack:number }}
 */
function computeBalance(txs = []) {
  let earned = 0, clawedBack = 0, pendingEscrow = 0, topUps = 0, refunds = 0, withdrawn = 0, reserved = 0
  for (const t of txs) {
    const amount = Number(t?.amount) || 0
    if (amount <= 0) continue
    const done = t.status === 'completed'
    switch (t.type) {
      case 'cashback':   done ? (earned += amount) : t.status === 'pending' && (pendingEscrow += amount); break
      case 'clawback':   if (done) clawedBack += amount; break
      case 'top_up':     if (done) topUps += amount; break
      case 'refund':     if (done) refunds += amount; break
      case 'withdrawal': if (done) withdrawn += amount; else if (t.status === 'pending') reserved += amount; break
      default: break   // 'escrow' rows are informational — the cashback row is the money
    }
  }
  const totalEarnings = Math.max(0, earned - clawedBack)
  const available = Math.max(0, totalEarnings + topUps + refunds - withdrawn - reserved)
  return { totalEarnings, pendingEscrow, available, topUps, refunds, withdrawn, reserved, clawedBack }
}

/**
 * Same math, straight from Mongo. `excludeTxId` leaves one transaction out —
 * used when settling a pending withdrawal, so it isn't reserved against itself.
 */
async function walletBalance(userId, { excludeTxId = null } = {}) {
  const match = {
    userId: new mongoose.Types.ObjectId(String(userId)),
    type: { $in: [...CREDIT_TYPES, ...DEBIT_TYPES] },
  }
  if (excludeTxId) match._id = { $ne: new mongoose.Types.ObjectId(String(excludeTxId)) }
  const rows = await Transaction.find(match).select('type status amount').lean()
  return computeBalance(rows)
}

module.exports = { computeBalance, walletBalance, CREDIT_TYPES, DEBIT_TYPES }
