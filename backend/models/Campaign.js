const mongoose = require('mongoose')

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  brand: {
    type: String,
    required: true
  },

  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  product: {
    type: String,
    required: true
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },

  category: {
    type: String,
    default: 'Beauty'
  },

  price: {
    type: Number,
    required: true
  },

  cashbackRate: {
    type: Number,
    required: true
  },

  stock: {
    type: Number,
    default: 100
  },

  stockLeft: {
    type: Number,
    default: 100
  },

  minFollowers: {
    type: Number,
    default: 1000
  },

  hashtags: {
    type: String,
    default: ''
  },

  handles: {
    type: String,
    default: ''
  },

  deadline: {
    type: Date
  },

  retentionDays: {
    type: Number,
    default: 7
  },

  budgetCap: {
    type: Number,
    default: 0
  },

  budgetUsed: {
    type: Number,
    default: 0
  },

  // Public or private campaign
  isPrivate: {
    type: Boolean,
    default: false
  },

  // Creators allowed to participate in a private campaign
  invitedCreators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

status: {
  type: String,
  enum: ['pending', 'active', 'paused', 'closed', 'rejected'],
  default: 'pending'
},

  totalOrders: {
    type: Number,
    default: 0
  },

  totalCreators: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
})

module.exports = mongoose.model('Campaign', campaignSchema)