const mongoose = require('mongoose')

const disputeSchema = new mongoose.Schema({
  disputeId: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: {
    type: String,
    enum: ['damaged_product', 'wrongful_post_rejection', 'shipping_delay', 'cashback_error', 'other'],
    default: 'damaged_product'
  },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved_refunded', 'rejected'],
    default: 'open'
  },
  evidenceUrl: { type: String, default: '' },
  refundAmount: { type: Number, default: 0 },
  resolutionNotes: { type: String, default: '' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('Dispute', disputeSchema)
