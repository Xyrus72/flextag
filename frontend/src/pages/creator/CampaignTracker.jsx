import React, { useState, useEffect } from 'react'
import { getOrders } from '../../services/orders'
import { getPosts } from '../../services/posts'

const CampaignTracker = () => {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)
  const [now, setNow]             = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersData, postsData] = await Promise.all([
          getOrders({ status: 'all' }),
          getPosts(),
        ])
        const orders = ordersData.orders || []
        const posts  = postsData.posts   || []

        // Build tracker items from active orders
        const items = orders
          .filter(o => !['cancelled', 'return_requested', 'returned'].includes(o.status))
          .map(o => {
            const post = posts.find(p => p.orderId?._id === o._id || p.orderId === o._id)
            const campaign = o.campaignId
            const deadline  = campaign?.deadline ? new Date(campaign.deadline) : null
            const hoursLeft = deadline ? Math.max(0, (deadline - Date.now()) / 3600000) : null

            // Retention mode: post approved, check retention deadline
            if (post?.status === 'approved' && post.retentionDeadline) {
              const retDeadline  = new Date(post.retentionDeadline)
              const retDaysTotal = campaign?.retentionDays || 7
              const retDaysLeft  = Math.max(0, (retDeadline - Date.now()) / 86400000)
              return {
                id:        o._id,
                name:      o.product,
                brand:     o.brand,
                cashback:  o.cashbackAmount,
                image:     o.image || '📦',
                status:    'retention',
                retentionDaysLeft:  retDaysLeft,
                retentionDaysTotal: retDaysTotal,
              }
            }

            return {
              id:           o._id,
              name:         o.product,
              brand:        o.brand,
              cashback:     o.cashbackAmount,
              image:        o.image || '📦',
              status:       post ? `post_${post.status}` : (o.status === 'delivered' ? 'post_pending' : o.status),
              deadlineHours: hoursLeft,
            }
          })

        setCampaigns(items)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatCountdown = (hours) => {
    const d = Math.floor(hours / 24)
    const h = Math.floor(hours % 24)
    const m = Math.floor((hours * 60) % 60)
    return { d, h, m }
  }

  const urgencyColor = (hours) => {
    if (hours === null) return 'text-zinc-400'
    if (hours <= 6)  return 'text-red-400'
    if (hours <= 24) return 'text-yellow-400'
    if (hours <= 48) return 'text-violet-400'
    return 'text-emerald-400'
  }

  const urgencyBg = (hours) => {
    if (hours === null) return 'bg-white/[0.03] border-white/5'
    if (hours <= 6)  return 'bg-red-500/10 border-red-500/20'
    if (hours <= 24) return 'bg-yellow-500/10 border-yellow-500/20'
    if (hours <= 48) return 'bg-violet-500/10 border-violet-500/20'
    return 'bg-white/[0.03] border-white/5'
  }

  const statusLabel = (s) => {
    if (s === 'post_pending')   return 'Post Required'
    if (s === 'post_pending')   return 'Post Required'
    if (s === 'post_approved')  return 'Verified ✓'
    if (s === 'post_rejected')  return 'Rejected ✗'
    if (s === 'retention')      return 'In Retention'
    if (s === 'processing')     return 'Processing'
    if (s === 'packed')         return 'Packed'
    if (s === 'shipped')        return 'Shipped'
    if (s === 'delivered')      return 'Delivered'
    return s
  }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Tracking</span></div>
        <h1 className="page-title">Campaign Tracker</h1>
        <p className="page-subtitle">Track your orders and posting deadlines in real-time</p>
      </div>

      <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/15 mb-6 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">📧</span>
        <div>
          <p className="text-sm font-semibold text-violet-400">Automated Reminders Active</p>
          <p className="text-xs text-zinc-500 mt-0.5">You'll receive email reminders at 48h, 24h, and 6h before each deadline.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-lg text-zinc-400">No active campaigns</p>
          <p className="text-sm text-zinc-600">Place orders from the catalog to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(c => {
            const cd = c.deadlineHours !== null ? formatCountdown(c.deadlineHours) : null
            return (
              <div key={c.id} className={`p-5 rounded-2xl border transition-all ${urgencyBg(c.deadlineHours)}`}>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-3xl flex-shrink-0">{c.image}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{c.name}</p>
                    <p className="text-xs text-zinc-500 mb-3">{c.brand}</p>

                    {c.status === 'retention' ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-500">Retention Progress</span>
                            <span className="text-xs text-emerald-400 font-semibold">
                              {Math.round(c.retentionDaysTotal - c.retentionDaysLeft)}/{c.retentionDaysTotal} days
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                              style={{ width: `${((c.retentionDaysTotal - c.retentionDaysLeft) / c.retentionDaysTotal) * 100}%` }} />
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">Live ✓</span>
                      </div>
                    ) : cd ? (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {[{ v: cd.d, l: 'days' }, { v: cd.h, l: 'hrs' }, { v: cd.m, l: 'min' }].map((t, i) => (
                            <div key={i} className="text-center">
                              <div className={`text-2xl font-extrabold font-mono ${urgencyColor(c.deadlineHours)}`}>{String(t.v).padStart(2, '0')}</div>
                              <div className="text-[10px] text-zinc-600 uppercase">{t.l}</div>
                            </div>
                          ))}
                        </div>
                        {c.deadlineHours <= 6 && (
                          <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold animate-pulse">⚠ Urgent</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">{statusLabel(c.status)}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-400">৳{c.cashback?.toLocaleString()}</p>
                    <p className="text-[10px] text-zinc-600 uppercase mt-1">{statusLabel(c.status)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CampaignTracker
