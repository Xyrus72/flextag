const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
  creatorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  postUrl:    { type: String, required: true },
  platform:   { type: String, default: 'instagram' },
  status:     { type: String, enum: ['pending', 'approved', 'rejected', 'deleted', 'monitoring'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
  retentionDeadline: { type: Date },
  cashbackReleased: { type: Boolean, default: false },

  // ── Automated Instagram verification (services/instagram/postCheck.js) ──
  verification: {
    status:    { type: String, enum: ['pending', 'passed', 'failed', 'error'], default: 'pending' },
    checks:    { type: [{ key: String, label: String, passed: Boolean, required: Boolean, detail: String }], default: [] },
    snapshot:  { type: mongoose.Schema.Types.Mixed, default: null },   // { likes, comments, views, takenAt, mediaType, caption, thumbnail, permalink, owner }
    checkedAt: { type: Date, default: null },
    error:     { type: String, default: '' },
    source:    { type: String, default: '' },                          // 'session' | 'embed'
  },
  retention: {
    checkAt:   { type: Date, default: null },                          // when to confirm the post is still live
    status:    { type: String, enum: ['pending', 'alive', 'removed', 'skipped'], default: 'pending' },
    checkedAt: { type: Date, default: null },
  },
  autoApproved: { type: Boolean, default: false },
  approvedAt:   { type: Date, default: null },
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // ── Module-3 "Meta Post Auditor" contract (Habib) ─────────────────────────
  // Kept for the module's UI/API shape, but FILLED FROM the real verification
  // above (services/instagram/postCheck.js) — never from the stub auditor.
  // Booleans default to null ("not checked yet"), not true.
  auditStatus: { type: String, enum: ['passed', 'failed', 'monitoring', 'flagged'], default: 'monitoring' },
  auditResults: {
    isPublic:          { type: Boolean, default: null },
    tagsBrand:         { type: Boolean, default: null },
    hasHashtags:       { type: Boolean, default: null },
    detectedHashtags:  { type: [String], default: [] },
    detectedHandles:   { type: [String], default: [] },
    authenticityScore: { type: Number, default: null },   // creator's Instagram health score (0-100)
  },
  retentionDaysRemaining: { type: Number, default: 7 },
}, { timestamps: true })

module.exports = mongoose.model('Post', postSchema)
