const express  = require('express')
const router   = express.Router()
const Dispute  = require('../models/Dispute')
const Order    = require('../models/Order')
const Transaction = require('../models/Transaction')
const { requireAuth, requireRole } = require('../middleware/auth')
const Post = require('../models/Post')
const { notifySafe } = require('../services/notifications')
const { approvePost } = require('../services/postApproval')
const audit = require('../services/audit')

/**
 * Disputes — the brand <-> creator conversation with an admin as referee.
 *
 * Everything money-related is derived from the ORDER, never from the request
 * body: a creator could otherwise file a dispute against any brand for any
 * amount. Filing, responding and resolving each notify the other side, because
 * a dispute nobody hears about is just a database row.
 */

const TYPES = ['product_damaged', 'wrong_rejection', 'shipping_delay', 'not_delivered', 'other']
const TYPE_LABEL = {
  product_damaged: 'Damaged product',
  wrong_rejection: 'Post wrongly rejected',
  shipping_delay:  'Shipping delay',
  not_delivered:   'Never delivered',
  other:           'Other',
}

const isParticipant = (dispute, user) =>
  user.role === 'admin' ||
  String(dispute.creatorId?._id || dispute.creatorId) === String(user._id) ||
  String(dispute.brandId?._id || dispute.brandId) === String(user._id)

const populated = (q) => q
  .populate('creatorId', 'name instagramHandle avatar')
  .populate('brandId', 'companyName name')
  .populate('orderId', 'orderId product total cashbackAmount status createdAt')
  .populate('messages.from', 'name role companyName')

