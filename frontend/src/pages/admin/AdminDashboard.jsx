import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAdminStats } from '../../services/admin'
import { getPosts } from '../../services/posts'
import { getUsers } from '../../services/users'

const AdminDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats]                   = useState({})
  const [pendingPosts, setPendingPosts]      = useState([])
  const [unverifiedBrands, setUnverifiedBrands] = useState([])
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, postsData, usersData] = await Promise.all([
          getAdminStats(), getPosts({ status:'pending' }), getUsers({ role:'brand', isVerified:false })
        ])
        setStats(statsData)
        setPendingPosts((postsData.posts || []).slice(0, 5))
        setUnverifiedBrands((usersData.users || []).slice(0, 5))
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const kpis = [
    { label:'Total GMV',          value:`৳${(stats.totalGMV||0).toLocaleString()}`,          icon:'💰', color:'rgba(34,197,94,0.12)',   border:'rgba(34,197,94,0.25)',  text:'#4ade80' },
    { label:'Active Creators',    value:String(stats.totalCreators   || 0),                   icon:'👥', color:'rgba(124,58,237,0.12)',  border:'rgba(124,58,237,0.25)', text:'#a78bfa' },
    { label:'Active Campaigns',   value:String(stats.activeCampaigns || 0),                   icon:'📢', color:'rgba(6,182,212,0.12)',   border:'rgba(6,182,212,0.25)',  text:'#67e8f9' },
    { label:'Verified Brands',    value:String(stats.verifiedBrands  || 0),                   icon:'🏢', color:'rgba(236,72,153,0.12)',  border:'rgba(236,72,153,0.25)', text:'#f9a8d4' },
    { label:'Cashback Liability', value:`৳${(stats.cashbackLiability||0).toLocaleString()}`,  icon:'⏳', color:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.25)', text:'#fbbf24' },
    { label:'Commission Revenue', value:`৳${(stats.commissionRevenue||0).toLocaleString()}`,  icon:'📊', color:'rgba(34,197,94,0.12)',   border:'rgba(34,197,94,0.25)',  text:'#4ade80' },
  ]

  const alerts = [
    pendingPosts.length   > 0 && { level:'warning', text:`${pendingPosts.length} post${pendingPosts.length>1?'s':''} pending review`, link:null },
    unverifiedBrands.length > 0 && { level:'info', text:`${unverifiedBrands.length} brand${unverifiedBrands.length>1?'s':''} awaiting verification`, link:'/admin/brand-verification' },
  ].filter(Boolean)

  const panel = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:24, backdropFilter:'blur(20px)' }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Admin Control</span></div>
        <h1 className="page-title">Platform Dashboard</h1>
        <p className="page-subtitle">Welcome, {user?.name} · Real-time platform management</p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:32 }}>
        {kpis.map(s => (
          <div key={s.label} className="stat-card" style={{ background:'rgba(255,255,255,0.03)' }}>
            <div style={{ width:44, height:44, borderRadius:12, background:s.color, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:16 }}>{s.icon}</div>
            <p style={{ fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-0.03em', marginBottom:4 }}>{loading ? '—' : s.value}</p>
            <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:6 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gap:20 }} className="lg:grid-cols-2">
        {/* Alerts */}
        <div style={panel}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#fff', margin:'0 0 20px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background: alerts.length>0 ? '#fbbf24' : '#4ade80', display:'inline-block', boxShadow: alerts.length>0 ? '0 0 8px #fbbf24' : '0 0 8px #4ade80', animation: alerts.length>0 ? 'none' : 'none' }} />
            Active Alerts
          </h2>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}><div className="spinner" /></div>
          ) : alerts.length === 0 ? (
            <div className="empty-state"><p>✅</p><p>No alerts — platform is running smoothly</p></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ padding:'14px 16px', borderRadius:14, background: a.level==='warning' ? 'rgba(245,158,11,0.08)' : 'rgba(124,58,237,0.08)', border: a.level==='warning' ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(124,58,237,0.25)' }}>
                  <p style={{ fontSize:14, fontWeight:600, color: a.level==='warning' ? '#fbbf24' : '#a78bfa', margin:'0 0 6px' }}>
                    {a.level==='warning' ? '⚠' : 'ℹ'} {a.text}
                  </p>
                  {a.link && <Link to={a.link} style={{ fontSize:12, color:'#a78bfa', textDecoration:'none' }}>Review now →</Link>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={panel}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#fff', margin:'0 0 20px' }}>Quick Actions</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { to:'/admin/brand-verification',   label:'Verify Brands',   icon:'✅', badge:unverifiedBrands.length },
              { to:'/admin/creator-verification', label:'Verify Creators', icon:'🧑‍🎤', badge:0 },
              { to:'/admin/post-review',          label:'Post Review',     icon:'📝', badge:pendingPosts.length },
              { to:'/admin/disputes',             label:'Disputes',        icon:'⚠️', badge:0 },
              { to:'/admin/commission',           label:'Commission',      icon:'💰', badge:0 },
              { to:'/admin/categories',           label:'Categories',      icon:'📂', badge:0 },
              { to:'/admin/financial',            label:'Financials',      icon:'📈', badge:0 },
            ].map(q => (
              <Link key={q.to} to={q.to} style={{
                position:'relative', display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14,
                background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                textDecoration:'none', fontSize:13, color:'rgba(255,255,255,0.55)', fontWeight:500, transition:'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(124,58,237,0.3)'; e.currentTarget.style.background='rgba(124,58,237,0.06)'; e.currentTarget.style.color='#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.color='rgba(255,255,255,0.55)' }}
              >
                <span style={{ fontSize:18 }}>{q.icon}</span>
                {q.label}
                {q.badge > 0 && (
                  <span style={{ position:'absolute', top:-6, right:-6, minWidth:18, height:18, borderRadius:9, background:'#ef4444', color:'#fff', fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{q.badge}</span>
                )}
              </Link>
            ))}
          </div>

          {/* Pending posts preview */}
          {!loading && pendingPosts.length > 0 && (
            <div style={{ marginTop:20 }}>
              <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.25)', marginBottom:10 }}>Pending Posts</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {pendingPosts.map(p => (
                  <div key={p._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.02)' }}>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.creatorId?.name || 'Creator'}</p>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{p.platform} · {p.campaignId?.title || 'Campaign'}</p>
                    </div>
                    <span className="badge badge-warning" style={{ marginLeft:8 }}>Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
