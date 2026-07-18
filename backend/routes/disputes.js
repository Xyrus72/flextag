const express  = require('express')
const router   = express.Router()
const Dispute  = require('../models/Dispute')
const { requireAuth, requireRole } = require('../middleware/auth')

// ── GET /api/disputes ──────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query
    const filter = {}
    if (req.user.role === 'creator') filter.creatorId = req.user._id
    if (req.user.role === 'brand')   filter.brandId   = req.user._id
    if (status && status !== 'all')  filter.status    = status

    const disputes = await Dispute.find(filter)
      .populate('creatorId', 'name instagramHandle')
      .populate('brandId',   'companyName name')
      .populate('orderId',   'orderId product total')
      .sort({ createdAt: -1 })

    res.json({ disputes })
  } catch (err) {
    console.error('[disputes GET]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/disputes — creator files a dispute ──────────────────────────
router.post('/', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { orderId, brandId, type, description, amount } = req.body
    if (!orderId || !brandId || !type || !description || !amount) {
      return res.status(400).json({ message: 'All fields required.' })
    }

    const dispute = await Dispute.create({
      creatorId: req.user._id,
      brandId, orderId, type, description,
      amount: Number(amount),
    })

    res.status(201).json({ dispute, message: 'Dispute filed.' })
  } catch (err) {
    console.error('[disputes POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/disputes/:id/resolve — admin resolves dispute ────────────────
router.put('/:id/resolve', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { resolution } = req.body
    const dispute = await Dispute.findById(req.params.id)
    if (!dispute) return res.status(404).json({ message: 'Dispute not found.' })

    dispute.status     = 'resolved'
    dispute.resolution = resolution || 'Manually resolved by admin'
    dispute.resolvedBy = req.user._id
    await dispute.save()

    res.json({ dispute, message: 'Dispute resolved.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/disputes/:id/investigate — admin marks as investigating ───────
router.put('/:id/investigate', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { status: 'investigating' },
      { new: true }
    )
    if (!dispute) return res.status(404).json({ message: 'Dispute not found.' })
    res.json({ dispute })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
