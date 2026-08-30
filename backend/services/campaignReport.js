'use strict'
/**
 * The campaign report card — every number a brand shows their boss, and every
 * number FlexTag shows the NEXT brand.
 *
 * The user's own launch plan said it: early on, case-study numbers ("32
 * verified posts, ৳X engagement, 0 fakes") are worth more than the fees. This
 * assembles them from the rows that already exist — orders, verified post
 * snapshots, the brand ledger — never from stored counters that could drift,
 * and never from invented figures. An honest small number sells better than a
 * fake big one, because the brand can check it.
 */
const Campaign = require('../models/Campaign')
const Order = require('../models/Order')
const Post = require('../models/Post')
const BrandLedger = require('../models/BrandLedger')

/**
 * @returns {Promise<object|null>} the full report, or null if no such campaign
 */
async function buildReport(campaignId) {
  const campaign = await Campaign.findById(campaignId).lean()
  if (!campaign) return null

  const [orders, posts, ledger] = await Promise.all([
    Order.find({ campaignId: campaign._id }).select('status total rewardTotal cashbackAmount instantDiscount cashbackReleased cashbackClawedBack creatorId createdAt').lean(),
    Post.find({ campaignId: campaign._id, status: 'approved' })
      .populate('creatorId', 'name instagramHandle followersCount igVerified')
      .select('verification approvedAt autoApproved creatorId retention')
      .lean(),
    BrandLedger.find({ campaignId: campaign._id, status: 'completed' }).select('type amount ref').lean(),
  ])

  // ── Orders / GMV ─────────────────────────────────────────────────────────
  const live = orders.filter(o => !['cancelled', 'returned'].includes(o.status))
  const gmv = live.reduce((s, o) => s + (o.total || 0), 0)
  const released = orders.filter(o => o.cashbackReleased && !o.cashbackClawedBack)
  const rewardsDelivered = released.reduce((s, o) => s + (o.rewardTotal || o.cashbackAmount || 0), 0)
  const uniqueCreators = new Set(live.map(o => String(o.creatorId))).size

  // ── Verified engagement, from the snapshots verification actually took ───
  let likes = 0, comments = 0, views = 0, reach = 0
  const topPosts = []
  for (const post of posts) {
    const snap = post.verification?.snapshot || {}
    likes += Number(snap.likes) || 0
    comments += Number(snap.comments) || 0
    views += Number(snap.views) || 0
    reach += Number(post.creatorId?.followersCount) || 0   // honest proxy: audience the post was shown into
    topPosts.push({
      creator: post.creatorId?.name || 'Creator',
      handle: post.creatorId?.instagramHandle || '',
      verified: !!post.creatorId?.igVerified,
      likes: snap.likes ?? null,
      comments: snap.comments ?? null,
      views: snap.views ?? null,
      mediaType: snap.mediaType || '',
      permalink: snap.permalink || '',
      thumbnail: snap.thumbnail || '',
      approvedAt: post.approvedAt,
      autoApproved: !!post.autoApproved,
      stillLive: post.retention?.status !== 'removed',
    })
  }
  topPosts.sort((a, b) => ((b.likes || 0) + (b.comments || 0)) - ((a.likes || 0) + (a.comments || 0)))

  // ── What the campaign actually cost ──────────────────────────────────────
  const spend = ledger.filter(l => l.type === 'spend').reduce((s, l) => s + l.amount, 0)
  const refunds = ledger.filter(l => l.type === 'refund' && !String(l.ref).startsWith('refund:commission')).reduce((s, l) => s + l.amount, 0)
  const fees = ledger.filter(l => l.type === 'fee').reduce((s, l) => s + l.amount, 0)
    - ledger.filter(l => String(l.ref).startsWith('refund:commission')).reduce((s, l) => s + l.amount, 0)
  const netSpend = Math.max(0, spend - refunds) + Math.max(0, fees)

  const engagements = likes + comments
  return {
    campaign: {
      id: String(campaign._id),
      title: campaign.title,
      product: campaign.product,
      brand: campaign.brand,
      status: campaign.status,
      cashbackRate: campaign.cashbackRate,
      startedAt: campaign.createdAt,
    },
    orders: {
      total: live.length,
      gmv,
      uniqueCreators,
      returned: orders.filter(o => o.status === 'returned').length,
    },
    posts: {
      verified: posts.length,
      autoApproved: posts.filter(p => p.autoApproved).length,
      stillLive: topPosts.filter(p => p.stillLive).length,
      fromVerifiedCreators: topPosts.filter(p => p.verified).length,
    },
    engagement: { likes, comments, views, engagements, audienceReached: reach },
    money: {
      spend: Math.max(0, spend - refunds),
      fees: Math.max(0, fees),
      netSpend,
      rewardsDelivered,
      // The two numbers a marketer actually compares vendors on:
      costPerEngagement: engagements > 0 ? Number((netSpend / engagements).toFixed(2)) : null,
      costPerPost: posts.length > 0 ? Math.round(netSpend / posts.length) : null,
    },
    topPosts: topPosts.slice(0, 8),
    generatedAt: new Date(),
  }
}

module.exports = { buildReport }
