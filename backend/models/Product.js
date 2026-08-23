const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  price: { type: Number, required: true, min: 0 },
  cashbackRate: { type: Number, required: true, min: 0, max: 100 },
  category: { type: String, required: true },
  image: { type: String, default: '' },
  rating: { type: Number, default: 4.5 },
  reviews: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true },
  stock: { type: Number, default: 10 },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  rejectionReason: { type: String, default: '' },
  campaignBudget: { type: Number, default: 50000, min: 0 },
  totalCashbackSpent: { type: Number, default: 0, min: 0 },
  creatorCriteria: {
    minFollowers: { type: Number, default: 1000 },
    targetCategory: { type: String, default: 'General' }
  },
  postingRules: {
    hashtags: [{ type: String }],
    taggingHandles: [{ type: String }],
    contentType: { type: String, default: 'Instagram Post or Reel' }
  }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })

productSchema.virtual('netPrice').get(function () {
  return Math.round(this.price * (1 - (this.cashbackRate || 0) / 100))
})

productSchema.virtual('savingsAmount').get(function () {
  return Math.round(this.price * ((this.cashbackRate || 0) / 100))
})

productSchema.virtual('isBudgetCapReached').get(function () {
  if (!this.campaignBudget) return false
  return (this.totalCashbackSpent || 0) >= this.campaignBudget
})

productSchema.virtual('remainingBudget').get(function () {
  const budget = this.campaignBudget || 50000
  const spent = this.totalCashbackSpent || 0
  return Math.max(0, budget - spent)
})

module.exports = mongoose.model('Product', productSchema)
