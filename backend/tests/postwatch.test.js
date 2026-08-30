'use strict'
/** Post auto-detection — the matcher that decides which order a spotted post is about. */
const test = require('node:test')
const assert = require('node:assert')
const { scoreMatch, matchMediaToOrders, extractTags, extractMentions, verifyWebhookSignature } = require('../services/instagram/postWatch')
const crypto = require('crypto')

const media = (over = {}) => ({
  caption: 'Loving my new serum! #FlexTag #AuraGlow @auraglow.bd',
  mediaType: 'reel',
  takenAt: new Date('2026-08-30T12:00:00Z'),
  ...over,
})
const candidate = (over = {}) => ({
  order: { _id: 'o1', createdAt: new Date('2026-08-28T00:00:00Z') },
  campaign: { _id: 'c1', product: 'Glow Serum' },
  rules: { hashtags: ['#FlexTag', '#AuraGlow'], handles: ['@auraglow.bd'], contentType: 'reel' },
  ...over,
})

test('caption hashtags and mentions are extracted case-insensitively, Bangla included', () => {
  assert.deepStrictEqual(extractTags('Try it! #FlexTag #অসাধারণ #flextag'), ['flextag', 'অসাধারণ'])
  assert.deepStrictEqual(extractMentions('with @AuraGlow.BD. and @flextag.official'), ['auraglow.bd', 'flextag.official'])
})

test('a post carrying the campaign tags scores as a strong match', () => {
  const { score, reasons } = scoreMatch(media(), candidate())
  // 2 hashtags ×2 + 1 handle ×3 + content type = 8
  assert.strictEqual(score, 8)
  assert.ok(reasons.includes('#flextag') && reasons.includes('@auraglow.bd'))
})

test('a post from BEFORE the order was placed can never claim it', () => {
  const { score, reasons } = scoreMatch(media({ takenAt: new Date('2026-08-01T00:00:00Z') }), candidate())
  assert.strictEqual(score, 0)
  assert.match(reasons[0], /before the order/)
})

test('recency alone is not a match — an unrelated selfie claims nothing', () => {
  const best = matchMediaToOrders(media({ caption: 'Sunset in Cox’s Bazar 🌅' }), [candidate()])
  assert.strictEqual(best, null)
})

test('the best-scoring order wins when two campaigns are open', () => {
  const weak = candidate({ order: { _id: 'oW', createdAt: new Date('2026-08-28') }, rules: { hashtags: ['#FlexTag'], handles: [], contentType: 'any' } })
  const strong = candidate()
  const best = matchMediaToOrders(media(), [weak, strong])
  assert.strictEqual(best.order._id, 'o1')
  assert.ok(best.score > 4)
})

test('rules stored as strings with # and @ prefixes match captions all the same', () => {
  const c = candidate({ rules: { hashtags: ['FlexTag'], handles: ['auraglow.bd'], contentType: 'any' } })
  const { score } = scoreMatch(media(), c)
  assert.ok(score >= 5, `expected >= 5, got ${score}`)
})

test('a reel satisfies a "reel" content-type requirement; an image does not', () => {
  const rulesOnlyType = candidate({ rules: { hashtags: ['#FlexTag'], handles: [], contentType: 'reel' } })
  const asReel = scoreMatch(media(), rulesOnlyType).score
  const asImage = scoreMatch(media({ mediaType: 'image' }), rulesOnlyType).score
  assert.strictEqual(asReel - asImage, 1)
})

test('webhook signature: the real HMAC passes, anything else fails, never throws', () => {
  const secret = 'app-secret'
  const body = Buffer.from(JSON.stringify({ object: 'instagram', entry: [] }))
  const good = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
  assert.strictEqual(verifyWebhookSignature(body, good, secret), true)
  assert.strictEqual(verifyWebhookSignature(body, 'sha256=' + '0'.repeat(64), secret), false)
  assert.strictEqual(verifyWebhookSignature(body, good, 'wrong-secret'), false)
  assert.strictEqual(verifyWebhookSignature(null, good, secret), false)
  assert.strictEqual(verifyWebhookSignature(body, null, secret), false)
})
