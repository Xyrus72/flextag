import api from './api'

/** → { configured, model } */
export const getAiStatus = () => api.get('/api/ai/status').then(r => r.data)

/**
 * Generate captions. Pass orderId or campaignId so the required hashtags/mentions are applied automatically.
 * body { orderId?, campaignId?, product?, brand?, language: 'bangla'|'english'|'banglish', tone?, count?, hashtags?, handles? }
 * → { ok, source: 'claude'|'template', captions: [{ text, angle }], model?, reason? }
 */
export const generateCaptions = (data) => api.post('/api/ai/caption', data, { timeout: 90000 }).then(r => r.data)

/**
 * Validate a caption against campaign rules + quality review.
 * body { caption, orderId?, campaignId?, hashtags?, handles?, product?, brand?, contentType?, language? }
 * → { ok, source: 'claude'|'rules', score, passes, qualityScore?, missingHashtags, missingMentions, foundHashtags, foundMentions,
 *     issues: [{ type, message }], suggestions: string[], improvedCaption, reason? }
 */
export const validateCaption = (data) => api.post('/api/ai/validate', data, { timeout: 90000 }).then(r => r.data)

/**
 * Deterministic verification preview of a draft — no AI, cheap enough to call
 * on every (debounced) keystroke. Runs the real post-verification rules.
 * body { caption?, orderId? | campaignId? | hashtags/handles, mediaType? }
 * → { ok, wouldPass, checks, postTimeChecks, found, required, missing, product, brand, contentType }
 */
export const checkCaption = (data) => api.post('/api/ai/check', data, { timeout: 15000 }).then(r => r.data)
