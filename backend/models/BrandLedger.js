const mongoose = require('mongoose')

/**
 * The brand side of the money loop.
 *
 * Until now brands set a campaign budget — a number in a form — while the
 * cashback they promised was paid out of nothing. This ledger is where their
 * money actually lives: they fund it (card/bKash through SSLCommerz, or a bank
 * transfer an admin confirms), and every reward the platform releases on their
 * behalf debits it.
 *
 * Kept apart from the creator `Transaction` collection on purpose: the two have
 * different rules (a brand can't withdraw, a creator can't be invoiced), and
 * mixing them is how ledgers end up lying.
 *
 * `ref` makes spend entries idempotent: one order can only ever debit a brand
 * once per kind, so a replayed webhook or a double-clicked approval cannot
 * charge them twice.
 */
const brandLedgerSchema = new mongoose.Schema({
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // funding  money in (gateway or admin-confirmed transfer)
  // spend    reward released on their behalf (instant discount or bonus)
  // refund   money back (order cancelled/returned, campaign closed)
  // fee      platform commission / listing fee
  type:    { type: String, enum: ['funding', 'spend', 'refund', 'fee'], required: true },
  amount:  { type: Number, required: true, min: 0 },
  status:  { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed', index: true },
  desc:    { type: String, default: '' },

  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },

  // Idempotency key, e.g. "spend:instant:<orderId>" or "spend:bonus:<orderId>".
  // Left UNSET (not '') on rows that don't need one, so the partial unique index
  // below can exclude them with $exists — MongoDB rejects $ne in a
  // partialFilterExpression, and the index it rejects is simply never created.
  ref: { type: String, default: undefined },

  // Gateway (SSLCommerz) fields for funding rows
  method:        { type: String, default: '' },        // sslcommerz | bank_transfer | admin_credit
  transactionId: { type: String, default: '', index: true },
  valId:         { type: String, default: '' },
  paymentDetails:{ type: Object, default: {} },
  confirmedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

// One row per (brand, ref) — the guard that makes replays harmless. Partial on
// $exists so rows without a ref (funding, manual adjustments) are unaffected.
brandLedgerSchema.index({ brandId: 1, ref: 1 }, { unique: true, partialFilterExpression: { ref: { $exists: true } } })
brandLedgerSchema.index({ brandId: 1, createdAt: -1 })

module.exports = mongoose.model('BrandLedger', brandLedgerSchema)
