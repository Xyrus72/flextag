const mongoose = require('mongoose')

/**
 * One document per Instagram username (upserted on every audit). Holds the
 * latest snapshot plus a short history so follower spikes can be detected.
 */
const PostSchema = new mongoose.Schema({
  id: String, shortcode: String, url: String, takenAt: Date,
  mediaType: { type: String, enum: ['image', 'video', 'carousel', 'reel'], default: 'image' },
  likes: { type: Number, default: null },      // null = hidden by the owner
  comments: { type: Number, default: 0 },
  views: { type: Number, default: null },
  caption: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  hashtags: { type: [String], default: [] },
  mentions: { type: [String], default: [] },
}, { _id: false })

const IgAuditSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  igUserId:  { type: String, default: '' },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

  profile: {
    fullName: String, biography: String, externalUrl: String,
    isPrivate: Boolean, isVerified: Boolean, isBusiness: Boolean, isProfessional: Boolean,
    category: String, profilePicUrl: String,
    followers: { type: Number, default: 0 }, following: { type: Number, default: 0 }, posts: { type: Number, default: 0 },
  },

  posts: { type: [PostSchema], default: [] },
  commentSamples: { type: [{ shortcode: String, username: String, text: String, createdAt: Date, likes: Number }], default: [] },

  followerSample: {
    size: { type: Number, default: 0 }, anonymousPic: { type: Number, default: 0 }, noName: { type: Number, default: 0 },
    digitHeavy: { type: Number, default: 0 }, privateAndEmpty: { type: Number, default: 0 }, suspicious: { type: Number, default: 0 },
  },

  metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
  health: {
    score: { type: Number, default: 0 }, grade: { type: String, default: 'F' },
    breakdown: { type: [{ key: String, label: String, score: Number, max: Number, detail: String }], default: [] },
    flags: { type: [String], default: [] },
  },
  audience: {
    fakeFollowerPct: { type: Number, default: null },
    quality: { type: String, enum: ['good', 'fair', 'poor', 'unknown'], default: 'unknown' },
    signals: { type: [{ key: String, label: String, value: String, weight: Number, detail: String }], default: [] },
    sampleSize: { type: Number, default: 0 },
  },
  eligibility: { eligible: { type: Boolean, default: false }, reasons: { type: [String], default: [] }, minFollowers: { type: Number, default: 1000 } },

  source:     { type: String, enum: ['session', 'anonymous', 'fixture'], default: 'session' },
  depth:      { type: String, enum: ['basic', 'full'], default: 'basic' },
  fetchedAt:  { type: Date, default: Date.now, index: true },
  profileCheckedAt: { type: Date, default: null },   // last lightweight profile refresh (signup prechecks)
  durationMs: { type: Number, default: 0 },
  fetchErrors: { type: [String], default: [] },   // non-fatal problems during the fetch ("errors" is reserved by Mongoose)

  history: { type: [{ at: Date, followers: Number, following: Number, posts: Number, engagementRate: Number, healthScore: Number, fakeFollowerPct: Number }], default: [] },
}, { timestamps: true })

module.exports = mongoose.model('IgAudit', IgAuditSchema)
