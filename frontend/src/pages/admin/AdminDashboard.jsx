import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Coins, Users, Megaphone, Building2, Hourglass, BarChart3, CheckCircle2, ShieldCheck, UserCheck, FileText, Scale, Percent, Package, TrendingUp, AlertTriangle, Info } from 'lucide-react'
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
    { label:'Total GMV',          value:`৳${(stats.totalGMV||0).toLocaleString()}`,          Icon:Coins,       color:'rgba(34,197,94,0.12)',   border:'rgba(34,197,94,0.25)',  text:'var(--green-ink)' },
    { label:'Active Creators',    value:String(stats.totalCreators   || 0),                   Icon:Users,       color:'rgba(124,58,237,0.12)',  border:'rgba(124,58,237,0.25)', text:'var(--violet-ink)' },
    { label:'Active Campaigns',   value:String(stats.activeCampaigns || 0),                   Icon:Megaphone,   color:'rgba(6,182,212,0.12)',   border:'rgba(6,182,212,0.25)',  text:'var(--cyan-ink)' },
    { label:'Verified Brands',    value:String(stats.verifiedBrands  || 0),                   Icon:Building2,   color:'rgba(236,72,153,0.12)',  border:'rgba(236,72,153,0.25)', text:'#f9a8d4' },
    { label:'Cashback Liability', value:`৳${(stats.cashbackLiability||0).toLocaleString()}`,  Icon:Hourglass,   color:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.25)', text:'var(--amber-ink)' },
    { label:'Commission Revenue', value:`৳${(stats.commissionRevenue||0).toLocaleString()}`,  Icon:BarChart3,   color:'rgba(34,197,94,0.12)',   border:'rgba(34,197,94,0.25)',  text:'var(--green-ink)' },
  ]

  const alerts = [
    pendingPosts.length   > 0 && { level:'warning', text:`${pendingPosts.length} post${pendingPosts.length>1?'s':''} pending review`, link:null },
    unverifiedBrands.length > 0 && { level:'info', text:`${unverifiedBrands.length} brand${unverifiedBrands.length>1?'s':''} awaiting verification`, link:'/admin/brand-verification' },
  ].filter(Boolean)

  const panel = { background:'rgba(var(--ink-rgb),0.04)', border:'1px solid rgba(var(--ink-rgb),0.08)', borderRadius:16, padding:24, backdropFilter:'blur(20px)' }

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
          <div key={s.label} className="stat-card" style={{ background:'rgba(var(--ink-rgb),0.03)' }}>
            <div style={{ width:44, height:44, borderRadius:12, background:s.color, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}><s.Icon size={20} strokeWidth={1.75} style={{ color:s.text }} /></div>
            <p className="tnum" style={{ fontSize:28, fontWeight:800, color: 'var(--text)', letterSpacing:'-0.03em', marginBottom:4 }}>{loading ? '—' : s.value}</p>
            <p style={{ fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(var(--ink-rgb),0.3)', marginBottom:6 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gap:20 }} className="lg:grid-cols-2">
        {/* Alerts */}
        <div style={panel}>
          <h2 style={{ fontSize:16, fontWeight:700, color: 'var(--text)', margin:'0 0 20px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background: alerts.length>0 ? '#fbbf24' : '#4ade80', display:'inline-block' }} />
            Active Alerts
          </h2>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}><div className="spinner" /></div>
          ) : alerts.length === 0 ? (
            <div className="empty-state"><CheckCircle2 size={28} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 10 }} /><p>No alerts — platform is running smoothly</p></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ padding:'14px 16px', borderRadius:14, background: a.level==='warning' ? 'rgba(245,158,11,0.08)' : 'rgba(124,58,237,0.08)', border: a.level==='warning' ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(124,58,237,0.25)' }}>
                  <p style={{ fontSize:14, fontWeight:600, color: a.level==='warning' ? 'var(--amber-ink)' : 'var(--violet-ink)', margin:'0 0 6px', display:'flex', alignItems:'center', gap:6 }}>
                    {a.level==='warning' ? <AlertTriangle size={14} strokeWidth={1.75} /> : <Info size={14} strokeWidth={1.75} />} {a.text}
                  </p>
                  {a.link && <Link to={a.link} style={{ fontSize:12, color:'var(--violet-ink)', textDecoration:'none' }}>Review now →</Link>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={panel}>
          <h2 style={{ fontSize:16, fontWeight:700, color: 'var(--text)', margin:'0 0 20px' }}>Quick Actions</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { to:'/admin/brand-verification',   label:'Verify Brands',   Icon:ShieldCheck, badge:unverifiedBrands.length },
              { to:'/admin/creator-verification', label:'Verify Creators', Icon:UserCheck,   badge:0 },
              { to:'/admin/post-review',          label:'Post Review',     Icon:FileText,    badge:pendingPosts.length },
              { to:'/admin/disputes',             label:'Disputes',        Icon:Scale,       badge:0 },
              { to:'/admin/commission',           label:'Commission',      Icon:Percent,     badge:0 },
              { to:'/admin/categories',           label:'Categories',      Icon:Package,     badge:0 },
              { to:'/admin/financial',            label:'Financials',      Icon:TrendingUp,  badge:0 },
            ].map(q => (
              <Link key={q.to} to={q.to} style={{
                position:'relative', display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14,
                background:'rgba(var(--ink-rgb),0.03)', border:'1px solid rgba(var(--ink-rgb),0.07)',
                textDecoration:'none', fontSize:13, color:'rgba(var(--ink-rgb),0.55)', fontWeight:500, transition:'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(124,58,237,0.3)'; e.currentTarget.style.background='rgba(124,58,237,0.06)'; e.currentTarget.style.color='var(--text)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(var(--ink-rgb),0.07)'; e.currentTarget.style.background='rgba(var(--ink-rgb),0.03)'; e.currentTarget.style.color='rgba(var(--ink-rgb),0.55)' }}
              >
                <q.Icon size={18} strokeWidth={1.75} />
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
              <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(var(--ink-rgb),0.25)', marginBottom:10 }}>Pending Posts</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {pendingPosts.map(p => (
                  <div key={p._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:10, background:'rgba(var(--ink-rgb),0.02)' }}>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontSize:13, color:'rgba(var(--ink-rgb),0.7)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.creatorId?.name || 'Creator'}</p>
                      <p style={{ fontSize:11, color:'rgba(var(--ink-rgb),0.3)', marginTop:2 }}>{p.platform} · {p.campaignId?.title || 'Campaign'}</p>
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
