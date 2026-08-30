const mongoose = require('mongoose')

/**
 * An Instagram post FlexTag spotted on its own, before the creator told us.
 *
 * The whole point of auto-detection is closing the gap between "creator posted
 * the reel" and "FlexTag knows": today that gap is however long it takes them
 * to come back to the app and paste a link, which is where cashback claims go
 * to die. Each row is one spotted media item, deduped per creator by media id,
 * so a webhook and the polling job discovering the same reel is harmless.
 *
 * Lifecycle: new → submitted / auto_submitted (a real Post now exists) or
 * dismissed ("that reel wasn't for a campaign").
 */
const detectedPostSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mediaId:   { type: String, required: true },        // Instagram's own id — the dedupe key
  shortcode: { type: String, default: '' },
  permalink: { type: String, default: '' },
  mediaType: { type: String, default: '' },           // reel | video | image | carousel
  caption:   { type: String, default: '' },           // first 500 chars, for the match + the card
  thumbnail: { type: String, default: '' },
  takenAt:   { type: Date, default: null },
  source:    { type: String, enum: ['graph', 'webhook', 'hiker', 'session'], default: 'graph' },

  // Best guess at which order this post is about (campaign hashtags/mentions).
  matchedOrderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  matchedCampaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  matchScore:        { type: Number, default: 0 },
  matchReasons:      { type: [String], default: [] },

  status:     { type: String, enum: ['new', 'submitted', 'auto_submitted', 'dismissed'], default: 'new', index: true },
  postId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },   // set once submitted
  notifiedAt: { type: Date, default: null },
}, { timestamps: true })

// One row per (creator, media) — webhook + poller + restarts all collapse into it.
detectedPostSchema.index({ creatorId: 1, mediaId: 1 }, { unique: true })
detectedPostSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('DetectedPost', detectedPostSchema)
