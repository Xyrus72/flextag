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
  // Reward split: instantDiscount came off `total` at checkout; cashbackAmount is
  // the remaining bonus released on verified post; rewardTotal = discount + bonus.
  cashbackAmount:{ type: Number, required: true },
  instantDiscount:{ type: Number, default: 0 },
  // true while the instant discount is counted in the brand's budgetUsed —
  // the atomic guard that makes commit/reclaim idempotent across paths
  instantCommitted:{ type: Boolean, default: false },
  rewardTotal: { type: Number, default: 0 },
  total:      { type: Number, required: true },
  status:     { type: String, enum: ['processing', 'packed', 'shipped', 'delivered', 'cancelled', 'return_requested', 'returned'], default: 'processing' },
  tracking:   { type: String, default: '' },
  returnReason: { type: String, default: '' },
  returnRequestedAt: { type: Date },
  address:    { type: String, default: '' },
  paymentMethod: { type: String, default: 'bkash' },
  // SSLCommerz online-payment fields (COD orders leave paymentStatus 'pending')
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  transactionId: { type: String, default: '', index: true },
  valId:         { type: String, default: '' },
  paymentDetails:{ type: Object, default: {} },
  cashbackReleased: { type: Boolean, default: false },
  cashbackClawedBack: { type: Boolean, default: false },   // released, then order was returned
}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)
