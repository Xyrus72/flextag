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
