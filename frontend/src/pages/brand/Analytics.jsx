import { useState, useEffect } from 'react'
import { getCampaigns } from '../../services/campaigns'
import { getOrders } from '../../services/orders'
import { getPosts, getShowcase } from '../../services/posts'
import { FileText, Megaphone, Banknote, Heart, MessageCircle, Play, Image as ImageIcon } from 'lucide-react'

const compact = (n) => {
  const v = Number(n) || 0
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k'
  return v.toLocaleString()
}

const Analytics = () => {
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
      <div className="page-header">
        <div className="page-label"><span>Brand · Analytics</span></div>
        <h1 className="page-title">Campaign analytics</h1>
        <p className="page-subtitle">Campaign performance and verified engagement</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total posts',         value: loading ? '—' : String(kpis.posts),       Icon: FileText },
          { label: 'Campaigns',           value: loading ? '—' : String(campaigns.length), Icon: Megaphone },
          { label: 'Active campaigns',    value: loading ? '—' : String(campaigns.filter(c => c.status === 'active').length), dot: true },
          { label: 'Total cashback paid', value: loading ? '—' : `৳${(kpis.cashbackPaid || 0).toLocaleString()}`, Icon: Banknote },
        ].map(k => (
          <div key={k.label} className="stat-card">
            {k.dot
              ? <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--green-ink)', marginBottom: 14 }} />
              : <k.Icon size={18} strokeWidth={1.75} style={{ color: 'var(--text-muted)', marginBottom: 14 }} />}
            <p className="tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{k.value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Performance & ROI (from verified post snapshots) */}
      {showcase.summary && showcase.summary.posts > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Reach (views)',     value: compact(showcase.summary.reach),      hint: 'across verified reels/videos', color: '#06b6d4' },
            { label: 'Engagement',        value: compact(showcase.summary.engagement), hint: 'likes + comments on UGC',       color: '#ec4899' },
            { label: 'Verified UGC',      value: String(showcase.summary.posts),       hint: `${showcase.summary.creators} creators`, color: '#7c3aed' },
            { label: 'Cost / engagement', value: `৳${showcase.summary.costPerEngagement}`, hint: 'cashback ÷ engagement',     color: '#22c55e' },
          ].map(k => (
            <div key={k.label} style={{ padding: 16, borderRadius: 16, border: '1px solid', background: `${k.color}0d`, borderColor: `${k.color}33` }}>
              <p className="tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{k.value}</p>
              <p style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: k.color }}>{k.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* UGC gallery — the verified posts brands paid for */}
      <div style={{ borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)', padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Your campaign UGC</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Verified creator posts with live engagement — proof of what your budget produced</p>
        {loading ? (
          <div className="flex justify-center py-10"><div className="spinner" /></div>
        ) : showcase.posts.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No verified posts yet — they appear here once creators post and pass verification.</div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
            {showcase.posts.map(p => (
              <a key={p._id} href={p.snapshot.permalink} target="_blank" rel="noreferrer" className="card-hover"
                style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(var(--ink-rgb),0.07)', background: 'rgba(var(--ink-rgb),0.02)', textDecoration: 'none', display: 'block' }}>
                <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--bg-2)' }}>
                  {p.snapshot.thumbnail
                    ? <img src={p.snapshot.thumbnail} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={28} strokeWidth={1.5} style={{ opacity: 0.35, color: 'var(--text-muted)' }} /></div>}
                  {p.snapshot.mediaType && <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.6)', color: '#fff' }}>{p.snapshot.mediaType}</span>}
                  {p.autoApproved && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(124,58,237,0.8)', color: '#fff' }}>Auto</span>}
                </div>
                <div style={{ padding: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{String(p.creator?.instagramHandle || '').replace(/^@/, '') || p.creator?.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.campaign?.product || p.campaign?.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'rgba(var(--ink-rgb),0.5)' }}>
                    <span className="tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Heart size={12} strokeWidth={1.75} /> {p.snapshot.likes == null ? '—' : compact(p.snapshot.likes)}</span>
                    <span className="tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><MessageCircle size={12} strokeWidth={1.75} /> {compact(p.snapshot.comments)}</span>
                    {p.snapshot.views != null && <span className="tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Play size={12} strokeWidth={1.75} /> {compact(p.snapshot.views)}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)', padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Monthly orders</h2>
        {loading ? (
          <div className="flex justify-center py-10"><div className="spinner" /></div>
        ) : monthlyData.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No data yet — place orders to see analytics</div>
        ) : (
          <div className="flex items-end gap-3 h-48">
            {monthlyData.map(d => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="tnum" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(var(--ink-rgb),0.6)' }}>{d.orders}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-cyan-500 hover:opacity-80 transition-all cursor-pointer"
                  style={{ height: `${(d.orders / maxOrders) * 100}%`, minHeight: '4px' }} />
                <span style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)' }}>{d.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign breakdown */}
      <div style={{ borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)', padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>Campaign breakdown</h2>
        {loading ? (
          <div className="flex justify-center py-10"><div className="spinner" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No campaigns yet</div>
        ) : (
          <div className="data-table" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Campaign', 'Posts', 'Cashback paid', 'Budget used', 'Status'].map(h =>
                  <th key={h}>{h}</th>
                )}
              </tr></thead>
              <tbody>
                {campaigns.map((c, i) => {
                  const pct = c.budget > 0 ? Math.round((c.cashbackPaid / c.budget) * 100) : 0
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</td>
                      <td className="tnum">{c.posts}</td>
                      <td className="tnum" style={{ color: 'var(--violet-ink)', fontWeight: 600 }}>৳{(c.cashbackPaid || 0).toLocaleString()}</td>
                      <td>
                        {c.budget > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--ink-rgb),0.08)' }}>
                              <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="tnum" style={{ fontSize: 12, color: 'var(--text-muted)', width: 32, display: 'inline-block' }}>{pct}%</span>
                          </div>
                        ) : <span style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.3)' }}>Unlimited</span>}
                      </td>
                      <td><span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{c.status}</span></td>
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
