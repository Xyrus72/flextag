import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyStats } from '../../services/users'
import { getOrders } from '../../services/orders'
import ReferralCard from '../../components/ReferralCard'

const CreatorDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ totalEarned: 0, activeCampaigns: 0, completedPosts: 0, engagementRate: null })
  const [recentOrders, setRecentOrders]   = useState([])
  const [recentActivity, setRecentActivity] = useState([])
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
        setRecentActivity(orders.slice(0, 5).map(o => ({
          id: o._id,
          icon: o.status === 'delivered' ? '✅' : o.status === 'shipped' ? '🚚' : '📦',
          text: `${o.product} — ${o.status}`,
          sub:  new Date(o.createdAt).toLocaleDateString(),
        })))
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const kpis = [
    { label: 'Total Earned',     value: `৳${stats.totalEarned.toLocaleString()}`, icon: '💰', color: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)',  text: '#4ade80',  sub: 'Lifetime cashback' },
    { label: 'Active Campaigns', value: String(stats.activeCampaigns),            icon: '📢', color: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)', text: '#a78bfa', sub: 'In progress' },
    { label: 'Completed Posts',  value: String(stats.completedPosts),             icon: '📱', color: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.25)',  text: '#67e8f9', sub: 'Verified posts' },
    { label: 'Avg Engagement',   value: stats.engagementRate ? `${stats.engagementRate}%` : '—', icon: '❤️', color: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.25)', text: '#f9a8d4', sub: 'Engagement rate' },
  ]

  const tierInfo = {
    bronze:  { next: 'Silver',  progress: (user?.completedCampaigns||0)/5*100,  emoji:'🥉' },
    silver:  { next: 'Gold',    progress: (user?.completedCampaigns||0)/20*100, emoji:'🥈' },
    gold:    { next: 'Diamond', progress: (user?.completedCampaigns||0)/50*100, emoji:'🥇' },
    diamond: { next: null,      progress: 100,                                   emoji:'💎' },
  }
  const tier = tierInfo[user?.tier] || tierInfo.bronze

  const panel = { background:'rgba(var(--ink-rgb),0.04)', border:'1px solid rgba(var(--ink-rgb),0.08)', borderRadius:20, padding:24, backdropFilter:'blur(20px)' }

  return (
    <div className="page-root">
      {/* Header */}
      <div className="page-header">
        <div className="page-label"><span>Creator Dashboard</span></div>
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's your earning overview</p>
      </div>

      <ReferralCard />

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:32 }}>
        {kpis.map(s => (
          <div key={s.label} className="stat-card" style={{ background:`rgba(var(--ink-rgb),0.03)`, borderColor:`rgba(var(--ink-rgb),0.07)` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:s.color, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{s.icon}</div>
              {loading && <div className="spinner" style={{ width:16, height:16, borderWidth:2 }} />}
            </div>
            <p style={{ fontSize:28, fontWeight:800, color: 'var(--text)', letterSpacing:'-0.03em', marginBottom:4 }}>{loading ? '—' : s.value}</p>
            <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(var(--ink-rgb),0.3)', marginBottom:6 }}>{s.label}</p>
            <p style={{ fontSize:12, color:s.text }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:20 }} className="lg:grid-cols-3">
        {/* Recent Orders */}
        <div style={{ ...panel, gridColumn:'span 2' }} className="lg:col-span-2">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color: 'var(--text)', margin:0 }}>Recent Orders</h2>
            <Link to="/creator/orders" style={{ fontSize:11, color:'rgba(167,139,250,0.7)', textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.1em', display:'flex', alignItems:'center', gap:4 }}>
              View all →
            </Link>
          </div>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}><div className="spinner" /></div>
          ) : recentOrders.length === 0 ? (
            <div className="empty-state">
              <p>📭</p>
              <p>No orders yet — browse the catalog to join campaigns</p>
              <Link to="/creator/catalog" className="btn-primary" style={{ marginTop:16, textDecoration:'none' }}>Browse Catalog</Link>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {recentOrders.map(o => (
                <div key={o._id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:14, background:'rgba(var(--ink-rgb),0.02)', border:'1px solid rgba(var(--ink-rgb),0.05)' }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'rgba(var(--ink-rgb),0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{o.image || '📦'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:600, color: 'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', margin:0 }}>{o.product}</p>
                    <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.3)', marginTop:2 }}>{o.brand} · {o.orderId}</p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontSize:15, fontWeight:700, color: 'var(--text)', margin:0 }}>৳{o.total?.toLocaleString()}</p>
                    <p style={{ fontSize:12, color:'#4ade80', marginTop:2 }}>+৳{o.cashbackAmount?.toLocaleString()}</p>
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
            <h2 style={{ fontSize:15, fontWeight:700, color: 'var(--text)', margin:'0 0 16px' }}>Tier Progress</h2>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <span style={{ fontSize:28 }}>{tier.emoji}</span>
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
            <h2 style={{ fontSize:15, fontWeight:700, color: 'var(--text)', margin:'0 0 16px' }}>Quick Actions</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { to:'/creator/catalog',     label:'Shop',      icon:'🛍️' },
                { to:'/creator/submit-post', label:'Submit',    icon:'📱' },
                { to:'/creator/wallet',      label:'Wallet',    icon:'💳' },
                { to:'/creator/leaderboard', label:'Rankings',  icon:'🏆' },
              ].map(q => (
                <Link key={q.to} to={q.to} style={{ padding:'14px 8px', borderRadius:12, textAlign:'center', background:'rgba(var(--ink-rgb),0.03)', border:'1px solid rgba(var(--ink-rgb),0.07)', textDecoration:'none', transition:'all 0.2s', display:'block' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(124,58,237,0.3)'; e.currentTarget.style.background='rgba(124,58,237,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(var(--ink-rgb),0.07)'; e.currentTarget.style.background='rgba(var(--ink-rgb),0.03)' }}
                >
                  <p style={{ fontSize:22, marginBottom:6 }}>{q.icon}</p>
                  <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(var(--ink-rgb),0.4)', margin:0 }}>{q.label}</p>
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
