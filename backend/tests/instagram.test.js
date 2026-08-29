'use strict'
/**
 * Unit tests for the pure parts of the Instagram intelligence service.
 * Run: `npm test` (node --test). No network, no database.
 */
const test = require('node:test')
const assert = require('node:assert/strict')

process.env.IG_JOBS = 'off'

const ep = require('../services/instagram/endpoints')
const nz = require('../services/instagram/normalize')
const sc = require('../services/instagram/scoring')
const { buildChecks, statusFromChecks, splitList, embedToPost } = require('../services/instagram/postCheck')

const DAY = 86_400_000
const daysAgo = (n, now = Date.now()) => new Date(now - n * DAY)

/* ── endpoints helpers ───────────────────────────────────────────────────── */

test('normalizeHandle / cleanUsername accept handles, @handles and profile URLs', () => {
  assert.equal(ep.normalizeHandle('@Some.User_1'), 'some.user_1')
  assert.equal(ep.normalizeHandle('https://www.instagram.com/Some.User/?hl=en'), 'some.user')
  assert.equal(ep.normalizeHandle('  cristiano  '), 'cristiano')
  assert.equal(ep.normalizeHandle('bad handle!'), '')
  assert.equal(ep.normalizeHandle(''), '')
  assert.throws(() => ep.cleanUsername('bad handle!'), /Invalid Instagram username/)
})

test('parsePostUrl extracts shortcodes from post / reel / tv links', () => {
  assert.equal(ep.parsePostUrl('https://www.instagram.com/p/CxYz12AbCd3/'), 'CxYz12AbCd3')
  assert.equal(ep.parsePostUrl('https://instagram.com/reel/CxYz12AbCd3/?igsh=abc'), 'CxYz12AbCd3')
  assert.equal(ep.parsePostUrl('https://www.instagram.com/reels/CxYz12AbCd3'), 'CxYz12AbCd3')
  assert.equal(ep.parsePostUrl('https://www.instagram.com/someuser/reel/CxYz12AbCd3/'), 'CxYz12AbCd3')
  assert.equal(ep.parsePostUrl('https://www.instagram.com/someuser/'), null)
  assert.equal(ep.parsePostUrl('not a url'), null)
})

test('shortcode <-> media id round-trips (known pair)', () => {
  // "B" alphabet index 1 → media id 1; a real-world example:
  assert.equal(ep.shortcodeToMediaId('B'), '1')
  assert.equal(ep.mediaIdToShortcode('1'), 'B')
  const code = 'CxYz12AbCd3'
  assert.equal(ep.mediaIdToShortcode(ep.shortcodeToMediaId(code)), code)
  assert.equal(ep.mediaIdToShortcode('3089104521245678901_123'), ep.mediaIdToShortcode('3089104521245678901'))
})

/* ── normalize ───────────────────────────────────────────────────────────── */

const webProfile = {
  id: '123', username: 'Creator.One', full_name: 'Creator One', biography: 'hi', external_url: 'https://x.y',
  is_private: false, is_verified: true, is_business_account: false, is_professional_account: true, category_name: 'Blogger',
  profile_pic_url_hd: 'https://cdn/pic.jpg', edge_followed_by: { count: 12_400 }, edge_follow: { count: 300 },
  edge_owner_to_timeline_media: { count: 88, edges: [{ node: {
    id: '999', shortcode: 'CxYz12AbCd3', taken_at_timestamp: 1_700_000_000, is_video: false, __typename: 'GraphImage',
    edge_liked_by: { count: 640 }, edge_media_to_comment: { count: 22 },
    edge_media_to_caption: { edges: [{ node: { text: 'Loving #GlowUp with @GlowUpBD #flextagcreator' } }] }, thumbnail_src: 'https://cdn/t.jpg',
  } }] },
}

test('normalizeProfile maps the web shape', () => {
  const p = nz.normalizeProfile(webProfile)
  assert.equal(p.username, 'creator.one')
  assert.equal(p.followers, 12_400)
  assert.equal(p.following, 300)
  assert.equal(p.posts, 88)
  assert.equal(p.isVerified, true)
  assert.equal(p.isProfessional, true)
  assert.equal(p.category, 'Blogger')
})

test('normalizePost handles web and mobile shapes, hidden likes, hashtags and mentions', () => {
  const web = nz.normalizePost(webProfile.edge_owner_to_timeline_media.edges[0].node, 'creator.one')
  assert.equal(web.shortcode, 'CxYz12AbCd3')
  assert.equal(web.likes, 640)
  assert.equal(web.comments, 22)
  assert.equal(web.mediaType, 'image')
  assert.deepEqual(web.hashtags, ['glowup', 'flextagcreator'])
  assert.deepEqual(web.mentions, ['glowupbd'])
  assert.equal(web.takenAt.getTime(), 1_700_000_000_000)

  const mobile = nz.normalizePost({
    pk: '888_1', code: 'DabcDEF1234', taken_at: 1_700_100_000, media_type: 2, product_type: 'clips', like_count: 10, like_and_view_counts_disabled: true,
    comment_count: 5, play_count: 9000, caption: { text: 'reel time #GlowUp' }, user: { username: 'Creator.One', is_private: false },
    image_versions2: { candidates: [{ url: 'https://cdn/m.jpg' }] },
  })
  assert.equal(mobile.id, '888')
  assert.equal(mobile.mediaType, 'reel')
  assert.equal(mobile.likes, null, 'hidden likes → null')
  assert.equal(mobile.views, 9000)
  assert.equal(mobile.owner, 'creator.one')
  assert.equal(mobile.url, 'https://www.instagram.com/reel/DabcDEF1234/')
})

test('normalizeFollower flags anonymous profile pictures', () => {
  assert.equal(nz.normalizeFollower({ username: 'a', profile_pic_url: 'https://cdn/44884218_345707102882519_2446069589734326272_n.jpg' }).hasAnonymousPic, true)
  assert.equal(nz.normalizeFollower({ username: 'b', has_anonymous_profile_picture: true, profile_pic_url: 'https://cdn/x.jpg' }).hasAnonymousPic, true)
  assert.equal(nz.normalizeFollower({ username: 'c', full_name: ' C ', profile_pic_url: 'https://cdn/x.jpg' }).hasAnonymousPic, false)
})

/* ── scoring ─────────────────────────────────────────────────────────────── */

function makePosts(n, { likes = 500, comments = 20, spreadDays = 2, now = Date.now(), jitter = 0.3 } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    shortcode: 'S' + i, takenAt: daysAgo(i * spreadDays, now), mediaType: i % 3 === 0 ? 'reel' : 'image',
    likes: Math.round(likes * (1 + jitter * Math.sin(i))), comments: Math.round(comments * (1 + jitter * Math.cos(i))), views: i % 3 === 0 ? 4000 : null,
    hashtags: ['a', 'b'], mentions: [],
  }))
}

test('computeMetrics: engagement rate, cadence, recency', () => {
  const now = Date.now()
  const profile = { followers: 10_000, following: 500 }
  const m = sc.computeMetrics(profile, makePosts(20, { likes: 400, comments: 20, now }), { now })
  assert.equal(m.postsAnalyzed, 20)
  assert.ok(m.engagementRate > 3.5 && m.engagementRate < 5, `ER ${m.engagementRate}`)
  assert.equal(m.engagementBasis, 'likes+comments')
  // 20 posts spaced 2 days apart = 40-day span inside the 60-day window → 20/60*7 ≈ 2.3/week
  assert.ok(m.postsPerWeek >= 2 && m.postsPerWeek <= 2.5, `ppw ${m.postsPerWeek}`)
  assert.equal(m.daysSinceLastPost, 0)
  assert.equal(m.followRatio, 0.1)
})

test('computeMetrics falls back when likes are hidden on every post', () => {
  const now = Date.now()
  const posts = makePosts(10, { now }).map((p) => ({ ...p, likes: null }))
  const m = sc.computeMetrics({ followers: 5000 }, posts, { now })
  assert.equal(m.hiddenLikesShare, 100)
  assert.notEqual(m.engagementBasis, 'likes+comments')
  assert.ok(m.engagementRate != null)
})

test('scoreHealth: healthy nano account grades A; dormant account grades low', () => {
  const now = Date.now()
  const good = { followers: 5000, following: 400 }
  const mGood = sc.computeMetrics(good, makePosts(20, { likes: 350, comments: 18, now }), { now })
  const hGood = sc.scoreHealth(mGood, good)
  assert.ok(hGood.score >= 85, `score ${hGood.score}`)
  assert.equal(hGood.grade, 'A')
  assert.equal(hGood.breakdown.length, 4)

  const bad = { followers: 50_000, following: 120_000 }
  const stale = makePosts(6, { likes: 40, comments: 0, spreadDays: 30, now }).map((p) => ({ ...p, takenAt: daysAgo(90 + Math.random() * 10, now) }))
  const mBad = sc.computeMetrics(bad, stale, { now })
  const hBad = sc.scoreHealth(mBad, bad)
  assert.ok(hBad.score < 40, `score ${hBad.score}`)
  assert.ok(hBad.flags.some((f) => /No posts in/.test(f)))
  assert.ok(hBad.flags.some((f) => /follow-for-follow/i.test(f)))
})

test('scoreHealth penalises purchased-looking likes (uniform, comment-less)', () => {
  const now = Date.now()
  const profile = { followers: 20_000, following: 300 }
  const uniform = makePosts(12, { likes: 2000, comments: 1, now, jitter: 0 })
  const h = sc.scoreHealth(sc.computeMetrics(profile, uniform, { now }), profile)
  const auth = h.breakdown.find((b) => b.key === 'authenticity')
  assert.ok(auth.score <= 7, `authenticity ${auth.score}`)
  assert.ok(h.flags.some((f) => /purchased likes/i.test(f)))
  assert.ok(h.flags.some((f) => /uniform/i.test(f)))
})

test('estimateFakeFollowers: clean sample → good; bot-like sample → poor; no sample → unknown', () => {
  const now = Date.now()
  const profile = { followers: 8000, following: 400 }
  const metrics = sc.computeMetrics(profile, makePosts(15, { likes: 400, comments: 20, now }), { now })

  const clean = Array.from({ length: 100 }, (_, i) => ({ username: `realperson${i % 7}.x`, fullName: 'Real Person', isPrivate: i % 2 === 0, isVerified: false, hasAnonymousPic: false }))
  const a = sc.estimateFakeFollowers(clean, metrics, profile)
  assert.equal(a.quality, 'good')
  assert.ok(a.fakeFollowerPct < 15)

  const bots = Array.from({ length: 100 }, (_, i) => i < 60
    ? { username: `user${100000 + i}`, fullName: '', isPrivate: true, isVerified: false, hasAnonymousPic: true }
    : { username: `person.${i}`, fullName: 'Some One', isPrivate: false, isVerified: false, hasAnonymousPic: false })
  const b = sc.estimateFakeFollowers(bots, metrics, profile)
  assert.equal(b.quality, 'poor')
  assert.ok(b.fakeFollowerPct >= 55, `pct ${b.fakeFollowerPct}`)
  assert.equal(b.counts.suspicious, 60)

  const none = sc.estimateFakeFollowers([], metrics, profile)
  assert.equal(none.fakeFollowerPct, null)
  assert.equal(none.quality, 'unknown')
})

test('estimateFakeFollowers adds a spike signal when followers jump >40% within 14 days', () => {
  const now = Date.now()
  const profile = { followers: 15_000, following: 300 }
  const metrics = sc.computeMetrics(profile, makePosts(15, { likes: 600, comments: 30, now }), { now })
  const sample = Array.from({ length: 50 }, (_, i) => ({ username: `ok.person${i}`, fullName: 'Ok', isPrivate: false, isVerified: false, hasAnonymousPic: false }))
  const r = sc.estimateFakeFollowers(sample, metrics, profile, [{ at: daysAgo(5, now), followers: 9000 }])
  assert.ok(r.signals.some((s) => s.key === 'spike'))
  assert.ok(r.fakeFollowerPct >= 10)
})

test('evaluateEligibility enforces public + minimum followers', () => {
  assert.deepEqual(sc.evaluateEligibility({ isPrivate: false, followers: 1500 }, { minFollowers: 1000 }), { eligible: true, reasons: [], minFollowers: 1000 })
  const r = sc.evaluateEligibility({ isPrivate: true, followers: 500 }, { minFollowers: 1000, blockPrivate: true })
  assert.equal(r.eligible, false)
  assert.equal(r.reasons.length, 2)
  assert.equal(sc.evaluateEligibility({ isPrivate: true, followers: 5000 }, { minFollowers: 1000, blockPrivate: false }).eligible, true)
})

/* ── post verification rules ─────────────────────────────────────────────── */

const campaign = { hashtags: '#GlowUpMatte, #FlextagCreator', handles: '@glowupbd', contentType: 'reel' }
const order = { createdAt: daysAgo(3) }
const creator = { instagramHandle: 'creator.one' }
const goodPost = { shortcode: 'ABC', owner: 'creator.one', ownerIsPrivate: false, takenAt: daysAgo(1), mediaType: 'reel', hashtags: ['glowupmatte', 'flextagcreator', 'extra'], mentions: ['glowupbd'] }

test('buildChecks passes a compliant reel', () => {
  const checks = buildChecks({ campaign, order, creator, fetched: goodPost })
  assert.equal(statusFromChecks(checks), 'passed')
  assert.deepEqual(checks.map((c) => c.key), ['exists', 'public', 'owner', 'identity', 'postedAfterOrder', 'hashtags', 'mentions', 'contentType'])
  const identity = checks.find((c) => c.key === 'identity')
  assert.equal(identity.required, false, 'identity is informational — it gates auto-approval, not the content verdict')
  assert.equal(identity.passed, false)
  assert.equal(buildChecks({ campaign, order, creator: { ...creator, igVerified: true }, fetched: goodPost }).find((c) => c.key === 'identity').passed, true)
})

test('buildChecks fails on wrong owner, missing hashtag, pre-order date, wrong type', () => {
  const wrongOwner = buildChecks({ campaign, order, creator, fetched: { ...goodPost, owner: 'someone.else' } })
  assert.equal(wrongOwner.find((c) => c.key === 'owner').passed, false)
  assert.equal(statusFromChecks(wrongOwner), 'failed')

  const missingTag = buildChecks({ campaign, order, creator, fetched: { ...goodPost, hashtags: ['glowupmatte'] } })
  assert.match(missingTag.find((c) => c.key === 'hashtags').detail, /#flextagcreator/)

  const early = buildChecks({ campaign, order, creator, fetched: { ...goodPost, takenAt: daysAgo(10) } })
  assert.equal(early.find((c) => c.key === 'postedAfterOrder').passed, false)

  const photo = buildChecks({ campaign, order, creator, fetched: { ...goodPost, mediaType: 'image' } })
  assert.equal(photo.find((c) => c.key === 'contentType').passed, false)
})

test('buildChecks: missing post → only the exists check; caption unavailable → error (manual review)', () => {
  const gone = buildChecks({ campaign, order, creator, fetched: null })
  assert.equal(gone.length, 1)
  assert.equal(statusFromChecks(gone), 'failed')

  const noCaption = buildChecks({ campaign, order, creator, fetched: { ...goodPost, hashtags: null, mentions: null } })
  assert.equal(noCaption.find((c) => c.key === 'hashtags').passed, null)
  assert.equal(statusFromChecks(noCaption), 'error')
})

/* ── HikerAPI provider normalizers (shapes captured from live responses) ──── */

const hiker = require('../services/instagram/providers/hiker')

test('hiker: normalizeHikerUser maps /v1/user/by/username', () => {
  const p = hiker.normalizeHikerUser({ pk: 25025320, username: 'Instagram', full_name: 'Instagram', is_private: false, is_verified: true, is_business: false, media_count: 8562, follower_count: 686162597, following_count: 276, biography: 'Discover', external_url: 'http://help.instagram.com', profile_pic_url: 'https://cdn/p.jpg' })
  assert.equal(p.igUserId, '25025320')
  assert.equal(p.username, 'instagram')
  assert.equal(p.followers, 686162597)
  assert.equal(p.following, 276)
  assert.equal(p.posts, 8562)
  assert.equal(p.isVerified, true)
  assert.equal(p.externalUrl, 'http://help.instagram.com')
})

test('hiker: normalizeHikerMedia maps medias/chunk items (caption_text, ISO taken_at, clips)', () => {
  const m = hiker.normalizeHikerMedia({ pk: '3967266982361430113', id: '3967266982361430113_25025320', code: 'DcOkE0Myfhh', taken_at: '2026-08-19T15:59:32Z', media_type: 2, product_type: 'clips', like_count: 418786, comment_count: 13864, play_count: 91675152, like_and_view_counts_disabled: false, caption_text: '@kazaneat does football tricks #reels', user: { username: 'instagram' }, thumbnail_url: 'https://cdn/t.jpg' })
  assert.equal(m.id, '3967266982361430113')
  assert.equal(m.shortcode, 'DcOkE0Myfhh')
  assert.equal(m.mediaType, 'reel')
  assert.equal(m.likes, 418786)
  assert.equal(m.comments, 13864)
  assert.equal(m.views, 91675152)
  assert.equal(m.takenAt.toISOString(), '2026-08-19T15:59:32.000Z')
  assert.deepEqual(m.hashtags, ['reels'])
  assert.deepEqual(m.mentions, ['kazaneat'])
  assert.equal(m.owner, 'instagram')
  assert.equal(m.url, 'https://www.instagram.com/reel/DcOkE0Myfhh/')
  // hidden likes → null; missing play_count → null views
  const hidden = hiker.normalizeHikerMedia({ code: 'X', media_type: 1, like_count: 5, like_and_view_counts_disabled: true, comment_count: 1, taken_at_ts: 1700000000 })
  assert.equal(hidden.likes, null)
  assert.equal(hidden.mediaType, 'image')
  assert.equal(hidden.takenAt.getTime(), 1700000000000)
})

test('hiker: chunk envelopes and follower/comment normalizers', () => {
  assert.deepEqual(hiker.chunkItems([[{ a: 1 }, { a: 2 }], 'cur_1']), [{ a: 1 }, { a: 2 }])
  assert.equal(hiker.chunkCursor([[{ a: 1 }], 'cur_1']), 'cur_1')
  assert.equal(hiker.chunkCursor([[{ a: 1 }], null]), null)
  const f = hiker.normalizeHikerFollower({ pk: 1, username: 'Eloise457395', full_name: 'Eloise Lima', is_private: true, is_verified: false, profile_pic_url: 'https://cdn/x.jpg' })
  assert.deepEqual(f, { username: 'eloise457395', fullName: 'Eloise Lima', isPrivate: true, isVerified: false, hasAnonymousPic: false })
  assert.equal(hiker.normalizeHikerFollower({ username: 'bot123456', profile_pic_url: '' }).hasAnonymousPic, true)
  const c = hiker.normalizeHikerComment({ user: { username: 'Fre365tyle' }, text: 'Ohh yeah! 🔥', created_at: 1787168284, comment_like_count: 90 }, 'DcOkE0Myfhh')
  assert.equal(c.username, 'fre365tyle')
  assert.equal(c.likes, 90)
  assert.equal(c.createdAt.getTime(), 1787168284000)
  assert.equal(c.shortcode, 'DcOkE0Myfhh')
})

test('splitList and embedToPost', () => {
  assert.deepEqual(splitList('#GlowUp, #FlexTag  #x', /^#/), ['glowup', 'flextag', 'x'])
  assert.deepEqual(splitList('@Brand,@other', /^@/), ['brand', 'other'])
  const e = embedToPost({ shortcode: 'ABC', owner: 'Brand', caption: 'hey #Tag @who', likes: 12, takenAt: 1_700_000_000, isVideo: true, isPrivate: false })
  assert.equal(e.mediaType, 'video')
  assert.deepEqual(e.hashtags, ['tag'])
  assert.deepEqual(e.mentions, ['who'])
  assert.equal(e.owner, 'brand')
  assert.equal(embedToPost({ shortcode: 'X', caption: null }).hashtags, null)
})
