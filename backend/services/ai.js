'use strict'
/**
 * AI creative services (captions + caption validation) on Claude.
 *
 * - Uses the official Anthropic SDK; model claude-opus-5, adaptive thinking,
 *   structured JSON output via output_config.format (zodOutputFormat).
 * - Never throws at callers: every public function returns { ok, ... } and,
 *   when the API is unavailable (no key, rate limit, refusal), degrades to the
 *   deterministic/template fallback so the UI always has something to show.
 * - The deterministic parts of validation (required hashtags / mentions) are
 *   computed in code — the model only judges quality and proposes a rewrite.
 */
const AnthropicMod = require('@anthropic-ai/sdk')
const Anthropic = AnthropicMod.default || AnthropicMod
const { z } = require('zod')
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod')

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
const extractTags = (text) => new Set((String(text || '').match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).map((t) => t.slice(1).toLowerCase()))
const extractMentions = (text) => new Set((String(text || '').match(/@[a-z0-9._]{1,30}/gi) || []).map((t) => t.slice(1).toLowerCase().replace(/\.+$/, '')))

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
- Respect the requested language exactly.`

/* ── Captions ────────────────────────────────────────────────────────────── */

const CaptionsSchema = z.object({
  captions: z.array(z.object({
    text: z.string(),
    angle: z.string().describe('one short phrase describing the hook used, e.g. "before/after", "daily routine"'),
  })).min(1).max(5),
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

/**
 * @param {{ product: string, brand?: string, category?: string, language?: 'bangla'|'english'|'banglish', tone?: string, hashtags?: string[], handles?: string[], count?: number, platform?: string }} input
 * @returns {Promise<{ ok: boolean, source: 'claude'|'template', captions: {text:string, angle:string}[], model?: string, reason?: string }>}
 */
async function generateCaptions(input) {
  const language = ['bangla', 'english', 'banglish'].includes(input.language) ? input.language : 'english'
  const count = Math.min(5, Math.max(1, Number(input.count) || 3))
  const hashtags = tagList(input.hashtags)
  const handles = handleList(input.handles)
  const fallback = () => ({ ok: true, source: 'template', captions: templateCaptions({ ...input, language, hashtags, handles }).slice(0, count) })

  if (!isConfigured()) return { ...fallback(), reason: 'AI not configured' }

  const brief = [
    `Product: ${norm(input.product) || 'unknown product'}`,
    `Brand: ${norm(input.brand) || 'unknown brand'}`,
    input.category ? `Category: ${norm(input.category)}` : null,
    `Platform: ${norm(input.platform) || 'instagram'}`,
    `Language: ${language}. ${LANG_RULES[language]}`,
    input.tone ? `Tone: ${norm(input.tone)}` : 'Tone: authentic, upbeat, not salesy',
    `Required hashtags (verbatim): ${hashtags.length ? hashtags.map((t) => '#' + t).join(' ') : 'none — add 3-5 relevant ones'}`,
    `Required mentions (verbatim): ${handles.length ? handles.map((h) => '@' + h).join(' ') : 'none'}`,
    `Write ${count} distinct captions, each with a different hook/angle.`,
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
    // Belt and braces: guarantee the verbatim requirements even if the model slipped.
    const captions = response.parsed_output.captions.map((c) => ({ ...c, text: ensureRequirements(c.text, hashtags, handles) }))
    return { ok: true, source: 'claude', model: response.model, captions }
  } catch (err) {
    return { ...fallback(), reason: describeError(err) }
  }
}

function ensureRequirements(text, hashtags, handles) {
  const haveTags = extractTags(text), haveMentions = extractMentions(text)
  const missingTags = hashtags.filter((t) => !haveTags.has(t)).map((t) => '#' + t)
  const missingMentions = handles.filter((h) => !haveMentions.has(h)).map((h) => '@' + h)
  let out = text.trim()
  if (missingMentions.length) out += ` ${missingMentions.join(' ')}`
  if (missingTags.length) out += `\n${missingTags.join(' ')}`
  return out
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
 * @param {{ caption: string, hashtags?: string[], handles?: string[], product?: string, brand?: string, contentType?: string, language?: string }} input
 */
async function validateCaption(input) {
  const caption = norm(input.caption)
  const hashtags = tagList(input.hashtags)
  const handles = handleList(input.handles)
  const haveTags = extractTags(caption), haveMentions = extractMentions(caption)
  const missingHashtags = hashtags.filter((t) => !haveTags.has(t)).map((t) => '#' + t)
  const missingMentions = handles.filter((h) => !haveMentions.has(h)).map((h) => '@' + h)
  const deterministic = {
    missingHashtags, missingMentions,
    foundHashtags: [...haveTags].map((t) => '#' + t), foundMentions: [...haveMentions].map((h) => '@' + h),
    length: caption.length,
    requirementsMet: missingHashtags.length === 0 && missingMentions.length === 0,
  }
  // Rule-based score when the model is unavailable: requirements are 60 pts, length/structure 40.
  const ruleScore = () => {
    let s = 0
    const reqTotal = hashtags.length + handles.length
    s += reqTotal ? Math.round(60 * (1 - (missingHashtags.length + missingMentions.length) / reqTotal)) : 60
    if (caption.length >= 60) s += 20
    if (caption.length <= 600) s += 10
    if (haveTags.size >= 3) s += 10
    return Math.min(100, s)
  }
  const fallback = (reason) => {
    const score = ruleScore()
    return { ok: true, source: 'rules', reason, ...deterministic, score, passes: deterministic.requirementsMet && score >= 60,
      issues: [...missingHashtags.map((t) => ({ type: 'other', message: `Missing required hashtag ${t}` })), ...missingMentions.map((h) => ({ type: 'other', message: `Missing required mention ${h}` }))],
      suggestions: caption.length < 60 ? ['Add a sentence about how you actually use the product.'] : [],
      improvedCaption: ensureRequirements(caption, hashtags, handles) }
  }
  if (!caption) return { ...fallback('empty caption'), score: 0, passes: false }
  if (!isConfigured()) return fallback('AI not configured')

  const brief = [
    `Caption to review:\n"""${caption}"""`,
    input.product ? `Product: ${norm(input.product)}` : null,
    input.brand ? `Brand: ${norm(input.brand)}` : null,
    input.contentType ? `Content type: ${norm(input.contentType)}` : null,
    input.language ? `Expected language: ${norm(input.language)}` : null,
    `Required hashtags (verbatim): ${hashtags.length ? hashtags.map((t) => '#' + t).join(' ') : 'none'}`,
    `Required mentions (verbatim): ${handles.length ? handles.map((h) => '@' + h).join(' ') : 'none'}`,
    `Already missing per our check: ${[...missingHashtags, ...missingMentions].join(' ') || 'nothing'} — include them in improvedCaption.`,
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
    const reqTotal = hashtags.length + handles.length
    const reqScore = reqTotal ? Math.round(40 * (1 - (missingHashtags.length + missingMentions.length) / reqTotal)) : 40
    const score = Math.round(reqScore + 0.6 * r.qualityScore)
    return {
      ok: true, source: 'claude', model: response.model, ...deterministic, score,
      passes: deterministic.requirementsMet && score >= 60,
      qualityScore: r.qualityScore,
      issues: [...missingHashtags.map((t) => ({ type: 'other', message: `Missing required hashtag ${t}` })), ...missingMentions.map((h) => ({ type: 'other', message: `Missing required mention ${h}` })), ...r.issues],
      suggestions: r.suggestions,
      improvedCaption: ensureRequirements(r.improvedCaption, hashtags, handles),
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

module.exports = { isConfigured, generateCaptions, validateCaption, templateCaptions, MODEL }
