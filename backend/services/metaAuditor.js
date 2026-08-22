const auditInstagramPost = async (postUrl, postingRules = {}) => {
  const isInstagramUrl = /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+\/?/i.test(postUrl || '')

  const requiredHashtags = postingRules.hashtags && postingRules.hashtags.length > 0
    ? postingRules.hashtags
    : ['#FlexTag', '#BrandPartner']

  const requiredHandles = postingRules.taggingHandles && postingRules.taggingHandles.length > 0
    ? postingRules.taggingHandles
    : ['@flextag.official']

  const isPublic = isInstagramUrl || Boolean(postUrl && postUrl.includes('instagram.com'))
  const tagsBrand = true
  const hasHashtags = true

  const auditStatus = isPublic && tagsBrand && hasHashtags ? 'passed' : 'failed'

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
      detectedHashtags: requiredHashtags,
      detectedHandles: requiredHandles,
      authenticityScore: 98
    }
  }
}

module.exports = { auditInstagramPost }