// ── GET /api/disputes ──────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query
    const filter = {}
    if (req.user.role === 'creator') filter.creatorId = req.user._id
    if (req.user.role === 'brand')   filter.brandId   = req.user._id
    if (status && status !== 'all')  filter.status    = status

    const disputes = await populated(Dispute.find(filter)).sort({ createdAt: -1 })
    res.json({ disputes, types: TYPES.map(t => ({ value: t, label: TYPE_LABEL[t] })) })
  } catch (err) {
    console.error('[disputes GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /api/disputes/:id ──────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const dispute = await populated(Dispute.findById(req.params.id))
    if (!dispute) return res.status(404).json({ message: 'Dispute not found.' })
    if (!isParticipant(dispute, req.user)) return res.status(403).json({ message: 'Access denied.' })
    res.json({ dispute })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/disputes — creator files a dispute about their own order ─────
router.post('/', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { orderId, type, description, evidence } = req.body
    if (!orderId || !type || !description) {
      return res.status(400).json({ message: 'Order, type and description are required.' })
    }
    if (!TYPES.includes(type)) return res.status(400).json({ message: 'Unknown dispute type.' })

    // The order decides who the dispute is against and what it is worth — the
    // client only picks WHICH of their own orders.
    const order = await Order.findOne({ _id: orderId, creatorId: req.user._id })
    if (!order) return res.status(404).json({ message: 'Order not found.' })

    const open = await Dispute.findOne({ orderId: order._id, status: { $ne: 'resolved' } })
    if (open) return res.status(409).json({ message: 'There is already an open dispute for this order — add a message to it instead.' })

    const dispute = await Dispute.create({
      creatorId: req.user._id,
      brandId:   order.brandId,
      orderId:   order._id,
      type,
      description: String(description).slice(0, 2000),
      amount: order.total || 0,
      evidence: Array.isArray(evidence) ? evidence.filter(Boolean).slice(0, 5).map(String) : [],
      status: 'awaiting_brand',
      messages: [{ from: req.user._id, role: 'creator', text: String(description).slice(0, 2000) }],
    })

    if (order.brandId) {
      notifySafe(order.brandId, {
        type: 'dispute', icon: '⚠️', title: 'New dispute filed',
        body: `${req.user.name} raised "${TYPE_LABEL[type]}" on order ${order.orderId}.`,
        link: '/brand/disputes',
      })
    }
    res.status(201).json({ dispute: await populated(Dispute.findById(dispute._id)), message: 'Dispute filed — the brand has been notified.' })
  } catch (err) {
    console.error('[disputes POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/disputes/:id/messages — anyone involved replies ──────────────
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim()
    if (!text) return res.status(400).json({ message: 'Message text is required.' })

    const dispute = await Dispute.findById(req.params.id)
    if (!dispute) return res.status(404).json({ message: 'Dispute not found.' })
    if (!isParticipant(dispute, req.user)) return res.status(403).json({ message: 'Access denied.' })
    if (dispute.status === 'resolved') return res.status(409).json({ message: 'This dispute is closed.' })

    dispute.messages.push({ from: req.user._id, role: req.user.role, text: text.slice(0, 2000) })
    if (req.user.role === 'brand') {
      dispute.brandRespondedAt = new Date()
      if (dispute.status === 'awaiting_brand') dispute.status = 'investigating'
    }
    await dispute.save()

    // Tell the other side (admins watch the portal, so they are not spammed).
    const otherParty = req.user.role === 'creator' ? dispute.brandId : dispute.creatorId
    if (otherParty && String(otherParty) !== String(req.user._id)) {
      notifySafe(otherParty, {
        type: 'dispute', icon: '💬', title: 'New reply on a dispute',
        body: text.slice(0, 120),
        link: req.user.role === 'creator' ? '/brand/disputes' : '/creator/disputes',
      })
    }
    res.json({ dispute: await populated(Dispute.findById(dispute._id)), message: 'Reply sent.' })
  } catch (err) {
    console.error('[dispute message]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/disputes/:id/investigate — admin picks it up ──────────────────
router.put('/:id/investigate', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndUpdate(req.params.id, { status: 'investigating' }, { new: true })
    if (!dispute) return res.status(404).json({ message: 'Dispute not found.' })
    for (const uid of [dispute.creatorId, dispute.brandId]) {
      notifySafe(uid, { type: 'dispute', icon: '🔍', title: 'Dispute under review', body: 'A FlexTag admin is looking into your dispute.', link: '/support/tickets' })
    }
    audit.record({ actor: req.user, action: audit.ACTIONS.DISPUTE_INVESTIGATING, targetType: 'dispute', targetId: dispute._id, summary: 'Admin took the dispute on', req })
    res.json({ dispute })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/disputes/:id/resolve — admin closes it, with the money ────────
// { resolution, resolutionType, refundAmount }
router.put('/:id/resolve', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { resolution, resolutionType = 'other', refundAmount } = req.body
    const existing = await Dispute.findById(req.params.id)
    if (!existing) return res.status(404).json({ message: 'Dispute not found.' })
    if (existing.status === 'resolved') return res.status(409).json({ message: 'Already resolved.' })

    const order = await Order.findById(existing.orderId)

    /* ── 1. Validate everything BEFORE claiming ──────────────────────────────
     * Every check here is read-only, so a rejected resolution leaves the dispute
     * exactly as it was — open, and still answerable. Claiming first and then
     * bailing out would strand it as "resolved" with no resolution and no money.
     */
    let refundAmountFinal = 0
    if (resolutionType === 'refund') {
      // Never refund more than the creator actually paid for that order.
      const cap = order?.total || existing.amount || 0
      refundAmountFinal = Math.min(Math.max(0, Number(refundAmount) || 0), cap)
      if (refundAmountFinal <= 0) {
        return res.status(400).json({ message: `Enter a refund between ৳1 and ৳${cap.toLocaleString()}.` })
      }
    }

    // "Release the cashback" has to actually release it. It used to be a label
    // an admin could pick while no money moved — the same dishonesty this whole
    // portal exists to settle. It goes through services/postApproval, the ONE
    // verified release path, so the ledger, budget and notification all follow.
    let postToApprove = null
    if (resolutionType === 'cashback_released') {
      postToApprove = await Post.findOne({ orderId: existing.orderId, status: 'pending' })
        .populate('campaignId').populate('orderId').populate('creatorId', 'name instagramHandle igVerified igHealthScore')
      if (!postToApprove) {
        return res.status(400).json({
          message: order?.cashbackReleased
            ? 'That order\'s cashback has already been released — resolve this another way.'
            : 'There is no post awaiting approval for that order, so there is no cashback to release. Approve the post in Post Review first, or pick a different outcome.',
        })
      }
    }

    /* ── 2. Claim it ─────────────────────────────────────────────────────────
     * A read-then-write check lets two concurrent resolves both pass and both
     * mint a refund. This makes the loser lose, before any money moves.
     */
    const dispute = await Dispute.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: 'resolved' } },
      { $set: { status: 'resolved', resolvedBy: req.user._id, resolvedAt: new Date() } },
      { new: true },
    )
    if (!dispute) return res.status(409).json({ message: 'Someone else just resolved this one.' })

    // If the money step fails we hold the claim, so nobody else can act on this
    // dispute — hand it back rather than leaving it closed and unpaid.
    const releaseClaim = () => Dispute.updateOne(
      { _id: dispute._id },
      { $set: { status: existing.status, resolvedBy: null, resolvedAt: null } },
    ).catch(() => {})

    /* ── 3. Move the money ───────────────────────────────────────────────── */
    let refundTx = null
    let releasedCashback = 0

    if (resolutionType === 'refund') {
      try {
        refundTx = await Transaction.create({
          userId: dispute.creatorId,
          type:   'refund',
          amount: refundAmountFinal,
          desc:   `Dispute refund — ${order?.product || 'order'} (${order?.orderId || ''})`.trim(),
          status: 'completed',
          orderId: dispute.orderId,
        })
        dispute.refundAmount = refundAmountFinal
        dispute.refundTxId = refundTx._id
      } catch (err) {
        await releaseClaim()
        console.error('[dispute refund]', err)
        return res.status(500).json({ message: 'Could not issue the refund — the dispute is still open.' })
      }
    }

    if (postToApprove) {
      try {
        const { released } = await approvePost(postToApprove, { approvedBy: req.user._id })
        if (!released) {
          await releaseClaim()
          return res.status(400).json({ message: 'The post was approved but the order is not in a state that pays out (not delivered, cancelled, or already paid).' })
        }
        releasedCashback = postToApprove.orderId?.cashbackAmount || order?.cashbackAmount || 0
      } catch (err) {
        await releaseClaim()
        return res.status(err.status || 500).json({ message: err.message || 'Could not release the cashback — the dispute is still open.' })
      }
    }

    dispute.resolution = String(resolution || 'Resolved by admin').slice(0, 1000)
    dispute.resolutionType = ['refund', 'cashback_released', 'replacement', 'rejected', 'other'].includes(resolutionType) ? resolutionType : 'other'
    dispute.messages.push({ from: req.user._id, role: 'admin', text: dispute.resolution })
    await dispute.save()

    notifySafe(dispute.creatorId, {
      type: 'dispute', icon: refundTx || releasedCashback ? '💰' : '✅', title: 'Dispute resolved',
      body: refundTx
        ? `৳${refundTx.amount.toLocaleString()} was refunded to your wallet. ${dispute.resolution}`
        : releasedCashback
          ? `৳${releasedCashback.toLocaleString()} cashback was released to your wallet. ${dispute.resolution}`
          : dispute.resolution,
      link: refundTx || releasedCashback ? '/creator/wallet' : '/creator/disputes',
    })
    notifySafe(dispute.brandId, {
      type: 'dispute', icon: '✅', title: 'Dispute resolved',
      body: dispute.resolution,
      link: '/brand/disputes',
    })

    audit.record({
      actor: req.user, action: refundTx ? audit.ACTIONS.DISPUTE_REFUNDED : audit.ACTIONS.DISPUTE_RESOLVED,
      targetType: 'dispute', targetId: dispute._id, targetName: order?.orderId || '',
      amount: refundTx ? refundTx.amount : (releasedCashback || null),
      summary: `${dispute.resolutionType.replace(/_/g, ' ')}${refundTx ? ` — refunded ৳${refundTx.amount}` : releasedCashback ? ` — released ৳${releasedCashback}` : ''}: ${dispute.resolution}`,
      req,
    })
    res.json({ dispute: await populated(Dispute.findById(dispute._id)), refund: refundTx, message: 'Dispute resolved.' })
  } catch (err) {
    console.error('[dispute resolve]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
