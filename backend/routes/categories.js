const express  = require('express')
const router   = express.Router()
const Category = require('../models/Category')
const { requireAuth, requireRole } = require('../middleware/auth')

// ── GET /api/categories ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 })
    res.json({ categories })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/categories ───────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, icon } = req.body
    if (!name) return res.status(400).json({ message: 'name required.' })

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
    if (existing) return res.status(409).json({ message: 'Category already exists.' })

    const category = await Category.create({ name, icon: icon || '📦' })
    res.status(201).json({ category })
  } catch (err) {
    console.error('[categories POST]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── PUT /api/categories/:id ────────────────────────────────────────────────
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, icon, active } = req.body
    const category = await Category.findById(req.params.id)
    if (!category) return res.status(404).json({ message: 'Category not found.' })

    if (name    !== undefined) category.name   = name
    if (icon    !== undefined) category.icon   = icon
    if (active  !== undefined) category.active = active
    await category.save()

    res.json({ category })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── DELETE /api/categories/:id ────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id)
    if (!category) return res.status(404).json({ message: 'Category not found.' })
    res.json({ message: 'Category deleted.' })
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
