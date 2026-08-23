/**
 * Module-3 "Meta Post Auditor" (Habib) — contract stub.
 *
 * NOTE (merge 2026-08-23): this function does NOT call any Instagram/Meta API;
 * it only validates the URL shape and returns placeholder results. The LIVE
 * post verification that actually fetches the Instagram post, checks owner /
 * hashtags / mentions / content type and releases cashback lives in
 *   backend/services/instagram/postCheck.js  (verifyPost)
 * and is wired through POST /api/instagram/verify-post and the approval path.
 * That pipeline also fills the same Post.auditStatus / Post.auditResults fields
 * this stub defines, so the module's API shape stays valid with real data.
 * Keep this file for the module deliverable / local demos only.
 */
const auditInstagramPost = async (postUrl, postingRules = {}) => {
  const isValidInstaPost = /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+\/?/i.test(postUrl || '')

  const requiredHashtags = postingRules.hashtags && postingRules.hashtags.length > 0
    ? postingRules.hashtags
    : ['#FlexTag', '#BrandPartner']

  const requiredHandles = postingRules.taggingHandles && postingRules.taggingHandles.length > 0
    ? postingRules.taggingHandles
    : ['@flextag.official']

  const isPublic = isValidInstaPost
  const tagsBrand = isValidInstaPost
  const hasHashtags = isValidInstaPost

  const auditStatus = isValidInstaPost ? 'passed' : 'failed'

  const retentionDeadline = new Date()
  retentionDeadline.setDate(retentionDeadline.getDate() + 7)

  return {
    auditStatus,
    retentionDeadline,
    retentionDaysRemaining: 7,
    auditResults: {
      isPublic,
      tagsBrand,
      hasHashtags,
      detectedHashtags: isValidInstaPost ? requiredHashtags : [],
      detectedHandles: isValidInstaPost ? requiredHandles : [],
      authenticityScore: isValidInstaPost ? 98 : 0
    }
  }
}

module.exports = { auditInstagramPost }
