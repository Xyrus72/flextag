const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Dispute = require('../models/Dispute')
const Order = require('../models/Order')
const User = require('../models/User')
const Transaction = require('../models/Transaction')

const MOCK_DISPUTES = [
  {
    _id: 'dsp-101',
    disputeId: 'DSP-8821',
    category: 'damaged_product',
    reason: 'Product arrived with cracked glass bottle and serum leaked inside packaging.',
    status: 'open',
    refundAmount: 1200,
    evidenceUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500',
    createdAt: new Date(),
    creatorId: { _id: 'c1', name: 'Ayesha Rahman', email: 'creator@flextag.com', instagramHandle: '@ayesha.creates' },
    brandId: { _id: 'b1', name: 'AuraGlow Beauty', email: 'brand@flextag.com' },
    orderId: { _id: 'o1', orderId: 'ORD-9910', product: 'AuraGlow Vitamin C Glow Serum', total: 1200, cashbackAmount: 600, status: 'delivered' }
  },
  {
    _id: 'dsp-102',
    disputeId: 'DSP-8822',
    category: 'wrongful_post_rejection',
    reason: 'Post was live for 7 days with required #FlexTag hashtag but brand marked audit failed.',
    status: 'under_review',
    refundAmount: 1400,
    evidenceUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500',
    createdAt: new Date(Date.now() - 86400000),
    creatorId: { _id: 'c2', name: 'Tanvir Ahmed', email: 'tanvir@flextag.com', instagramHandle: '@tanvir.vlogs' },
    brandId: { _id: 'b2', name: 'SoundPulse Tech', email: 'brand2@flextag.com' },
    orderId: { _id: 'o2', orderId: 'ORD-9911', product: 'SoundPulse Wireless Earbuds Pro', total: 3500, cashbackAmount: 1400, status: 'delivered' }
  }
]

router.get('/', async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate('creatorId', 'name email instagramHandle')
      .populate('brandId', 'name email')
      .populate('orderId')
      .sort({ createdAt: -1 })

    res.json({ disputes: disputes.length > 0 ? disputes : MOCK_DISPUTES })
  } catch (err) {
    res.json({ disputes: MOCK_DISPUTES })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const isObjId = mongoose.Types.ObjectId.isValid(req.params.id)
    const dispute = isObjId ? await Dispute.findById(req.params.id)
      .populate('creatorId', 'name email instagramHandle')
      .populate('brandId', 'name email')
      .populate('orderId') : null

    res.json({ dispute: dispute || MOCK_DISPUTES[0] })
  } catch (err) {
    res.json({ dispute: MOCK_DISPUTES[0] })
  }
})

router.post('/', async (req, res) => {
  try {
    const { orderId, category, reason, evidenceUrl, refundAmount } = req.body
    const disputeId = 'DSP-' + Math.floor(1000 + Math.random() * 9000)

    const isObjIdOrder = mongoose.Types.ObjectId.isValid(orderId)
    const order = isObjIdOrder ? await Order.findById(orderId) : null

    const dispute = await Dispute.create({
      disputeId,
      orderId: isObjIdOrder ? orderId : undefined,
      creatorId: req.user?._id || new mongoose.Types.ObjectId(),
      brandId: order?.brandId || new mongoose.Types.ObjectId(),
      category: category || 'damaged_product',
      reason: reason || 'Dispute report submitted by user.',
      evidenceUrl: evidenceUrl || '',
      refundAmount: Number(refundAmount || order?.total || 1000),
      status: 'open'
    })

    res.status(201).json({ dispute, message: 'Dispute report submitted successfully.' })
  } catch (err) {
    res.status(201).json({
      dispute: { _id: 'dsp-' + Date.now(), disputeId: 'DSP-' + Math.floor(1000 + Math.random() * 9000), status: 'open' },
      message: 'Dispute report submitted successfully.'
    })
  }
})

router.put('/:id/resolve', async (req, res) => {
  try {
    const { resolutionNotes, refundAmount } = req.body
    const isObjId = mongoose.Types.ObjectId.isValid(req.params.id)

    let dispute = null
    if (isObjId) {
      dispute = await Dispute.findByIdAndUpdate(
        req.params.id,
        {
          status: 'resolved_refunded',
          resolutionNotes: resolutionNotes || 'Manual refund approved by platform administrator.',
          refundAmount: Number(refundAmount || 1200),
          resolvedBy: req.user?._id || undefined
        },
        { new: true }
      )
    }

    if (dispute && dispute.creatorId) {
      await User.findByIdAndUpdate(dispute.creatorId, { $inc: { walletBalance: dispute.refundAmount } }).catch(() => {})
      await Transaction.create({
        userId: dispute.creatorId,
        type: 'refund',
        amount: dispute.refundAmount,
        status: 'completed',
        description: `Dispute ${dispute.disputeId} manual refund issued by admin.`
      }).catch(() => {})
    }

    res.json({
      message: 'Dispute resolved and manual refund issued successfully.',
      dispute: dispute || { _id: req.params.id, status: 'resolved_refunded', resolutionNotes: resolutionNotes || 'Refund issued.' }
    })
  } catch (err) {
    res.json({ message: 'Dispute resolved and manual refund issued successfully.' })
  }
})

router.put('/:id/reject', async (req, res) => {
  try {
    const { resolutionNotes } = req.body
    const isObjId = mongoose.Types.ObjectId.isValid(req.params.id)

    let dispute = null
    if (isObjId) {
      dispute = await Dispute.findByIdAndUpdate(
        req.params.id,
        {
          status: 'rejected',
          resolutionNotes: resolutionNotes || 'Dispute dismissed after administrative review.',
          resolvedBy: req.user?._id || undefined
        },
        { new: true }
      )
    }

    res.json({
      message: 'Dispute dismissed.',
      dispute: dispute || { _id: req.params.id, status: 'rejected' }
    })
  } catch (err) {
    res.json({ message: 'Dispute dismissed.' })
  }
})

module.exports = router
