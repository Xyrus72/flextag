import React, { useState, useEffect } from 'react'
import { getCampaigns } from '../../services/campaigns'
import { getOrders } from '../../services/orders'
import { getPosts, getShowcase } from '../../services/posts'

const compact = (n) => {
  const v = Number(n) || 0
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k'
  return v.toLocaleString()
}

const Analytics = () => {
  const [period, setPeriod]         = useState('month')
  const [campaigns, setCampaigns]   = useState([])
  const [kpis, setKpis]             = useState({ posts: 0, reach: 0, engagement: 0, cashbackPaid: 0, roi: 0 })
  const [monthlyData, setMonthlyData] = useState([])
  const [showcase, setShowcase]     = useState({ posts: [], summary: null })
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [campData, ordersData, postsData, showcaseData] = await Promise.all([
          getCampaigns({ status: 'all' }),
          getOrders({ status: 'all' }),
          getPosts(),
          getShowcase().catch(() => ({ posts: [], summary: null })),
        ])
        setShowcase(showcaseData || { posts: [], summary: null })

        const camps  = campData.campaigns || []
        const orders = ordersData.orders  || []
        const posts  = postsData.posts    || []

        // Aggregate per-campaign stats
        const enriched = camps.map(c => {
          const campOrders = orders.filter(o => o.campaignId?._id === c._id || o.campaignId === c._id)
          const campPosts  = posts.filter(p => p.campaignId?._id === c._id || p.campaignId === c._id)
          const cashbackPaid = campOrders.filter(o => o.cashbackReleased).reduce((s, o) => s + (o.rewardTotal || o.cashbackAmount), 0)
          return {
            name:        c.product || c.title,
            posts:       campPosts.length,
            cashbackPaid,
            budget:      c.budgetCap || 0,
            status:      c.status,
          }
        })
        setCampaigns(enriched)

        // Global KPIs
        const totalPosts    = posts.length
        const totalCashback = orders.filter(o => o.cashbackReleased).reduce((s, o) => s + (o.rewardTotal || o.cashbackAmount), 0)
        setKpis({ posts: totalPosts, cashbackPaid: totalCashback })

        // Monthly orders chart (group by month)
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const byMonth = {}
        orders.forEach(o => {
          const d = new Date(o.createdAt)
          const key = monthNames[d.getMonth()]
          if (!byMonth[key]) byMonth[key] = { month: key, orders: 0, cashback: 0 }
          byMonth[key].orders  += 1
          byMonth[key].cashback += o.rewardTotal || o.cashbackAmount || 0
        })
        setMonthlyData(Object.values(byMonth).slice(-6))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const maxOrders = Math.max(...monthlyData.map(d => d.orders), 1)

  return (
    <div className="page-root">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Campaign Analytics</h1>
          <p className="text-zinc-500 mt-1">Real-time performance metrics & ROI</p>
        </div>
        <div className="flex bg-white/5 rounded-xl p-1">
          {['week', 'month', 'year'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${period === p ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Posts',        value: loading ? '...' : String(kpis.posts),                          icon: '📝' },
          { label: 'Campaigns',          value: loading ? '...' : String(campaigns.length),                    icon: '📢' },
          { label: 'Active Campaigns',   value: loading ? '...' : String(campaigns.filter(c => c.status === 'active').length), icon: '🟢' },
          { label: 'Total Cashback Paid',value: loading ? '...' : `৳${(kpis.cashbackPaid || 0).toLocaleString()}`, icon: '💸' },
        ].map(k => (
          <div key={k.label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:-translate-y-1 transition-all">
            <span className="text-xl block mb-2">{k.icon}</span>
            <p className="text-2xl font-extrabold text-white">{k.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Performance & ROI (from verified post snapshots) */}
      {showcase.summary && showcase.summary.posts > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Reach (views)',      value: compact(showcase.summary.reach),      hint: 'across verified reels/videos', color: '#06b6d4' },
            { label: 'Engagement',         value: compact(showcase.summary.engagement), hint: 'likes + comments on UGC',       color: '#ec4899' },
            { label: 'Verified UGC',       value: String(showcase.summary.posts),       hint: `${showcase.summary.creators} creators`, color: '#7c3aed' },
            { label: 'Cost / engagement',  value: `৳${showcase.summary.costPerEngagement}`, hint: 'cashback ÷ engagement',     color: '#22c55e' },
          ].map(k => (
            <div key={k.label} className="p-4 rounded-2xl border" style={{ background: `${k.color}0d`, borderColor: `${k.color}33` }}>
              <p className="text-2xl font-extrabold text-white">{k.value}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: k.color }}>{k.label}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{k.hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* UGC gallery — the verified posts brands paid for */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-1">Your Campaign UGC</h2>
        <p className="text-xs text-zinc-500 mb-5">Verified creator posts with live engagement — proof of what your budget produced</p>
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
        ) : showcase.posts.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm">No verified posts yet — they appear here once creators post and pass verification.</div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
            {showcase.posts.map(p => (
              <a key={p._id} href={p.snapshot.permalink} target="_blank" rel="noreferrer"
                className="group rounded-xl overflow-hidden border border-white/5 bg-white/[0.02] hover:border-violet-500/30 transition-all">
                <div className="relative" style={{ aspectRatio: '1 / 1', background: '#0a0f23' }}>
                  {p.snapshot.thumbnail
                    ? <img src={p.snapshot.thumbnail} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                    : <div className="w-full h-full flex items-center justify-center text-3xl opacity-40">📸</div>}
                  {p.snapshot.mediaType && <span className="absolute top-2 left-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/60 text-white">{p.snapshot.mediaType}</span>}
                  {p.autoApproved && <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-600/80 text-white">AUTO ✓</span>}
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-white truncate">@{String(p.creator?.instagramHandle || '').replace(/^@/, '') || p.creator?.name}</p>
                  <p className="text-[11px] text-zinc-500 truncate mb-2">{p.campaign?.product || p.campaign?.title}</p>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span>❤ {p.snapshot.likes == null ? '—' : compact(p.snapshot.likes)}</span>
                    <span>💬 {compact(p.snapshot.comments)}</span>
                    {p.snapshot.views != null && <span>▶ {compact(p.snapshot.views)}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-6">Monthly Orders</h2>
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
        ) : monthlyData.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm">No data yet — place orders to see analytics</div>
        ) : (
          <div className="flex items-end gap-3 h-48">
            {monthlyData.map(d => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-zinc-400 font-semibold">{d.orders}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-cyan-500 hover:opacity-80 transition-all cursor-pointer"
                  style={{ height: `${(d.orders / maxOrders) * 100}%`, minHeight: '4px' }} />
                <span className="text-xs text-zinc-600">{d.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign breakdown */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h2 className="text-lg font-bold text-white mb-5">Campaign Breakdown</h2>
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm">No campaigns yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/5">
                {['Campaign', 'Posts', 'Cashback Paid', 'Budget Used', 'Status'].map(h =>
                  <th key={h} className="text-left text-xs text-zinc-500 font-semibold uppercase tracking-wider px-3 py-3">{h}</th>
                )}
              </tr></thead>
              <tbody>
                {campaigns.map((c, i) => {
                  const pct = c.budget > 0 ? Math.round((c.cashbackPaid / c.budget) * 100) : 0
                  return (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-3 text-sm font-medium text-white">{c.name}</td>
                      <td className="px-3 py-3 text-sm text-zinc-300">{c.posts}</td>
                      <td className="px-3 py-3 text-sm text-violet-400 font-semibold">৳{(c.cashbackPaid || 0).toLocaleString()}</td>
                      <td className="px-3 py-3">
                        {c.budget > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-zinc-400 w-8">{pct}%</span>
                          </div>
                        ) : <span className="text-xs text-zinc-600">Unlimited</span>}
                      </td>
                      <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>{c.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Analytics
