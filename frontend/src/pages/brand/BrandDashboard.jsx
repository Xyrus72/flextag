import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyStats } from '../../services/users'
import { useCountUp } from '../../hooks/useCountUp'
import { Megaphone, Users, Banknote, BarChart3, Package } from 'lucide-react'

/** One KPI card — counts up to its value once, on first load only. */
const KpiCard = ({ s, i, loading }) => {
  const display = useCountUp(s.raw)
  return (
    <div className="stat-card stagger-in" style={{ '--i': i, background: 'rgba(var(--ink-rgb),0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><s.Icon size={17} strokeWidth={1.75} style={{ color: s.text }} /></div>
        {loading && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
      </div>
      <p className="tnum" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 4 }}>{loading ? '—' : s.format(display)}</p>
      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</p>
      <p style={{ fontSize: 12, color: s.text }}>{s.sub}</p>
    </div>
  )
}

const BrandDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats]             = useState({ activeCampaigns:0, totalCreators:0, cashbackDisbursed:0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    getMyStats()
      .then(d => {
        setStats({ activeCampaigns: d.activeCampaigns||0, totalCreators: d.totalCreators||0, cashbackDisbursed: d.cashbackDisbursed||0 })
        setRecentOrders(d.recentOrders || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    { label:'Active campaigns',   raw: stats.activeCampaigns,      format: (n) => String(n), Icon: Megaphone, color:'rgba(124,58,237,0.12)', border:'rgba(124,58,237,0.25)', text:'var(--violet-ink)', sub:'Live now' },
    { label:'Total creators',     raw: stats.totalCreators,        format: (n) => String(n), Icon: Users, color:'rgba(6,182,212,0.12)',  border:'rgba(6,182,212,0.25)',  text:'var(--cyan-ink)', sub:'Joined campaigns' },
    { label:'Cashback disbursed', raw: stats.cashbackDisbursed||0, format: (n) => `৳${n.toLocaleString()}`, Icon: Banknote, color:'rgba(34,197,94,0.12)', border:'rgba(34,197,94,0.25)',  text:'var(--green-ink)', sub:'Total paid out' },
    { label:'Avg. ROI',           raw: 0,                          format: () => '—',        Icon: BarChart3, color:'rgba(236,72,153,0.12)',border:'rgba(236,72,153,0.25)',  text:'#ec4899', sub:'No data yet' },
  ]

  const panel = { background:'rgba(var(--ink-rgb),0.04)', border:'1px solid rgba(var(--ink-rgb),0.08)', borderRadius:16, padding:24, backdropFilter:'blur(20px)' }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Brand Partner</span></div>
        <h1 className="page-title">{user?.companyName || user?.name || 'Brand Dashboard'}</h1>
        <p className="page-subtitle">Campaign performance overview</p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:32 }}>
        {kpis.map((s, i) => <KpiCard key={s.label} s={s} i={i} loading={loading} />)}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Orders */}
        <div style={panel} className="lg:col-span-2">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color: 'var(--text)', margin:0 }}>Recent orders</h2>
            <Link to="/brand/orders" style={{ fontSize:12, fontWeight:600, color:'var(--violet-ink)', textDecoration:'none' }}>View all</Link>
          </div>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}><div className="spinner" /></div>
          ) : recentOrders.length === 0 ? (
            <div className="empty-state">
              <Package size={26} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 10 }} />
              <p>No orders yet — launch a campaign to start receiving orders</p>
              <Link to="/brand/campaign-builder" className="btn-primary" style={{ marginTop:16, textDecoration:'none' }}>Create campaign</Link>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {recentOrders.map(o => (
                <div key={o._id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12, background:'rgba(var(--ink-rgb),0.02)', border:'1px solid rgba(var(--ink-rgb),0.05)' }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'rgba(var(--ink-rgb),0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}><Package size={22} strokeWidth={1.5} style={{ color: 'rgba(var(--ink-rgb),0.25)' }} /></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:600, color: 'var(--text)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{o.product}</p>
                    <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.3)', marginTop:2 }}>{o.creatorId?.name || 'Creator'} · {o.orderId}</p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p className="tnum" style={{ fontSize:14, fontWeight:700, color: 'var(--text)', margin:0 }}>৳{o.total?.toLocaleString()}</p>
                    <span className={`badge ${o.status==='delivered' ? 'badge-success' : 'badge-warning'}`} style={{ marginTop:4 }}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={panel}>
          <h2 style={{ fontSize:16, fontWeight:700, color: 'var(--text)', margin:'0 0 20px' }}>Quick actions</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { to:'/brand/campaign-builder', label:'Create campaign',  Icon: Megaphone, desc:'Launch a new product campaign' },
              { to:'/brand/orders',           label:'Manage orders',    Icon: Package, desc:'Update shipping & tracking' },
              { to:'/brand/analytics',        label:'View analytics',   Icon: BarChart3, desc:'Campaign performance metrics' },
              { to:'/brand/invite',           label:'Invite creators',  Icon: Users, desc:'Send private campaign invites' },
            ].map(q => (
              <Link key={q.to} to={q.to} className="qa-row" style={{
                display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12,
                background:'rgba(var(--ink-rgb),0.03)', border:'1px solid rgba(var(--ink-rgb),0.07)',
                textDecoration:'none',
              }}>
                <q.Icon size={18} strokeWidth={1.75} style={{ color: 'var(--violet-ink)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color: 'var(--text)', margin:0 }}>{q.label}</p>
                  <p style={{ fontSize:11, color:'rgba(var(--ink-rgb),0.3)', marginTop:2 }}>{q.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .qa-row { transition-property: border-color, background-color; transition-duration: 150ms; transition-timing-function: cubic-bezier(0.2,0,0,1); }
        .qa-row:hover, .qa-row:focus-visible { border-color: rgba(124,58,237,0.3); background: rgba(124,58,237,0.06); }
        @media (hover: hover) and (pointer: fine) {
          .qa-row { transition-property: border-color, background-color, translate; }
          .qa-row:hover { translate: 0 -2px; }
        }
      `}</style>
    </div>
  )
}

export default BrandDashboard
