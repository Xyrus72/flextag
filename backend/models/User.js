const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone:    { type: String, default: '' },
  role:     { type: String, enum: ['creator', 'brand', 'admin'], default: 'creator' },

  // Creator-only
  instagramHandle: { type: String, default: '' },
  followersCount:  { type: Number, default: 0 },
  tiktokHandle:    { type: String, default: '' },
  engagementRate:  { type: Number, default: 0 },
  tier:            { type: String, default: 'bronze' },
  totalEarnings:   { type: Number, default: 0 },
  completedCampaigns: { type: Number, default: 0 },

  // Brand-only
  companyName:     { type: String, default: '' },
  website:         { type: String, default: '' },
  productCategory: { type: String, default: '' },
  totalCampaigns:  { type: Number, default: 0 },
  totalCreators:   { type: Number, default: 0 },

  // Shared
  isVerified: { type: Boolean, default: false },
  avatar:     { type: String, default: null },
  isSuper:    { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
