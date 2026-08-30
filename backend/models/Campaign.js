const mongoose = require('mongoose')

const campaignSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  brand:        { type: String, required: true },
  brandId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product:      { type: String, required: true },
  productId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  category:     { type: String, default: 'Beauty' },
  price:        { type: Number, required: true },
  cashbackRate: { type: Number, required: true },
  // % of the reward applied as an INSTANT discount at checkout (rest = bonus on verified post).
  // 0 = legacy pay-full-price-cashback-later.
  instantSplitPct: { type: Number, default: 0, min: 0, max: 100 },
  stock:        { type: Number, default: 100 },
  stockLeft:    { type: Number, default: 100 },
  minFollowers: { type: Number, default: 1000 },
  hashtags:     { type: String, default: '' },
  handles:      { type: String, default: '' },
  contentType:  { type: String, enum: ['any', 'reel', 'post', 'carousel'], default: 'any' },  // required media type for post verification
  deadline:     { type: Date },
  retentionDays:{ type: Number, default: 7 },
  budgetCap:    { type: Number, default: 0 },
  budgetUsed:   { type: Number, default: 0 },
  isPrivate:    { type: Boolean, default: false },
  status:       { type: String, enum: ['active', 'paused', 'closed'], default: 'active' },
  totalOrders:  { type: Number, default: 0 },
  totalCreators:{ type: Number, default: 0 },
  // Unguessable token that makes the campaign's performance report publicly
  // shareable — the case-study link a brand (or FlexTag itself) sends around.
  // null = private; generated on the brand's explicit "share" action.
  reportToken:  { type: String, default: null, index: true },
}, { timestamps: true })

module.exports = mongoose.model('Campaign', campaignSchema)
