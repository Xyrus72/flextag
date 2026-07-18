const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, unique: true },
  icon:     { type: String, default: '📦' },
  active:   { type: Boolean, default: true },
  products: { type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('Category', categorySchema)
