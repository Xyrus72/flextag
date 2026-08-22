const mongoose = require('mongoose')

const alertSchema = new mongoose.Schema({
  type: { type: String, required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  acknowledged: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('Alert', alertSchema)