import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyStats } from '../../services/users'
import { getOrders } from '../../services/orders'
import ReferralCard from '../../components/ReferralCard'
import DetectedPosts from '../../components/DetectedPosts'
import ActivationChecklist from '../../components/ActivationChecklist'
import { useCountUp } from '../../hooks/useCountUp'
import { Wallet, Megaphone, CheckCircle2, Heart, ShoppingBag, Camera, Trophy, Medal, Gem, ChevronRight, Inbox, Package } from 'lucide-react'

/** One KPI card — counts up to its value once, on first load only. */
const KpiCard = ({ s, i, loading }) => {
  const display = useCountUp(s.raw)
  return (
    <div className="stat-card stagger-in" style={{ '--i': i, background: 'rgba(var(--ink-rgb),0.03)', borderColor: 'rgba(var(--ink-rgb),0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><s.Icon size={17} strokeWidth={1.75} style={{ color: s.text }} /></div>
        {loading && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
      </div>
      <p className="tnum" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 4 }}>{loading ? '—' : s.format(display)}</p>
      <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: 0, textTransform: 'none', color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</p>
      <p style={{ fontSize: 12, color: s.text }}>{s.sub}</p>
    </div>
  )
}

const CreatorDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ totalEarned: 0, activeCampaigns: 0, completedPosts: 0, engagementRate: null })
  const [recentOrders, setRecentOrders]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, ordersData] = await Promise.all([getMyStats(), getOrders({ status: 'all' })])
        setStats({
          totalEarned:     statsData.totalEarned     || 0,
          activeCampaigns: statsData.activeCampaigns || 0,
          completedPosts:  statsData.completedPosts  || 0,
          engagementRate:  statsData.engagementRate  || null,
        })
        const orders = ordersData.orders || []
        setRecentOrders(orders.slice(0, 3))
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const kpis = [
    { label: 'Total earned',     raw: stats.totalEarned,     format: (n) => `৳${n.toLocaleString()}`, Icon: Wallet, color: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)',  text: 'var(--green-ink)',  sub: 'Lifetime cashback' },
    { label: 'Active campaigns', raw: stats.activeCampaigns, format: (n) => String(n),                Icon: Megaphone, color: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)', text: 'var(--violet-ink)', sub: 'In progress' },
    { label: 'Completed posts',  raw: stats.completedPosts,  format: (n) => String(n),                Icon: CheckCircle2, color: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.25)',  text: 'var(--cyan-ink)', sub: 'Verified posts' },
    { label: 'Avg engagement',   raw: stats.engagementRate || 0, format: (n) => (stats.engagementRate ? `${n}%` : '—'), Icon: Heart, color: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.25)', text: '#f9a8d4', sub: 'Engagement rate' },
  ]

  const tierInfo = {
    bronze:  { next: 'Silver',  progress: (user?.completedCampaigns||0)/5*100,  Icon: Medal,  color: 'var(--amber-ink)' },
    silver:  { next: 'Gold',    progress: (user?.completedCampaigns||0)/20*100, Icon: Medal,  color: 'var(--text-muted)' },
    gold:    { next: 'Diamond', progress: (user?.completedCampaigns||0)/50*100, Icon: Trophy, color: 'var(--amber-ink)' },
    diamond: { next: null,      progress: 100,                                   Icon: Gem,    color: 'var(--cyan-ink)' },
  }
  const tier = tierInfo[user?.tier] || tierInfo.bronze

  const panel = { background:'rgba(var(--ink-rgb),0.04)', border:'1px solid rgba(var(--ink-rgb),0.08)', borderRadius:16, padding:24, backdropFilter:'blur(20px)' }

  return (
    <div className="page-root">
      <style>{`
        .qa-tile { transition-property: border-color, background-color, color; transition-duration: 150ms; transition-timing-function: cubic-bezier(0.2,0,0,1); }
        .qa-tile:hover, .qa-tile:focus-visible { border-color: rgba(124,58,237,0.3); background-color: rgba(124,58,237,0.06); }
        @media (hover: hover) and (pointer: fine) {
          .qa-tile { transition-property: border-color, background-color, color, translate; }
          .qa-tile:hover { translate: 0 -2px; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div className="page-label"><span>Creator Dashboard</span></div>
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="page-subtitle">Here's your earning overview</p>
      </div>

      {/* Posts FlexTag spotted on Instagram before the creator told us */}
      <DetectedPosts />
      {/* The road to the first cashback — disappears once they get there */}
      <ActivationChecklist />

      <ReferralCard />

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:32 }}>
        {kpis.map((s, i) => <KpiCard key={s.label} s={s} i={i} loading={loading} />)}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:20 }} className="lg:grid-cols-3">
        {/* Recent Orders */}
        <div style={{ ...panel, gridColumn:'span 2' }} className="lg:col-span-2">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color: 'var(--text)', margin:0 }}>Recent orders</h2>
            <Link to="/creator/orders" style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)', textDecoration:'none', letterSpacing:0, textTransform:'none', display:'flex', alignItems:'center', gap:2 }}>
              View all <ChevronRight size={14} strokeWidth={1.75} />
            </Link>
          </div>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}><div className="spinner" /></div>
          ) : recentOrders.length === 0 ? (
            <div className="empty-state">
              <Inbox size={28} strokeWidth={1.5} style={{ color:'var(--text-dim)', marginBottom:10 }} />
              <p>No orders yet — browse the catalog to join campaigns</p>
              <Link to="/creator/catalog" className="btn-primary" style={{ marginTop:16, textDecoration:'none' }}>Browse catalog</Link>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {recentOrders.map(o => (
                <div key={o._id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:14, background:'rgba(var(--ink-rgb),0.02)', border:'1px solid rgba(var(--ink-rgb),0.05)' }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'rgba(var(--ink-rgb),0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                    {String(o.image||'').startsWith('http') ? <img src={o.image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:12 }} /> : <Package size={20} strokeWidth={1.5} style={{ color:'rgba(var(--ink-rgb),0.25)' }} />}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:600, color: 'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', margin:0 }}>{o.product}</p>
                    <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{o.brand} · {o.orderId}</p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p className="tnum" style={{ fontSize:15, fontWeight:700, color: 'var(--text)', margin:0 }}>৳{o.total?.toLocaleString()}</p>
                    <p className="tnum" style={{ fontSize:12, color:'var(--green-ink)', marginTop:2 }}>+৳{o.cashbackAmount?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right col */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Tier */}
          <div style={panel}>
            <h2 style={{ fontSize:15, fontWeight:700, color: 'var(--text)', margin:'0 0 16px' }}>Tier progress</h2>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'rgba(var(--ink-rgb),0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <tier.Icon size={20} strokeWidth={1.75} style={{ color: tier.color }} />
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color: 'var(--text)', margin:0, textTransform:'capitalize' }}>{user?.tier || 'Bronze'} Creator</p>
                {tier.next && <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.35)', marginTop:2 }}>Leveling up to {tier.next}</p>}
              </div>
            </div>
            <div style={{ width:'100%', height:6, borderRadius:3, background:'rgba(var(--ink-rgb),0.06)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, background:'linear-gradient(90deg,#7c3aed,#06b6d4)', width:`${Math.min(100,tier.progress)}%`, transition:'width 1s ease' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
              <span style={{ fontSize:11, color:'rgba(var(--ink-rgb),0.3)', textTransform:'capitalize' }}>{user?.tier||'Bronze'}</span>
              {tier.next && <span style={{ fontSize:11, color:'rgba(var(--ink-rgb),0.3)' }}>{tier.next}</span>}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={panel}>
            <h2 style={{ fontSize:15, fontWeight:700, color: 'var(--text)', margin:'0 0 16px' }}>Quick actions</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { to:'/creator/catalog',     label:'Shop',      Icon: ShoppingBag },
                { to:'/creator/submit-post', label:'Submit',    Icon: Camera },
                { to:'/creator/wallet',      label:'Wallet',    Icon: Wallet },
                { to:'/creator/leaderboard', label:'Rankings',  Icon: Trophy },
              ].map(q => (
                <Link key={q.to} to={q.to} className="qa-tile" style={{ padding:'14px 8px', borderRadius:12, textAlign:'center', background:'rgba(var(--ink-rgb),0.03)', border:'1px solid rgba(var(--ink-rgb),0.07)', textDecoration:'none', display:'block' }}
                >
                  <p style={{ marginBottom:8, display:'flex', justifyContent:'center' }}><q.Icon size={19} strokeWidth={1.75} style={{ color: 'var(--violet-ink)' }} /></p>
                  <p style={{ fontSize:12, fontWeight:500, letterSpacing:0, textTransform:'none', color:'var(--text-muted)', margin:0 }}>{q.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatorDashboard
