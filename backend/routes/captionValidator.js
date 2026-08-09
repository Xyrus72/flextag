const express  = require('express')
const router   = express.Router()
const Campaign = require('../models/Campaign')
const { requireAuth, requireRole } = require('../middleware/auth')

// ── Lazy-init Groq client (OpenAI-compatible) ─────────────────────────────
let _groq = null
function getGroq () {
  if (_groq) return _groq
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey || apiKey === 'your_groq_api_key_here') return null
  const { OpenAI } = require('openai')
  _groq = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' })
  return _groq
}

// ── Helpers ────────────────────────────────────────────────────────────────
function parseList (str) {
  if (!str || !str.trim()) return []
  return str
    .split(/[,\n]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function deterministicChecks (caption, requiredHashtags, requiredHandles) {
  const lower = caption.toLowerCase()
  const checks = []

  requiredHashtags.forEach(h => {
    const tag = h.startsWith('#') ? h : `#${h}`
    const found = lower.includes(tag.toLowerCase())
    checks.push({
      type:       'hashtag',
      label:      tag,
      passed:     found,
      suggestion: found ? null : `Add ${tag} to your caption`,
    })
  })

  requiredHandles.forEach(h => {
    const handle = h.startsWith('@') ? h : `@${h}`
    const found = lower.includes(handle.toLowerCase())
    checks.push({
      type:       'handle',
      label:      handle,
      passed:     found,
      suggestion: found ? null : `Tag ${handle} in your caption`,
    })
  })

  const hasMinLength = caption.length >= 50
  checks.push({
    type:       'length',
    label:      'Min 50 characters',
    passed:     hasMinLength,
    suggestion: hasMinLength ? null : `Add more content (${50 - caption.length} more characters needed)`,
  })

  return checks
}

// ── POST /api/caption/validate ─────────────────────────────────────────────
router.post('/validate', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { caption, campaignId } = req.body

    if (!caption || !campaignId) {
      return res.status(400).json({ message: 'caption and campaignId are required.' })
    }

    // Fetch campaign for its requirements
    const campaign = await Campaign.findById(campaignId)
    if (!campaign) return res.status(404).json({ message: 'Campaign not found.' })

    const requiredHashtags = parseList(campaign.hashtags)
    const requiredHandles  = parseList(campaign.handles)

    // 1. Deterministic checks
    const checks   = deterministicChecks(caption, requiredHashtags, requiredHandles)
    const allPassed = checks.every(c => c.passed)

    // 2. AI analysis (optional — graceful if no key)
    let ai = null
    const groq = getGroq()

    if (groq) {
      try {
        const systemPrompt = `You are a social-media caption reviewer for an influencer marketing platform called FlexTag.
A creator is about to post content for a brand campaign and wants to validate their draft caption BEFORE submitting.

Campaign details:
- Title: ${campaign.title}
- Brand: ${campaign.brand}
- Category: ${campaign.category}
- Required hashtags: ${requiredHashtags.join(', ') || 'none specified'}
- Required handles: ${requiredHandles.join(', ') || 'none specified'}

Deterministic check results (hashtag/handle presence):
${checks.map(c => `- ${c.label}: ${c.passed ? 'PRESENT ✓' : 'MISSING ✗'}`).join('\n')}

Respond in JSON with this exact shape (no markdown fences):
{
  "score": <number 0-100>,
  "tone": "<one of: excellent, good, needs_work, poor>",
  "toneComment": "<1 sentence about tone & authenticity>",
  "suggestions": ["<actionable suggestion 1>", "..."],
  "improvedCaption": "<optional improved version of the caption or null>"
}`

        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          temperature: 0.4,
          max_tokens: 500,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: caption },
          ],
        })

        const raw = completion.choices?.[0]?.message?.content?.trim()
        if (raw) {
          // Strip potential markdown code fences
          const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
          ai = JSON.parse(cleaned)
        }
      } catch (aiErr) {
        console.error('[captionValidator] Groq error (non-fatal):', aiErr.message)
        // ai stays null — deterministic results still returned
      }
    }

    res.json({
      checks,
      allPassed,
      ai,
      campaign: {
        title:    campaign.title,
        brand:    campaign.brand,
        category: campaign.category,
        hashtags: requiredHashtags,
        handles:  requiredHandles,
      },
    })
  } catch (err) {
    console.error('[captionValidator]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
