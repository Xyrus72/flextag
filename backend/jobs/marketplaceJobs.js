'use strict'
/**
 * The jobs that keep promises when nobody is watching.
 *
 * 1. Dispute SLA — a complaint a brand ignores must not rot. After
 *    DISPUTE_SLA_HOURS with no brand reply it escalates to the admin queue and
 *    both sides are told. "We'll get to it" is not a process.
 * 2. Wishlist watch — a saved product whose cashback goes UP, or that comes back
 *    in stock, is news the creator saved it for. One notification per change,
 *    never a repeat of the same news.
 * 3. Rating nudge — an order delivered days ago with no review, once.
 *
 * Every job is batch-limited, skips itself while a previous run is in flight,
 * and can be turned off with MARKETPLACE_JOBS=off.
 */
const Dispute = require('../models/Dispute')
const Order = require('../models/Order')
const Product = require('../models/Product')
const User = require('../models/User')
const { notifySafe } = require('../services/notifications')
const audit = require('../services/audit')

const HOUR = 3_600_000
const DAY = 24 * HOUR
const timers = []
const running = { sla: false, wishlist: false, ratings: false }

/* ── 1. Disputes nobody answered ─────────────────────────────────────────── */
async function escalateStaleDisputes() {
  if (running.sla) return
  running.sla = true
  try {
    const hours = Math.max(1, Number(process.env.DISPUTE_SLA_HOURS) || 48)
    const cutoff = new Date(Date.now() - hours * HOUR)
    const stale = await Dispute.find({ status: 'awaiting_brand', createdAt: { $lte: cutoff } }).limit(50)
    for (const d of stale) {
      d.status = 'investigating'
      d.messages.push({
        from: null, role: 'admin',   // FlexTag itself, not a person
        text: `The brand did not reply within ${hours} hours, so FlexTag has taken this on.`,
      })
      await d.save().catch(() => {})
      const admins = await User.find({ role: 'admin' }).select('_id').lean()
      for (const a of admins) {
        notifySafe(a._id, {
          type: 'dispute', icon: '⏰', title: 'Dispute escalated',
          body: `No brand reply in ${hours}h — it is now yours to settle.`,
          link: '/admin/disputes',
        })
      }
      notifySafe(d.creatorId, {
        type: 'dispute', icon: '⏰', title: 'Your dispute was escalated',
        body: 'The brand did not reply in time, so FlexTag is handling it directly.',
        link: '/creator/disputes',
      })
      audit.record({
        action: audit.ACTIONS.DISPUTE_INVESTIGATING, targetType: 'dispute', targetId: d._id,
        summary: `Auto-escalated after ${hours}h with no brand reply`,
      })
    }
    if (stale.length) console.log(`[jobs] escalated ${stale.length} unanswered dispute(s)`)
  } catch (err) {
    console.warn('[jobs] dispute SLA:', err.message)
  } finally {
    running.sla = false
  }
}

/* ── 2. Wishlist watch ───────────────────────────────────────────────────── */
// Remembering what we already told someone: keyed by user+product+event.
const notifiedWishlist = new Map()   // `${userId}:${productId}:${kind}:${value}` -> timestamp
// Products last seen unavailable, so a return to stock is a real event and not
// just "it is in stock", which would notify on every single run.
const wasOut = new Set()
const HOT_CASHBACK_RATE = Number(process.env.WISHLIST_HOT_RATE) || 50
const REMEMBER_MS = 7 * DAY

function alreadyTold(key) {
  const at = notifiedWishlist.get(key)
  if (at && Date.now() - at < REMEMBER_MS) return true
  notifiedWishlist.set(key, Date.now())
  // Cheap eviction so a long-lived process doesn't grow forever.
  if (notifiedWishlist.size > 5000) {
    for (const [k, t] of notifiedWishlist) if (Date.now() - t > REMEMBER_MS) notifiedWishlist.delete(k)
  }
  return false
}

