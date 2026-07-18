const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
  creatorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  postUrl:    { type: String, required: true },
  platform:   { type: String, default: 'instagram' },
  status:     { type: String, enum: ['pending', 'approved', 'rejected', 'deleted'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
  retentionDeadline: { type: Date },
  cashbackReleased: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('Post', postSchema)
