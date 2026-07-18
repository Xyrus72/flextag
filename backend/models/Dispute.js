const mongoose = require('mongoose')

const disputeSchema = new mongoose.Schema({
  creatorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brandId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  type:        { type: String, enum: ['product_damaged', 'wrong_rejection', 'shipping_delay', 'other'], required: true },
  description: { type: String, required: true },
  amount:      { type: Number, required: true },
  status:      { type: String, enum: ['open', 'investigating', 'resolved'], default: 'open' },
  resolution:  { type: String, default: '' },
  resolvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Dispute', disputeSchema)