async function watchWishlists() {
  if (running.wishlist) return
  running.wishlist = true
  try {
    const watchers = await User.find({ wishlist: { $exists: true, $ne: [] } }).select('wishlist').limit(500).lean()
    const productIds = [...new Set(watchers.flatMap(w => w.wishlist.map(String)))]
    if (!productIds.length) return
    const products = await Product.find({ _id: { $in: productIds } })
      .select('name cashbackRate inStock stock isActive status campaignBudget totalCashbackSpent').lean()

    // Work out what CHANGED first, product by product — a restock is a property
    // of the product, not of each watcher.
    const news = {}
    for (const p of products) {
      const pid = String(p._id)
      if (p.isActive === false || p.status === 'rejected') { wasOut.delete(pid); continue }
      const capReached = !!(p.campaignBudget && (p.totalCashbackSpent || 0) >= p.campaignBudget)
      const isOut = capReached || !p.inStock || (p.stock || 0) <= 0

      if (isOut) { wasOut.add(pid); continue }
      const restocked = wasOut.delete(pid)   // true only if we had seen it unavailable
      news[pid] = {
        name: p.name,
        restocked,
        hotRate: p.cashbackRate >= HOT_CASHBACK_RATE ? p.cashbackRate : null,
      }
    }

    for (const w of watchers) {
      for (const pid of w.wishlist.map(String)) {
        const n = news[pid]
        if (!n) continue
        if (n.restocked && !alreadyTold(`${w._id}:${pid}:restock`)) {
          notifySafe(w._id, {
            type: 'wishlist', icon: '🎉', title: `${n.name} is available again`,
            body: 'Something on your wishlist is back — grab it before the budget runs out.',
            link: `/creator/product/${pid}`,
          })
        } else if (n.hotRate && !alreadyTold(`${w._id}:${pid}:rate:${n.hotRate}`)) {
          notifySafe(w._id, {
            type: 'wishlist', icon: '🔥', title: `${n.hotRate}% back on ${n.name}`,
            body: 'A product on your wishlist is paying more than usual right now.',
            link: `/creator/product/${pid}`,
          })
        }
      }
    }
  } catch (err) {
    console.warn('[jobs] wishlist watch:', err.message)
  } finally {
    running.wishlist = false
  }
}

/* ── 3. Ask for the review once ──────────────────────────────────────────── */
async function nudgeForRatings() {
  if (running.ratings) return
  running.ratings = true
  try {
    const from = new Date(Date.now() - 7 * DAY)
    const to = new Date(Date.now() - 2 * DAY)
    const orders = await Order.find({
      status: 'delivered',
      'creatorRating.quality': { $exists: false },
      updatedAt: { $gte: from, $lte: to },
    }).select('creatorId product brand').limit(100).lean()

    for (const o of orders) {
      if (alreadyTold(`${o.creatorId}:${o._id}:rating`)) continue
      notifySafe(o.creatorId, {
        type: 'rating', icon: '⭐', title: `How was ${o.product}?`,
        body: `A quick rating helps the next creator decide whether ${o.brand} is worth it.`,
        link: '/creator/orders',
      })
    }
    if (orders.length) console.log(`[jobs] asked for ${orders.length} review(s)`)
  } catch (err) {
    console.warn('[jobs] rating nudge:', err.message)
  } finally {
    running.ratings = false
  }
}

function start() {
  if (process.env.MARKETPLACE_JOBS === 'off') {
    console.log('[jobs] marketplace jobs disabled (MARKETPLACE_JOBS=off)')
    return
  }
  const every = (fn, ms, delay) => {
    const t = setInterval(fn, ms)
    t.unref?.()
    timers.push(t)
    setTimeout(fn, delay).unref?.()
  }
  every(escalateStaleDisputes, 2 * HOUR, 60_000)
  every(watchWishlists, 6 * HOUR, 120_000)
  every(nudgeForRatings, 12 * HOUR, 180_000)
  console.log('[jobs] marketplace jobs armed (dispute SLA, wishlist watch, rating nudges)')
}

function stop() { timers.forEach(clearInterval); timers.length = 0 }

module.exports = { start, stop, escalateStaleDisputes, watchWishlists, nudgeForRatings }
