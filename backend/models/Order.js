const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  orderId:    { type: String, required: true, unique: true },
  creatorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brandId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product:    { type: String, required: true },
  brand:      { type: String, required: true },
  image:      { type: String, default: '📦' },
  qty:        { type: Number, default: 1 },
  price:      { type: Number, required: true },
  cashbackRate:{ type: Number, required: true },
  cashbackAmount:{ type: Number, required: true },
  total:      { type: Number, required: true },
  status:     { type: String, enum: ['processing', 'packed', 'shipped', 'delivered', 'cancelled'], default: 'processing' },
  tracking:   { type: String, default: '' },
  address:    { type: String, default: '' },
  paymentMethod: { type: String, default: 'bkash' },
  cashbackReleased: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)
