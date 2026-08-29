'use strict'
/**
 * Two-way reputation.
 *
 * A marketplace where only one side is rated is a marketplace where one side
 * takes all the risk. Creators rate the brand's product, shipping and support
 * after delivery; brands rate the creator's professionalism and content after
 * the post is approved. Both ratings live ON THE ORDER — one row, one truth,
 * no separate review collection to drift out of sync — and the averages are
 * recomputed from those rows rather than incremented, so a corrected rating
 * can never leave a stale average behind.
 */
const Order = require('../models/Order')
const User = require('../models/User')
const Product = require('../models/Product')

const clampStar = (v) => Math.min(5, Math.max(1, Math.round(Number(v) || 0)))
const avg = (nums) => (nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : 0)

/** Average of the three creator-given scores for one order. */
const orderScore = (r) => avg([r?.quality, r?.shipping, r?.support].map(Number).filter(Boolean))

/** Recompute a brand's reputation from every order a creator has rated. */
async function refreshBrandRating(brandId) {
  if (!brandId) return null
  const rows = await Order.find({ brandId, 'creatorRating.quality': { $gt: 0 } })
    .select('creatorRating').lean()
  const scores = rows.map(o => orderScore(o.creatorRating)).filter(Boolean)
  const value = avg(scores)
  await User.updateOne({ _id: brandId }, { $set: { brandRatingAvg: value, brandRatingCount: scores.length } }).catch(() => {})
  return { average: value, count: scores.length }
}

/** Recompute a creator's reputation from every order a brand has rated. */
async function refreshCreatorRating(creatorId) {
  if (!creatorId) return null
  const rows = await Order.find({ creatorId, 'brandRating.professionalism': { $gt: 0 } })
    .select('brandRating').lean()
  const scores = rows
    .map(o => avg([o.brandRating?.professionalism, o.brandRating?.contentQuality].map(Number).filter(Boolean)))
    .filter(Boolean)
  const value = avg(scores)
  await User.updateOne({ _id: creatorId }, { $set: { creatorRatingAvg: value, creatorRatingCount: scores.length } }).catch(() => {})
  return { average: value, count: scores.length }
}

/**
 * Product stars come from the product-quality score only — shipping and
 * support are the brand's problem, not the product's.
 */
async function refreshProductRating(productId) {
  if (!productId) return null
  const rows = await Order.find({ productId, 'creatorRating.quality': { $gt: 0 } })
    .select('creatorRating').lean()
  const scores = rows.map(o => Number(o.creatorRating.quality)).filter(Boolean)
  if (!scores.length) return null
  const value = avg(scores)
  await Product.updateOne({ _id: productId }, { $set: { rating: value, reviews: scores.length } }).catch(() => {})
  return { average: value, count: scores.length }
}

module.exports = { clampStar, avg, orderScore, refreshBrandRating, refreshCreatorRating, refreshProductRating }
