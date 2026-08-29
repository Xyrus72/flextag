const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: ['cashback', 'withdrawal', 'refund', 'escrow', 'top_up', 'clawback'], required: true },
  amount:   { type: Number, required: true },
  desc:     { type: String, default: '' },
  status:   { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  orderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  postId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  bkashNumber: { type: String, default: '' },   // legacy field — mirrors payoutAccount

  // ── Payout lifecycle (withdrawals only) ─────────────────────────────────
  // `status` is the LEDGER state (pending money is reserved, completed money is
  // gone); `payoutStatus` is the DISBURSEMENT state. They move together only on
  // 'paid' / 'rejected' — see services/payouts/index.js.
  payoutMethod:  { type: String, enum: ['bkash', 'nagad', 'rocket', 'bank'], default: 'bkash' },
  payoutAccount: { type: String, default: '' },
  payoutStatus:  { type: String, enum: ['queued', 'processing', 'paid', 'failed', 'rejected'], default: 'queued', index: true },
  payoutProvider:{ type: String, default: '' },
  payoutRef:     { type: String, default: '' },   // provider receipt / trxID
  payoutError:   { type: String, default: '' },
  payoutAttempts:{ type: Number, default: 0 },
  payoutSentAt:  { type: Date, default: null },
  settledBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

module.exports = mongoose.model('Transaction', transactionSchema)
