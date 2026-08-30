const mongoose = require('mongoose')

const shippingAddressSchema = new mongoose.Schema({
  label:     { type: String, default: 'Home' },   // e.g. Home, Office
  fullName:  { type: String, default: '' },
  phone:     { type: String, default: '' },
  street:    { type: String, required: true },
  city:      { type: String, default: '' },
  state:     { type: String, default: '' },
  zip:       { type: String, default: '' },
  country:   { type: String, default: 'Bangladesh' },
  isDefault: { type: Boolean, default: false },
}, { _id: true })

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
  creatorRatingAvg:   { type: Number, default: 0 },   // how brands rate this creator
  creatorRatingCount: { type: Number, default: 0 },
  shippingAddresses: { type: [shippingAddressSchema], default: [] },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  // Brand-only
  companyName:     { type: String, default: '' },
  website:         { type: String, default: '' },
  productCategory: { type: String, default: '' },
  logoUrl:         { type: String, default: '' },
  address:         { type: String, default: '' },
  totalCampaigns:  { type: Number, default: 0 },
  totalCreators:   { type: Number, default: 0 },
  brandRatingAvg:   { type: Number, default: 0 },     // how creators rate this brand
  brandRatingCount: { type: Number, default: 0 },

  // Referrals
  referralCode:     { type: String, default: '', index: true },
  referredBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  referralRewarded: { type: Boolean, default: false },

  // Fraud / identity signals (services/fraud.js) — evidence for a human, not a verdict
  emailCanonical: { type: String, default: '', index: true },  // gmail dots/+tags stripped
  signupIp:    { type: String, default: '' },
  lastIp:      { type: String, default: '' },
  riskScore:   { type: Number, default: 0 },
  riskLevel:   { type: String, enum: ['clear', 'low', 'medium', 'high'], default: 'clear' },
  riskFlags:   { type: [String], default: [] },
  riskCheckedAt: { type: Date, default: null },
  riskNote:    { type: String, default: '' },
  riskWhitelisted: { type: Boolean, default: false },   // admin says the signals are known-good
  blocked:     { type: Boolean, default: false },
  blockReason: { type: String, default: '' },

  // Email preferences. Transactional = money + disputes (opt-out), digest =
  // the daily catch-up of everything else.
  notificationPrefs: {
    email: {
      transactional: { type: Boolean, default: true },
      digest:        { type: Boolean, default: true },
    },
  },
  unsubscribeToken: { type: String, default: '', index: true },

  // Shared
  isVerified:  { type: Boolean, default: false },
  igVerified:  { type: Boolean, default: false },   // admin-verified Instagram identity
  // Instagram audit summary (denormalized from IgAudit for lists / signup gating)
  igPrecheck:        { type: String, enum: ['pending', 'passed', 'failed', 'skipped'], default: 'pending' },
  igAuditedAt:       { type: Date, default: null },
  igHealthScore:     { type: Number, default: null },
  igFakeFollowerPct: { type: Number, default: null },
  igIsPrivate:       { type: Boolean, default: null },
  // Ownership proof: the creator puts this code in their Instagram bio, we confirm it → igVerified
  igVerifyCode:      { type: String, default: '' },
  igVerifyCodeAt:    { type: Date, default: null },
  igVerifiedAt:      { type: Date, default: null },
  // "Connect Instagram" (OAuth). The token is `select: false` so it can never
  // ride along in a user payload by accident — routes ask for it explicitly.
  igConnected:       { type: Boolean, default: false },
  igGraphUserId:     { type: String, default: '' },
  igGraphUsername:   { type: String, default: '' },
  igGraphToken:      { type: String, default: '', select: false },
  igTokenExpiresAt:  { type: Date, default: null },
  igConnectedAt:     { type: Date, default: null },
  igWatchLastAt:     { type: Date, default: null },   // post-watch: when we last looked at their media
  avatar:      { type: String, default: null },
  isSuper:     { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
