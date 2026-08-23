'use strict'
/**
 * Automated post verification: fetch the submitted Instagram post, run the
 * campaign's rules against it, store the result on the Post, and (optionally)
 * auto-approve → cashback release through the shared approval service.
 * Also performs the retention re-check (is the post still live at the deadline).
 */
const Post = require('../../models/Post')
const ep = require('./endpoints')
const { getProvider, withFallback } = require('./provider')
const { embedToPost } = require('./providers/session')
const { approvePost } = require('../postApproval')
const { getIgSettings } = require('../../utils/settings')

const GRACE_MS = 5 * 60_000
const RETENTION_FATAL = new Set(['NO_SESSION', 'SESSION_INVALID', 'RATE_LIMITED'])

/** "#GlowUp, #FlexTag" → ['glowup','flextag'] ; "@brand, @other" → ['brand','other'] */
function splitList(value, stripRe) {
  return [...new Set(String(value || '').split(/[,\s]+/).map((x) => x.trim().replace(stripRe, '').toLowerCase()).filter(Boolean))]
}

/**
 * Pure rule evaluation. `fetched` is a normalized post (or null when not found).
 * A check with passed === null could not be evaluated (needs manual review).
 */
function buildChecks({ campaign, order, creator, fetched }) {
  const checks = []
  const add = (key, label, passed, required, detail) => checks.push({ key, label, passed, required: !!required, detail: detail || '' })
  const creatorHandle = String(creator?.instagramHandle || '').replace(/^@/, '').trim().toLowerCase()

  add('exists', 'Post is live on Instagram', !!fetched, true,
    fetched ? `Found ${fetched.mediaType || 'post'} ${fetched.shortcode}` : 'Not found — deleted, private, or the link is wrong')
  if (!fetched) return checks

  add('public', 'Account is public', !fetched.ownerIsPrivate, true, fetched.ownerIsPrivate ? 'The posting account is private' : 'Public account')

  const ownerOk = !!creatorHandle && !!fetched.owner && fetched.owner === creatorHandle
  add('owner', 'Posted by the registered creator', fetched.owner ? ownerOk : null, true,
    fetched.owner ? `Posted by @${fetched.owner}${ownerOk ? '' : ` — registered handle is @${creatorHandle || '—'}`}` : 'Could not read the post owner')

  // Informational (not required): automatic cashback needs proven ownership of the handle.
  add('identity', 'Instagram ownership verified', !!creator?.igVerified, false,
    creator?.igVerified ? 'Ownership of the account is confirmed' : 'Verify ownership on your Account Audit page to unlock instant cashback — until then an admin approves manually')

  if (order?.createdAt) {
    const ok = fetched.takenAt ? fetched.takenAt.getTime() >= new Date(order.createdAt).getTime() - GRACE_MS : null
    add('postedAfterOrder', 'Posted after the order was placed', ok, true,
      fetched.takenAt ? `Posted ${fetched.takenAt.toISOString().slice(0, 10)}, ordered ${new Date(order.createdAt).toISOString().slice(0, 10)}` : 'Post date unavailable')
  }

  // Rules may live on a Campaign (comma-separated strings) or a module-2 Product (postingRules arrays).
  const reqTags = [...new Set([...splitList(campaign?.hashtags, /^#/), ...splitList((campaign?.postingRules?.hashtags || []).join(','), /^#/)])]
  if (reqTags.length) {
    if (fetched.hashtags == null) add('hashtags', 'Required hashtags present', null, true, 'Caption unavailable — needs manual review')
    else {
      const have = new Set(fetched.hashtags)
      const missing = reqTags.filter((t) => !have.has(t))
      add('hashtags', 'Required hashtags present', missing.length === 0, true, missing.length ? `Missing ${missing.map((t) => '#' + t).join(' ')}` : `All ${reqTags.length} present`)
    }
  }

  const reqMentions = [...new Set([...splitList(campaign?.handles, /^@/), ...splitList((campaign?.postingRules?.taggingHandles || []).join(','), /^@/)])]
  if (reqMentions.length) {
    if (fetched.mentions == null) add('mentions', 'Brand mentioned', null, true, 'Caption unavailable — needs manual review')
    else {
      const have = new Set(fetched.mentions)
      const missing = reqMentions.filter((h) => !have.has(h))
      add('mentions', 'Brand mentioned', missing.length === 0, true, missing.length ? `Missing ${missing.map((h) => '@' + h).join(' ')}` : `Mentions ${reqMentions.map((h) => '@' + h).join(' ')}`)
    }
  }

  const want = campaign?.contentType
  if (want && want !== 'any') {
    const got = fetched.mediaType
    if (!got) add('contentType', `Content type: ${want}`, null, true, 'Media type could not be determined — needs manual review')
    else {
      const ok = want === 'reel' ? got === 'reel' || got === 'video' : want === 'post' ? got === 'image' : want === 'carousel' ? got === 'carousel' : true
      add('contentType', `Content type: ${want}`, ok, true, `This is a ${got}`)
    }
  }
  return checks
}

function statusFromChecks(checks) {
  if (checks.some((c) => c.required && c.passed === false)) return 'failed'
  if (checks.some((c) => c.passed === null)) return 'error'
  return 'passed'
}

/**
 * Fill the Module-3 "Meta Post Auditor" contract (post.auditStatus / auditResults)
 * from the REAL verification, so the module's UI and API shape keep working
 * while the numbers mean something.
 */
function applyAuditContract(post, verification, fetched, creator) {
  const byKey = (k) => verification.checks.find((c) => c.key === k)
  const passed = (k) => { const c = byKey(k); return c ? c.passed === true : null }
  post.auditStatus = verification.status === 'passed' ? 'passed' : verification.status === 'failed' ? 'failed' : 'monitoring'
  post.auditResults = {
    isPublic:          passed('public'),
    tagsBrand:         byKey('mentions') ? passed('mentions') : (fetched ? true : null),   // no mention rule → nothing to fail
    hasHashtags:       byKey('hashtags') ? passed('hashtags') : (fetched ? true : null),
    detectedHashtags:  (fetched?.hashtags || []).map((t) => '#' + t),
    detectedHandles:   (fetched?.mentions || []).map((h) => '@' + h),
    authenticityScore: Number.isFinite(Number(creator?.igHealthScore)) && creator?.igHealthScore !== null ? Number(creator.igHealthScore) : null,
  }
}

async function loadPost(postOrId) {
  if (postOrId && typeof postOrId === 'object' && postOrId.postUrl) return postOrId
  return Post.findById(postOrId).populate('campaignId').populate('orderId').populate('creatorId', 'name instagramHandle igVerified igHealthScore')
}

/**
 * Verify a post and persist the result. Auto-approves when every check passes
 * and the igAutoApprovePosts setting is on.
 * @returns {Promise<{ post: any, verification: object, autoApproved: boolean }>}
 */
async function verifyPost(postOrId, { by = null } = {}) {
  const post = await loadPost(postOrId)
  if (!post) throw Object.assign(new Error('Post not found.'), { status: 404 })
  const s = await getIgSettings()

  const verification = { status: 'pending', checks: [], snapshot: null, checkedAt: new Date(), error: '', source: '' }
  const creatorForContract = post.creatorId && post.creatorId.instagramHandle !== undefined ? post.creatorId : null
  const finish = async () => {
    post.verification = verification
    applyAuditContract(post, verification, null, creatorForContract)
    await post.save()
    return { post, verification, autoApproved: false }
  }

  if (post.platform && post.platform !== 'instagram') {
    verification.status = 'error'
    verification.error = `Automatic verification supports Instagram only (this post is ${post.platform}).`
    return finish()
  }
  const shortcode = ep.parsePostUrl(post.postUrl)
  if (!shortcode) {
    verification.status = 'failed'
    verification.checks = [{ key: 'url', label: 'Valid Instagram post link', passed: false, required: true, detail: 'Link must look like instagram.com/p/… or instagram.com/reel/…' }]
    return finish()
  }

  let fetched = null
  try {
    // HikerAPI or the cookie session (with fallback); the embed page when neither is configured.
    fetched = await withFallback((p) => p.getPost(shortcode))
    verification.source = fetched.source || getProvider().name
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      fetched = null
      verification.source = getProvider().name
    } else {
      // Keep operational detail (env names, session state) out of creator-visible fields.
      verification.status = 'error'
      verification.error = `Instagram unavailable (${err.code || 'ERROR'}) — needs manual review.`
      console.warn(`[instagram verify] post ${post._id}: ${err.code || ''} ${err.message}`)
      return finish()
    }
  }

  const creator = post.creatorId && post.creatorId.instagramHandle !== undefined ? post.creatorId : null
  verification.checks = buildChecks({ campaign: post.campaignId, order: post.orderId, creator, fetched })
  verification.snapshot = fetched ? {
    likes: fetched.likes, comments: fetched.comments, views: fetched.views, takenAt: fetched.takenAt, mediaType: fetched.mediaType,
    caption: (fetched.caption || '').slice(0, 500), thumbnail: fetched.thumbnail || '', permalink: fetched.url, owner: fetched.owner,
  } : null
  verification.status = statusFromChecks(verification.checks)
  if (verification.status === 'error') verification.error = 'Some checks could not be evaluated automatically — an admin will review.'
  if (!creator) verification.error = verification.error || 'Creator record missing — manual review.'

  post.verification = verification
  applyAuditContract(post, verification, fetched, creator)
  // Automatic release requires: every required check passed, the setting is on,
  // AND the creator has proven they own the handle (igVerified). Otherwise the
  // post stays pending for a human.
  if (verification.status === 'passed' && s.autoApprovePosts && post.status === 'pending' && creator?.igVerified === true) {
    await approvePost(post, { approvedBy: by, auto: true })
    return { post, verification, autoApproved: true, pendingReason: null }
  }
  await post.save()
  const pendingReason = verification.status !== 'passed' ? 'checks' : !creator?.igVerified ? 'identity' : !s.autoApprovePosts ? 'manual' : 'state'
  return { post, verification, autoApproved: false, pendingReason }
}

/**
 * Retention re-check at the deadline: still live → 'alive'; gone → 'removed'
 * (post.status = 'deleted', no automatic clawback — admins decide).
 */
async function retentionCheck(postOrId) {
  const post = await loadPost(postOrId)
  if (!post) return null
  const shortcode = ep.parsePostUrl(post.postUrl)
  const retention = { ...(post.retention?.toObject ? post.retention.toObject() : post.retention || {}), checkedAt: new Date() }
  if (!shortcode || (post.platform && post.platform !== 'instagram')) {
    retention.status = 'skipped'
  } else {
    try {
      await withFallback((p) => p.getPost(shortcode))
      retention.status = 'alive'
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        retention.status = 'removed'
        post.status = 'deleted'
        console.warn(`[instagram retention] post ${post._id} (${post.postUrl}) was removed before the retention deadline`)
      } else if (RETENTION_FATAL.has(err.code)) {
        throw err // session/rate-limit problems: let the job stop this run and retry later
      } else if (retention.checkAt && Date.now() - new Date(retention.checkAt).getTime() > 3 * 86_400_000) {
        retention.status = 'skipped' // Instagram unreachable for 3+ days past the deadline — stop retrying
      } else {
        return post // leave pending; the job retries next run
      }
    }
  }
  post.retention = retention
  await post.save()
  return post
}

module.exports = { verifyPost, retentionCheck, buildChecks, statusFromChecks, splitList, embedToPost }
