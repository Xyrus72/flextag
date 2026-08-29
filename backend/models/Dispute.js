const mongoose = require('mongoose')

/** One message in the dispute thread — creator, brand and admin all post here. */
const disputeMessageSchema = new mongoose.Schema({
  // null = written by FlexTag itself (e.g. the SLA escalation notice)
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  role: { type: String, enum: ['creator', 'brand', 'admin'], required: true },
  text: { type: String, required: true, maxlength: 2000 },
  at:   { type: Date, default: Date.now },
}, { _id: true })

const disputeSchema = new mongoose.Schema({
  creatorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brandId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  type:        { type: String, enum: ['product_damaged', 'wrong_rejection', 'shipping_delay', 'not_delivered', 'other'], required: true },
  description: { type: String, required: true },
  amount:      { type: Number, required: true },
  // open -> awaiting_brand -> investigating -> resolved (admin has the last word)
  status:      { type: String, enum: ['open', 'awaiting_brand', 'investigating', 'resolved'], default: 'open' },
  evidence:    { type: [String], default: [] },       // image / screenshot URLs the creator pasted
  messages:    { type: [disputeMessageSchema], default: [] },
  brandRespondedAt: { type: Date, default: null },

  // Resolution — `resolutionType` is what actually happened to the money, so an
  // admin can never "resolve" a refund without the ledger row that pays it.
  resolution:     { type: String, default: '' },
  resolutionType: { type: String, enum: ['refund', 'cashback_released', 'replacement', 'rejected', 'other'], default: 'other' },
  refundAmount:   { type: Number, default: 0 },
  refundTxId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  resolvedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:     { type: Date, default: null },
}, { timestamps: true })

// One live dispute per order — a second complaint belongs in the same thread.
disputeSchema.index({ orderId: 1, status: 1 })

module.exports = mongoose.model('Dispute', disputeSchema)
