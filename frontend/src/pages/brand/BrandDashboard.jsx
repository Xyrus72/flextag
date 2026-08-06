import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyStats } from '../../services/users'

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
    { label:'Active Campaigns',   value:String(stats.activeCampaigns),                         icon:'📢', color:'rgba(124,58,237,0.12)', border:'rgba(124,58,237,0.25)', text:'#a78bfa', sub:'Live now' },
    { label:'Total Creators',     value:String(stats.totalCreators),                            icon:'👥', color:'rgba(6,182,212,0.12)',  border:'rgba(6,182,212,0.25)',  text:'#67e8f9', sub:'Joined campaigns' },
    { label:'Cashback Disbursed', value:`৳${(stats.cashbackDisbursed||0).toLocaleString()}`,    icon:'💸', color:'rgba(34,197,94,0.12)', border:'rgba(34,197,94,0.25)',  text:'#4ade80', sub:'Total paid out' },
    { label:'Avg. ROI',           value:'—',                                                    icon:'📊', color:'rgba(236,72,153,0.12)',border:'rgba(236,72,153,0.25)',  text:'#f9a8d4', sub:'No data yet' },
  ]

  const panel = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:24, backdropFilter:'blur(20px)' }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Brand Partner</span></div>
        <h1 className="page-title">{user?.companyName || user?.name || 'Brand Dashboard'}</h1>
        <p className="page-subtitle">Campaign performance overview</p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:32 }}>
        {kpis.map(s => (
          <div key={s.label} className="stat-card" style={{ background:'rgba(255,255,255,0.03)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:s.color, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{s.icon}</div>
              {loading && <div className="spinner" style={{ width:16, height:16, borderWidth:2 }} />}
            </div>
            <p style={{ fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-0.03em', marginBottom:4 }}>{loading ? '—' : s.value}</p>
            <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:6 }}>{s.label}</p>
            <p style={{ fontSize:12, color:s.text }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gap:20 }} className="lg:grid-cols-3">
        {/* Orders */}
        <div style={{ ...panel, gridColumn:'span 2' }} className="lg:col-span-2">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#fff', margin:0 }}>Recent Orders</h2>
            <Link to="/brand/orders" style={{ fontSize:11, color:'rgba(167,139,250,0.7)', textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.1em' }}>View all →</Link>
          </div>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}><div className="spinner" /></div>
          ) : recentOrders.length === 0 ? (
            <div className="empty-state">
              <p>📦</p>
              <p>No orders yet — launch a campaign to start receiving orders</p>
              <Link to="/brand/campaign-builder" className="btn-primary" style={{ marginTop:16, textDecoration:'none' }}>Create Campaign</Link>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {recentOrders.map(o => (
                <div key={o._id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:14, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{o.image||'📦'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:600, color:'#fff', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{o.product}</p>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{o.creatorId?.name || 'Creator'} · {o.orderId}</p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:'#fff', margin:0 }}>৳{o.total?.toLocaleString()}</p>
                    <span className={`badge ${o.status==='delivered' ? 'badge-success' : 'badge-warning'}`} style={{ marginTop:4 }}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={panel}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#fff', margin:'0 0 20px' }}>Quick Actions</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { to:'/brand/campaign-builder', label:'Create Campaign',  icon:'📢', desc:'Launch a new product campaign' },
              { to:'/brand/orders',           label:'Manage Orders',    icon:'📦', desc:'Update shipping & tracking' },
              { to:'/brand/analytics',        label:'View Analytics',   icon:'📊', desc:'Campaign performance metrics' },
              { to:'/brand/invite',           label:'Invite Creators',  icon:'👥', desc:'Send private campaign invites' },
            ].map(q => (
              <Link key={q.to} to={q.to} style={{
                display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:14,
                background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                textDecoration:'none', transition:'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(124,58,237,0.3)'; e.currentTarget.style.background='rgba(124,58,237,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
              >
                <span style={{ fontSize:20 }}>{q.icon}</span>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:'#fff', margin:0 }}>{q.label}</p>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{q.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrandDashboard
