'use strict'
/**
 * The caption tools: the verification-preview engine (previewDraft runs the
 * REAL buildChecks against a synthetic draft) and the compliance helpers the
 * generator's generate → check → repair loop leans on.
 */
const test = require('node:test')
const assert = require('node:assert')
// These tests exercise the no-key degradation paths regardless of the shell env.
delete process.env.ANTHROPIC_API_KEY
delete process.env.ANTHROPIC_AUTH_TOKEN
const { previewDraft, requiredLists } = require('../services/instagram/postCheck')
const { ensureRequirements, missingIn, detectLanguage, templateCaptions, generateCaptions } = require('../services/ai')

// A campaign with rules in BOTH places they can live: the Campaign's
// comma-separated strings and a product's postingRules arrays (already merged
// onto the doc, so resolveRules stays off the database).
const campaign = (over = {}) => ({
  product: 'Glow Serum', brand: 'AuraGlow', contentType: 'any',
  hashtags: '#FlexTag, #GlowUp',
  handles: '@auraglow.bd',
  postingRules: { hashtags: ['#AuraSquad'], taggingHandles: [] },
  ...over,
})
const creator = (over = {}) => ({ instagramHandle: '@rima.bd', igVerified: true, ...over })
const byKey = (checks, key) => checks.find((c) => c.key === key)

test('requiredLists merges campaign strings with product postingRules, deduped and lowercased', () => {
  const req = requiredLists(campaign({ postingRules: { hashtags: ['#AuraSquad', '#flextag'], taggingHandles: ['@AuraGlow.BD'] } }))
  assert.deepStrictEqual(req.hashtags, ['flextag', 'glowup', 'aurasquad'])
  assert.deepStrictEqual(req.mentions, ['auraglow.bd'])
})

test('previewDraft: a compliant caption passes, with every requirement accounted for', async () => {
  const p = await previewDraft({
    caption: 'Loving this serum from @AuraGlow.bd — two weeks in and my skin thanks me. #FlexTag #GlowUp #AuraSquad',
    campaign: campaign(), creator: creator(),
  })
  assert.strictEqual(p.wouldPass, true)
  assert.strictEqual(byKey(p.checks, 'hashtags').passed, true)
  assert.strictEqual(byKey(p.checks, 'mentions').passed, true)
  assert.deepStrictEqual(p.missing, { hashtags: [], mentions: [] })
  assert.deepStrictEqual(p.required.hashtags, ['#flextag', '#glowup', '#aurasquad'])
})

test('previewDraft: missing requirements fail exactly like live verification would', async () => {
  const p = await previewDraft({ caption: 'Great serum! #FlexTag', campaign: campaign(), creator: creator() })
  assert.strictEqual(p.wouldPass, false)
  assert.strictEqual(byKey(p.checks, 'hashtags').passed, false)
  assert.match(byKey(p.checks, 'hashtags').detail, /#glowup/)
  assert.strictEqual(byKey(p.checks, 'mentions').passed, false)
  assert.deepStrictEqual(p.missing.hashtags, ['#glowup', '#aurasquad'])
  assert.deepStrictEqual(p.missing.mentions, ['@auraglow.bd'])
})

test('previewDraft: Bangla hashtags with vowel signs match end to end', async () => {
  const p = await previewDraft({
    caption: 'দারুণ প্রোডাক্ট! #অসাধারণ @auraglow.bd',
    campaign: campaign({ hashtags: '#অসাধারণ', postingRules: { hashtags: [], taggingHandles: [] } }),
    creator: creator(),
  })
  assert.strictEqual(byKey(p.checks, 'hashtags').passed, true)
  assert.deepStrictEqual(p.found.hashtags, ['#অসাধারণ'])
})

test('previewDraft: post-only checks are deferred, never failed, on a draft', async () => {
  const p = await previewDraft({ caption: 'x', campaign: campaign(), order: { createdAt: new Date() }, creator: creator() })
  const deferred = p.postTimeChecks.map((c) => c.key).sort()
  assert.deepStrictEqual(deferred, ['exists', 'owner', 'postedAfterOrder', 'public'])
  for (const c of p.postTimeChecks) assert.strictEqual(c.passed, null, `${c.key} must not carry a fake verdict`)
  // contentType 'any' adds no check at all
  assert.strictEqual(byKey(p.checks, 'contentType'), undefined)
})

test('previewDraft: planned media type answers the content-type rule now; unplanned defers it', async () => {
  const reel = campaign({ contentType: 'reel' })
  const planned = await previewDraft({ caption: 'x', campaign: reel, creator: creator(), mediaType: 'reel' })
  assert.strictEqual(byKey(planned.checks, 'contentType').passed, true)
  const wrong = await previewDraft({ caption: 'x', campaign: reel, creator: creator(), mediaType: 'image' })
  assert.strictEqual(byKey(wrong.checks, 'contentType').passed, false)
  const unplanned = await previewDraft({ caption: 'x', campaign: reel, creator: creator() })
  assert.strictEqual(byKey(unplanned.postTimeChecks, 'contentType').passed, null)
})

test('previewDraft: identity check reflects the real creator and stays informational', async () => {
  const p = await previewDraft({ caption: 'Two weeks with @auraglow.bd #FlexTag #GlowUp #AuraSquad', campaign: campaign(), creator: creator({ igVerified: false }) })
  const c = byKey(p.checks, 'identity')
  assert.strictEqual(c.passed, false)
  assert.strictEqual(c.required, false, 'identity must never block a draft')
  assert.strictEqual(p.wouldPass, true, 'an informational miss must not flip the verdict')
})

test('missingIn/ensureRequirements: verifier-grade extraction, append as last resort', () => {
  assert.deepStrictEqual(missingIn('Nice! #FlexTag', ['flextag', 'glowup'], ['auraglow.bd']), ['#glowup', '@auraglow.bd'])
  const fixed = ensureRequirements('Nice! #FlexTag', ['flextag', 'glowup'], ['auraglow.bd'])
  assert.deepStrictEqual(missingIn(fixed, ['flextag', 'glowup'], ['auraglow.bd']), [])
  // already compliant → untouched
  assert.strictEqual(ensureRequirements('All set @auraglow.bd #FlexTag #GlowUp', ['flextag', 'glowup'], ['auraglow.bd']), 'All set @auraglow.bd #FlexTag #GlowUp')
})

test('detectLanguage: Bengali script in the style sample means bangla; Latin stays undecided', () => {
  assert.strictEqual(detectLanguage(['আজকের লুকটা কেমন হলো বলো তো? নতুন শাড়িটা পরে একদম অন্যরকম লাগছে নিজেকে!']), 'bangla')
  assert.strictEqual(detectLanguage(['Loving this look today, guys! Absolutely obsessed with the new saree.']), null)
  assert.strictEqual(detectLanguage([]), null)
})

test('generateCaptions without a key: template source, but still fully compliant', async () => {
  const r = await generateCaptions({ product: 'Glow Serum', brand: 'AuraGlow', hashtags: ['#FlexTag', '#GlowUp'], handles: ['@auraglow.bd'], count: 2 })
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.source, 'template')
  assert.strictEqual(r.captions.length, 2)
  for (const c of r.captions) assert.deepStrictEqual(missingIn(c.text, ['flextag', 'glowup'], ['auraglow.bd']), [])
})

test('templateCaptions honor the language switch', () => {
  const bn = templateCaptions({ product: 'সিরাম', brand: 'AuraGlow', language: 'bangla', hashtags: ['#FlexTag'], handles: [] })
  assert.match(bn[0].text, /[ঀ-৿]/)
  assert.match(bn[0].text, /#flextag/)
})
