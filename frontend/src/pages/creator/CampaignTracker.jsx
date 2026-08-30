import { useState, useEffect } from 'react'
import { Mail, Inbox, Package, AlertTriangle } from 'lucide-react'
import { getOrders } from '../../services/orders'
import { getPosts } from '../../services/posts'

const CampaignTracker = () => {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)

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
                image:     o.image || null,
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
              image:        o.image || null,
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
    if (hours === null) return 'text-[var(--text-muted)]'
    if (hours <= 6)  return 'text-red-400'
    if (hours <= 24) return 'text-yellow-400'
    if (hours <= 48) return 'text-violet-400'
    return 'text-emerald-400'
  }

  const urgencyBg = (hours) => {
    if (hours === null) return 'bg-[rgba(var(--ink-rgb),0.03)] border-[rgba(var(--ink-rgb),0.05)]'
    if (hours <= 6)  return 'bg-red-500/10 border-red-500/20'
    if (hours <= 24) return 'bg-yellow-500/10 border-yellow-500/20'
    if (hours <= 48) return 'bg-violet-500/10 border-violet-500/20'
    return 'bg-[rgba(var(--ink-rgb),0.03)] border-[rgba(var(--ink-rgb),0.05)]'
  }

  const statusLabel = (s) => {
    if (s === 'post_pending')   return 'Post required'
    if (s === 'post_approved')  return 'Verified ✓'
    if (s === 'post_rejected')  return 'Rejected ✗'
    if (s === 'retention')      return 'In retention'
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
        <h1 className="page-title">Campaign tracker</h1>
        <p className="page-subtitle">Track your orders and posting deadlines in real-time</p>
      </div>

      <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/15 mb-6 flex items-start gap-3">
        <Mail size={16} style={{ color: 'var(--violet-ink)', flexShrink: 0, marginTop: 2 }} strokeWidth={1.5} />
        <div>
          <p className="text-sm font-semibold text-violet-400">Automated reminders are on</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Reminder emails go out at 48h, 24h, and 6h before each deadline.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="spinner" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20">
          <p className="mb-3"><Inbox size={36} style={{ color: 'rgba(var(--ink-rgb),0.3)', margin: '0 auto' }} strokeWidth={1.5} /></p>
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No active campaigns</p>
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Place orders from the catalog to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(c => {
            const cd = c.deadlineHours !== null ? formatCountdown(c.deadlineHours) : null
            return (
              <div key={c.id} className={`p-5 rounded-2xl border transition-all ${urgencyBg(c.deadlineHours)}`}>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'rgba(var(--ink-rgb),0.05)' }}>
                    {c.image && c.image.startsWith('http')
                      ? <img src={c.image} alt="" className="w-14 h-14 rounded-xl object-cover" />
                      : <Package size={22} style={{ color: 'rgba(var(--ink-rgb),0.3)' }} strokeWidth={1.5} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{c.name}</p>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{c.brand}</p>

                    {c.status === 'retention' ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Retention progress</span>
                            <span className="text-xs text-emerald-400 font-semibold">
                              {Math.round(c.retentionDaysTotal - c.retentionDaysLeft)}/{c.retentionDaysTotal} days
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(var(--ink-rgb),0.05)' }}>
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
                              <div className={`text-2xl font-extrabold tnum ${urgencyColor(c.deadlineHours)}`}>{String(t.v).padStart(2, '0')}</div>
                              <div className="text-[10px] uppercase" style={{ color: 'var(--text-dim)' }}>{t.l}</div>
                            </div>
                          ))}
                        </div>
                        {c.deadlineHours <= 6 && (
                          <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold inline-flex items-center gap-1">
                            <AlertTriangle size={12} strokeWidth={1.75} /> Urgent
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{statusLabel(c.status)}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-400">৳{c.cashback?.toLocaleString()}</p>
                    <p className="text-[10px] uppercase mt-1" style={{ color: 'var(--text-dim)' }}>{statusLabel(c.status)}</p>
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
