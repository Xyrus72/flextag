'use strict'
/**
 * Audit trail writer.
 *
 * Rules that keep it trustworthy:
 *  - Never throws. An audit failure must not roll back the action it describes;
 *    a missing row is bad, a failed payout because logging broke is worse.
 *  - Actor details are denormalised at write time, so the row still reads
 *    correctly after an account is renamed or removed.
 *  - Append-only: nothing here updates or deletes.
 */
const AuditLog = require('../models/AuditLog')
const { clientIp } = require('../utils/requestIp')

/** Canonical action names — used by the admin filter, so keep them stable. */
const ACTIONS = {
  PAYOUT_SENT: 'payout.sent',
  PAYOUT_FAILED: 'payout.failed',
  PAYOUT_REJECTED: 'payout.rejected',
  PAYOUT_RECONCILED: 'payout.reconciled',
  PAYOUT_REQUESTED: 'payout.requested',
  PAYOUT_CANCELLED: 'payout.cancelled',
  USER_BLOCKED: 'user.blocked',
  USER_UNBLOCKED: 'user.unblocked',
  USER_VOUCHED: 'user.vouched',
  USER_VERIFIED: 'user.verified',
  FRAUD_RESCAN: 'fraud.rescan',
  DISPUTE_RESOLVED: 'dispute.resolved',
  DISPUTE_INVESTIGATING: 'dispute.investigating',
  DISPUTE_REFUNDED: 'dispute.refunded',
  PRODUCT_APPROVED: 'product.approved',
  PRODUCT_REJECTED: 'product.rejected',
  POST_APPROVED: 'post.approved',
  POST_REJECTED: 'post.rejected',
  SETTINGS_CHANGED: 'settings.changed',
  BRAND_FUNDED: 'brand.funded',
  CASHBACK_RELEASED: 'cashback.released',
  CASHBACK_CLAWED_BACK: 'cashback.clawback',
}

/**
 * @param {{
 *   actor?: any,            // user document, or an id, or null for the system
 *   action: string,
 *   targetType?: string, targetId?: any, targetName?: string,
 *   summary?: string, amount?: number, meta?: any, req?: any,
 * }} entry
 */
function record(entry) {
  const { actor, action, targetType = '', targetId = null, targetName = '', summary = '', amount = null, meta = null, req = null } = entry || {}
  if (!action) return
  const actorIsDoc = actor && typeof actor === 'object' && actor.role !== undefined
  const doc = {
    actor: actorIsDoc ? actor._id : (actor || null),
    actorName: actorIsDoc ? (actor.name || actor.companyName || '') : (actor ? '' : 'system'),
    actorRole: actorIsDoc ? actor.role : (actor ? '' : 'system'),
    action,
    targetType,
    targetId: targetId || null,
    targetName: String(targetName || '').slice(0, 160),
    summary: String(summary || '').slice(0, 400),
    amount: Number.isFinite(Number(amount)) ? Number(amount) : null,
    meta,
    ip: req ? clientIp(req) : '',
  }
  // Fire-and-forget: the caller is usually mid-transaction and must not wait.
  AuditLog.create(doc).catch(err => console.warn('[audit] write failed:', err.message))
}

/** Paged read for the admin trail. */
async function list({ action, actor, targetId, targetType, since, limit = 50, skip = 0 } = {}) {
  const filter = {}
  if (action && action !== 'all') filter.action = action.includes('.') ? action : new RegExp(`^${action}\\.`)
  if (actor) filter.actor = actor
  if (targetId) filter.targetId = targetId
  if (targetType) filter.targetType = targetType
  if (since) filter.createdAt = { $gte: new Date(since) }

  const [entries, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(Number(skip) || 0).limit(Math.min(200, Number(limit) || 50)).lean(),
    AuditLog.countDocuments(filter),
  ])
  return { entries, total }
}

/** The distinct actions actually present, so the admin filter shows real options. */
const knownActions = () => AuditLog.distinct('action').catch(() => [])

module.exports = { record, list, knownActions, ACTIONS }
