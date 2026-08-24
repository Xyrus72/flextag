const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: ['cashback', 'withdrawal', 'refund', 'escrow', 'top_up', 'clawback'], required: true },
  amount:   { type: Number, required: true },
  desc:     { type: String, default: '' },
  status:   { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  orderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  postId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  bkashNumber: { type: String, default: '' },
}, { timestamps: true })

module.exports = mongoose.model('Transaction', transactionSchema)
