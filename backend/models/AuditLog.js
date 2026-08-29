const mongoose = require('mongoose')

/**
 * Who did what, to whom, and when.
 *
 * Every privileged action — money sent, account blocked, dispute closed with a
 * refund, threshold changed — writes one row here. It exists so a question like
 * "why was this creator's ৳4,000 payout rejected in March?" has an answer that
 * doesn't depend on anyone's memory, and so a compromised admin account leaves
 * a trail.
 *
 * Append-only by convention: nothing in the app updates or deletes these rows.
 */
const auditLogSchema = new mongoose.Schema({
  actor:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },   // null = the system (a job)
  actorName: { type: String, default: '' },      // denormalised: the row must stay readable if the account is deleted
  actorRole: { type: String, default: '' },
  action:    { type: String, required: true, index: true },   // payout.sent, user.blocked, dispute.resolved, …
  targetType:{ type: String, default: '' },      // user | transaction | dispute | product | order | settings | campaign
  targetId:  { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  targetName:{ type: String, default: '' },
  summary:   { type: String, default: '' },      // one human-readable line
  amount:    { type: Number, default: null },    // set for money actions, so they can be summed
  meta:      { type: mongoose.Schema.Types.Mixed, default: null },
  ip:        { type: String, default: '' },
}, { timestamps: true })

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ actor: 1, createdAt: -1 })

module.exports = mongoose.model('AuditLog', auditLogSchema)
