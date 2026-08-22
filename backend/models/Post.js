const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  postUrl: { type: String, required: true },
  platform: { type: String, default: 'instagram' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'deleted', 'monitoring'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
  retentionDeadline: { type: Date },
  retentionDaysRemaining: { type: Number, default: 7 },
  cashbackReleased: { type: Boolean, default: false },
  auditStatus: { type: String, enum: ['passed', 'failed', 'monitoring', 'flagged'], default: 'monitoring' },
  auditResults: {
    isPublic: { type: Boolean, default: true },
    tagsBrand: { type: Boolean, default: true },
    hasHashtags: { type: Boolean, default: true },
    detectedHashtags: [{ type: String }],
    detectedHandles: [{ type: String }],
    authenticityScore: { type: Number, default: 98 }
  }
}, { timestamps: true })

module.exports = mongoose.model('Post', postSchema)
