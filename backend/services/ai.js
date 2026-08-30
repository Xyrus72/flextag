'use strict'
/**
 * AI creative services (captions + caption validation) on Claude.
 *
 * - Uses the official Anthropic SDK; model claude-opus-5, adaptive thinking,
 *   structured JSON output via output_config.format (zodOutputFormat).
 * - Never throws at callers: every public function returns { ok, ... } and,
 *   when the API is unavailable (no key, rate limit, refusal), degrades to the
 *   deterministic/template fallback so the UI always has something to show.
 * - Compliance is never left to the model. Generation runs generate → check →
 *   repair: every variant is checked against the campaign requirements with the
 *   SAME extraction the live verifier uses, failing variants get one targeted
 *   rewrite pass, and a final append is the last-resort guarantee.
 * - Validation's deterministic half IS the verification engine: it calls
 *   postCheck.previewDraft (buildChecks on a synthetic draft post), so the
 *   verdict here predicts, by construction, what verifyPost will say about the
 *   caption. The model only judges quality and proposes a rewrite.
 * - Generation is grounded in the creator's own voice: pass styleSample (their
 *   recent real captions, e.g. from their Instagram audit) and the model writes
 *   like them — language mix, emoji habits, rhythm — instead of like an ad.
 */
const AnthropicMod = require('@anthropic-ai/sdk')
const Anthropic = AnthropicMod.default || AnthropicMod
const { z } = require('zod')
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod')
const { extractHashtags, extractMentions } = require('./instagram/normalize')
const { previewDraft } = require('./instagram/postCheck')

const MODEL = process.env.AI_MODEL || 'claude-opus-5'

let client = null
function isConfigured() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}
function getClient() {
  if (!client) client = new Anthropic({ timeout: 60_000, maxRetries: 2 })
  return client
}

/* ── Shared helpers ──────────────────────────────────────────────────────── */

const norm = (s) => String(s || '').trim()
const tagList = (arr) => [...new Set((arr || []).map((t) => norm(t).replace(/^#/, '').toLowerCase()).filter(Boolean))]
const handleList = (arr) => [...new Set((arr || []).map((h) => norm(h).replace(/^@/, '').toLowerCase()).filter(Boolean))]

/** Required items a caption is missing, using the verifier's own extraction. */
function missingIn(text, hashtags, handles) {
  const tags = new Set(extractHashtags(text))
  const mentions = new Set(extractMentions(text))
  return [
    ...hashtags.filter((t) => !tags.has(t)).map((t) => '#' + t),
    ...handles.filter((h) => !mentions.has(h)).map((h) => '@' + h),
  ]
}

/** Last-resort guarantee: append whatever is still missing after the repair pass. */
function ensureRequirements(text, hashtags, handles) {
  const missing = missingIn(text, hashtags, handles)
  const missingMentions = missing.filter((m) => m.startsWith('@'))
  const missingTags = missing.filter((m) => m.startsWith('#'))
  let out = text.trim()
  if (missingMentions.length) out += ` ${missingMentions.join(' ')}`
  if (missingTags.length) out += `\n${missingTags.join(' ')}`
  return out
}

/**
 * Guess the creator's writing language from their real captions. Bengali script
 * is unmistakable; everything else stays null (the caller picks the default) —
 * romanized Banglish vs English can't be told apart reliably enough to guess.
 */
function detectLanguage(samples) {
  const text = (samples || []).join(' ')
  if (!text.trim()) return null
  const bangla = (text.match(/[ঀ-৿]/g) || []).length
  const latin = (text.match(/[a-z]/gi) || []).length
  return bangla >= (bangla + latin) * 0.25 && bangla > 20 ? 'bangla' : null
}

const LANG_RULES = {
  bangla:   'Write entirely in Bangla using Bengali script (বাংলা). Hashtags and @handles stay in Latin letters.',
  english:  'Write in natural, warm English as a Bangladeshi creator would.',
  banglish: 'Write in Banglish — Bangla words spelled in Latin letters mixed with English, the way Dhaka creators actually text (e.g. "eta literally amazing 🤩"). Hashtags and @handles stay as given.',
}

const SYSTEM = `You write Instagram captions for FlexTag — a Bangladeshi creator-commerce platform where nano/micro creators buy a product, post honestly about it, and earn cashback from the brand.

Rules you must follow:
- Sound like a real creator sharing a product they bought and use: first person, specific, honest. No exaggerated claims, no medical/health promises, nothing you couldn't verify from the product name and category alone.
- Every required hashtag and @handle must appear VERBATIM (same spelling, case-insensitive) — they are how the post is verified. Put hashtags at the end, mentions naturally in the text or at the end.
- Keep it 2–4 sentences plus the hashtag line. Emoji are fine in moderation. No markdown.
- Bangladesh context: Taka (৳), local style, Eid/seasonal references only if natural.
- Respect the requested language exactly.
- When the creator's past captions are provided, match their voice — sentence rhythm, emoji habits, language mix, typical length. Never copy their phrases verbatim; write NEW captions the way they would.`

/* ── Captions ────────────────────────────────────────────────────────────── */

const CaptionsSchema = z.object({
  captions: z.array(z.object({
    text: z.string(),
    angle: z.string().describe('one short phrase describing the hook used, e.g. "before/after", "daily routine"'),
  })).min(1).max(5),
})

const RepairSchema = z.object({
  captions: z.array(z.string()).describe('the revised captions, same order as given'),
})

/** Deterministic fallback used when the model isn't available. */
function templateCaptions({ product, brand, language, hashtags, handles }) {
  const p = product || 'this product'
  const b = brand || 'our partner brand'
  const tags = tagList(hashtags)
  const tagLine = (tags.length ? tags : ['flextagcreator']).map((t) => '#' + t).join(' ')
  const mention = handleList(handles).map((h) => '@' + h).join(' ')
  const bodies = {
    bangla:   [`✨ ${p} দিয়ে আজকের লুক! ${b} থেকে পারফেক্ট প্রোডাক্ট পেলাম 🔥`, `${p} ব্যবহার করছি কয়েকদিন ধরে — সত্যিই ভালো লেগেছে 💜`],
    english:  [`✨ Obsessed with ${p} from ${b}! Absolutely loving it — my new favorite 🔥`, `Been using ${p} for a few days now and honestly? Worth it. 💜`],
    banglish: [`✨ Guys! ${p} ta literally AMAZING 🤩 ${b} er ei product try korte hobe! Full recommend!`, `${p} niye ami honestly impressed — ${b} nailed it 💜`],
  }
  const list = bodies[language] || bodies.english
  return list.map((text, i) => ({ text: `${text}${mention ? ' ' + mention : ''}\n\n${tagLine}`, angle: i === 0 ? 'excitement' : 'daily use' }))
}

/** One targeted rewrite of the variants that failed the compliance check. */
async function repairCompliance(failing) {
  const brief = [
    'These Instagram caption drafts are each missing required elements that verification checks for.',
    'For each caption, return a revised version that weaves the missing items in NATURALLY — mentions inside a sentence where they fit, hashtags on the final hashtag line.',
    'Change nothing else: keep the voice, language and length exactly as they are. Return the captions in the same order.',
    '',
    ...failing.map((f, i) => `Caption ${i + 1} (missing ${f.missing.join(' ')}):\n"""${f.text}"""`),
  ].join('\n')
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low', format: zodOutputFormat(RepairSchema) },
    system: SYSTEM,
    messages: [{ role: 'user', content: brief }],
  })
  const fixed = response.parsed_output?.captions
  return Array.isArray(fixed) && fixed.length === failing.length ? fixed : null
}

/**
 * @param {{ product: string, brand?: string, category?: string, language?: 'bangla'|'english'|'banglish', tone?: string,
 *           hashtags?: string[], handles?: string[], count?: number, platform?: string, contentType?: string,
 *           styleSample?: string[] }} input
 *   styleSample: the creator's own recent captions (their real voice). Optional.
 * @returns {Promise<{ ok: boolean, source: 'claude'|'template', captions: {text:string, angle:string}[], language: string, model?: string, reason?: string, styled?: boolean }>}
 */
async function generateCaptions(input) {
  const styleSample = (input.styleSample || []).map(norm).filter((c) => c.length >= 20).slice(0, 5).map((c) => c.slice(0, 280))
  const language = ['bangla', 'english', 'banglish'].includes(input.language) ? input.language : detectLanguage(styleSample) || 'english'
  const count = Math.min(5, Math.max(1, Number(input.count) || 3))
  const hashtags = tagList(input.hashtags)
  const handles = handleList(input.handles)
  const fallback = () => ({ ok: true, source: 'template', language, captions: templateCaptions({ ...input, language, hashtags, handles }).slice(0, count) })

  if (!isConfigured()) return { ...fallback(), reason: 'AI not configured' }

  const format = ['reel', 'post', 'carousel'].includes(input.contentType) ? input.contentType : null
  const brief = [
    `Product: ${norm(input.product) || 'unknown product'}`,
    `Brand: ${norm(input.brand) || 'unknown brand'}`,
    input.category ? `Category: ${norm(input.category)}` : null,
    `Platform: ${norm(input.platform) || 'instagram'}${format ? ` (${format === 'post' ? 'photo post' : format} — reference the format naturally if it helps, e.g. "watch till the end" for a reel)` : ''}`,
    `Language: ${language}. ${LANG_RULES[language]}`,
    input.tone ? `Tone: ${norm(input.tone)}` : 'Tone: authentic, upbeat, not salesy',
    `Required hashtags (verbatim): ${hashtags.length ? hashtags.map((t) => '#' + t).join(' ') : 'none — add 3-5 relevant ones'}`,
    `Required mentions (verbatim): ${handles.length ? handles.map((h) => '@' + h).join(' ') : 'none'}`,
    styleSample.length ? `\nThe creator's recent real captions — write NEW captions in this exact voice:\n${styleSample.map((c, i) => `${i + 1}. """${c}"""`).join('\n')}` : null,
    `\nWrite ${count} distinct captions, each with a different hook/angle.`,
  ].filter(Boolean).join('\n')

  try {
    const response = await getClient().messages.parse({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(CaptionsSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content: brief }],
    })
    if (response.stop_reason === 'refusal' || !response.parsed_output) return { ...fallback(), reason: 'model declined' }
    const captions = response.parsed_output.captions.slice(0, count)

    // Generate → check → repair: verify compliance with the verifier's own
    // extraction; failing variants get ONE natural rewrite, then a hard append.
    const failing = captions
      .map((c, i) => ({ i, text: c.text, missing: missingIn(c.text, hashtags, handles) }))
      .filter((f) => f.missing.length)
    if (failing.length) {
      const fixed = await repairCompliance(failing).catch(() => null)
      if (fixed) failing.forEach((f, j) => { captions[f.i] = { ...captions[f.i], text: fixed[j] } })
    }
    for (const c of captions) c.text = ensureRequirements(c.text, hashtags, handles)

    return { ok: true, source: 'claude', model: response.model, language, styled: styleSample.length > 0, captions }
  } catch (err) {
    return { ...fallback(), reason: describeError(err) }
  }
}

/* ── Validation ──────────────────────────────────────────────────────────── */

const ReviewSchema = z.object({
  qualityScore: z.number().min(0).max(100).describe('0-100: how authentic, clear and engaging the caption is (ignore missing hashtags/mentions — those are checked separately)'),
  issues: z.array(z.object({
    type: z.enum(['authenticity', 'clarity', 'claims', 'disclosure', 'language', 'length', 'other']),
    message: z.string(),
  })),
  suggestions: z.array(z.string()).max(5),
  improvedCaption: z.string().describe('a rewrite that keeps the creator voice and includes every required hashtag and mention verbatim'),
})

/**
 * Validate a draft caption. The deterministic half runs the REAL verification
 * engine (postCheck.previewDraft); Claude adds a quality review on top when
 * configured. Callers pass the campaign/order/creator context so the preview
 * matches live verification exactly; hashtags/handles alone build an ad-hoc
 * rule set (the demo mode).
 *
 * @param {{ caption: string, campaign?: object, order?: object, creator?: object, mediaType?: string|null,
 *           hashtags?: string[], handles?: string[], product?: string, brand?: string, contentType?: string, language?: string }} input
 */
async function validateCaption(input) {
  const caption = norm(input.caption)
  const campaign = input.campaign || {
    hashtags: tagList(input.hashtags).join(','),
    handles: handleList(input.handles).join(','),
    contentType: ['reel', 'post', 'carousel'].includes(input.contentType) ? input.contentType : 'any',
  }
  const preview = await previewDraft({ caption, campaign, order: input.order || null, creator: input.creator || null, mediaType: input.mediaType || null })

  const deterministic = {
    wouldPass: preview.wouldPass,
    checks: preview.checks,
    postTimeChecks: preview.postTimeChecks,
    required: preview.required,
    missingHashtags: preview.missing.hashtags,
    missingMentions: preview.missing.mentions,
    foundHashtags: preview.found.hashtags,
    foundMentions: preview.found.mentions,
    length: caption.length,
    requirementsMet: preview.wouldPass,
  }
  const reqHashtags = preview.required.hashtags.map((t) => t.slice(1))
  const reqHandles = preview.required.mentions.map((h) => h.slice(1))
  const missingCount = preview.missing.hashtags.length + preview.missing.mentions.length
  const reqTotal = preview.required.hashtags.length + preview.required.mentions.length
  const missingIssues = [
    ...preview.missing.hashtags.map((t) => ({ type: 'other', message: `Missing required hashtag ${t}` })),
    ...preview.missing.mentions.map((h) => ({ type: 'other', message: `Missing required mention ${h}` })),
  ]

  // Rule-based score when the model is unavailable: requirements are 60 pts, length/structure 40.
  const ruleScore = () => {
    let s = 0
    s += reqTotal ? Math.round(60 * (1 - missingCount / reqTotal)) : 60
    if (caption.length >= 60) s += 20
    if (caption.length <= 600) s += 10
    if (preview.found.hashtags.length >= 3) s += 10
    return Math.min(100, s)
  }
  const fallback = (reason) => {
    const score = ruleScore()
    return { ok: true, source: 'rules', reason, ...deterministic, score, passes: preview.wouldPass && score >= 60,
      issues: missingIssues,
      suggestions: caption.length < 60 ? ['Add a sentence about how you actually use the product.'] : [],
      improvedCaption: ensureRequirements(caption, reqHashtags, reqHandles) }
  }
  if (!caption) return { ...fallback('empty caption'), score: 0, passes: false }
  if (!isConfigured()) return fallback('AI not configured')

  const brief = [
    `Caption to review:\n"""${caption}"""`,
    input.product ? `Product: ${norm(input.product)}` : null,
    input.brand ? `Brand: ${norm(input.brand)}` : null,
    input.contentType ? `Content type: ${norm(input.contentType)}` : null,
    input.language ? `Expected language: ${norm(input.language)}` : null,
    `Required hashtags (verbatim): ${reqHashtags.length ? reqHashtags.map((t) => '#' + t).join(' ') : 'none'}`,
    `Required mentions (verbatim): ${reqHandles.length ? reqHandles.map((h) => '@' + h).join(' ') : 'none'}`,
    `Already missing per our check: ${[...preview.missing.hashtags, ...preview.missing.mentions].join(' ') || 'nothing'} — include them in improvedCaption.`,
    'Judge authenticity (does it read like a real buyer?), unverifiable claims, clarity, and whether a paid-partnership disclosure is present when the text reads like an ad.',
  ].filter(Boolean).join('\n')

  try {
    const response = await getClient().messages.parse({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(ReviewSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content: brief }],
    })
    if (response.stop_reason === 'refusal' || !response.parsed_output) return fallback('model declined')
    const r = response.parsed_output
    const reqScore = reqTotal ? Math.round(40 * (1 - missingCount / reqTotal)) : 40
    const score = Math.round(reqScore + 0.6 * r.qualityScore)
    return {
      ok: true, source: 'claude', model: response.model, ...deterministic, score,
      passes: preview.wouldPass && score >= 60,
      qualityScore: r.qualityScore,
      issues: [...missingIssues, ...r.issues],
      suggestions: r.suggestions,
      improvedCaption: ensureRequirements(r.improvedCaption, reqHashtags, reqHandles),
    }
  } catch (err) {
    return fallback(describeError(err))
  }
}

function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'AI key rejected'
  if (err instanceof Anthropic.RateLimitError) return 'AI rate limited'
  if (err instanceof Anthropic.APIError) return `AI error ${err.status}`
  return err?.message || 'AI unavailable'
}

module.exports = { isConfigured, generateCaptions, validateCaption, templateCaptions, ensureRequirements, missingIn, detectLanguage, MODEL }
