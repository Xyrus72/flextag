const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  brand:       { type: String, required: true, trim: true },
  brandId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  price:       { type: Number, required: true },
  cashbackRate:{ type: Number, required: true, min: 0, max: 100 },
  category:    { type: String, required: true },
  image:       { type: String, default: '' },
  rating:      { type: Number, default: 0 },
  reviews:     { type: Number, default: 0 },
  inStock:     { type: Boolean, default: true },
  stock:       { type: Number, default: 0 },
  description: { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  // Approval workflow
  status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
}, { timestamps: true })

module.exports = mongoose.model('Product', productSchema)

