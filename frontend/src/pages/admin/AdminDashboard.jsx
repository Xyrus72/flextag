import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getAdminStats } from '../../services/admin'
import { getPosts } from '../../services/posts'
import { getUsers } from '../../services/users'

const AdminDashboard = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [stats, setStats]   = useState({})
  const [pendingPosts, setPendingPosts] = useState([])
  const [unverifiedBrands, setUnverifiedBrands] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, postsData, usersData] = await Promise.all([
          getAdminStats(),
          getPosts({ status: 'pending' }),
          getUsers({ role: 'brand', isVerified: false }),
        ])
        setStats(statsData)
        setPendingPosts((postsData.posts || []).slice(0, 5))
        setUnverifiedBrands((usersData.users || []).slice(0, 5))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const card  = `rounded-3xl p-6 transition-all ${isDark ? 'glass-panel card-hover' : 'bg-white border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-0.5'}`
  const label = `text-[10px] uppercase tracking-widest font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`
  const muted = `text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`

  const kpis = [
    { label: 'Total GMV',          value: loading ? '...' : `৳${(stats.totalGMV || 0).toLocaleString()}`,           icon: '💰', sub: 'All time cashback disbursed' },
    { label: 'Active Creators',    value: loading ? '...' : String(stats.totalCreators   || 0),                       icon: '👥', sub: 'Registered creators' },
    { label: 'Active Campaigns',   value: loading ? '...' : String(stats.activeCampaigns || 0),                       icon: '📢', sub: 'Live right now' },
    { label: 'Verified Brands',    value: loading ? '...' : String(stats.verifiedBrands  || 0),                       icon: '🏢', sub: `of ${stats.totalBrands || 0} brands` },
    { label: 'Cashback Liability', value: loading ? '...' : `৳${(stats.cashbackLiability || 0).toLocaleString()}`,   icon: '⏳', sub: 'Pending escrow' },
    { label: 'Commission Revenue', value: loading ? '...' : `৳${(stats.commissionRevenue || 0).toLocaleString()}`,   icon: '📊', sub: 'Platform earnings' },
  ]

  const alerts = [
    pendingPosts.length > 0 && { level: 'warning', text: `${pendingPosts.length} post${pendingPosts.length > 1 ? 's' : ''} pending review`, link: null },
    unverifiedBrands.length > 0 && { level: 'info', text: `${unverifiedBrands.length} brand${unverifiedBrands.length > 1 ? 's' : ''} awaiting verification`, link: '/admin/brand-verification' },
  ].filter(Boolean)

  return (
    <div className="p-6 lg:p-10 min-h-screen">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-[1px] bg-orange-500" />
          <span className={label}>Admin Control</span>
        </div>
        <h1 className={`text-3xl lg:text-4xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Platform Dashboard
        </h1>
        <p className={`text-sm font-light mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Welcome, {user?.name} · Real-time platform management
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpis.map(s => (
          <div key={s.label} className={card}>
            <span className="text-2xl block mb-4">{s.icon}</span>
            <p className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{s.value}</p>
            <p className={`${label} mt-1`}>{s.label}</p>
            <p className={`text-[10px] mt-2 ${muted}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className={`rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
          <h2 className={`text-base font-medium tracking-tight mb-6 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            <span className={`w-2 h-2 rounded-full ${alerts.length > 0 ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'} inline-block mr-2`} />
            Active Alerts
          </h2>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /></div>
          ) : alerts.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <span className="text-3xl mb-2">✅</span>
              <p className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>No alerts</p>
              <p className={`text-xs mt-1 ${muted}`}>Platform is running smoothly</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((a, i) => (
                <div key={i} className={`p-4 rounded-xl border ${a.level === 'warning' ? 'bg-yellow-500/5 border-yellow-500/15' : 'bg-blue-500/5 border-blue-500/15'}`}>
                  <p className={`text-sm font-semibold ${a.level === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {a.level === 'warning' ? '⚠' : 'ℹ'} {a.text}
                  </p>
                  {a.link && <Link to={a.link} className="text-xs text-orange-400 hover:text-orange-300 mt-1 block">Review now →</Link>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Nav */}
        <div className={`rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
          <h2 className={`text-base font-medium tracking-tight mb-6 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/admin/brand-verification', label: 'Verify Brands',  icon: '✓', badge: unverifiedBrands.length },
              { to: '/admin/post-review',        label: 'Post Review',    icon: '📝', badge: pendingPosts.length },
              { to: '/admin/disputes',           label: 'Disputes',       icon: '⚠', badge: 0 },
              { to: '/admin/commission',         label: 'Commission',     icon: '%', badge: 0 },
              { to: '/admin/categories',         label: 'Categories',     icon: '⊞', badge: 0 },
              { to: '/admin/financial',          label: 'Financials',     icon: '$', badge: 0 },
              { to: '/admin/analytics',          label: 'Analytics',      icon: '↗', badge: 0 },
            ].map(q => (
              <Link key={q.to} to={q.to} className={`relative flex items-center gap-2 p-3 rounded-xl text-xs transition-all ${isDark ? 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-zinc-400 hover:text-white' : 'bg-black/[0.02] border border-black/5 hover:bg-black/[0.04] text-zinc-500 hover:text-zinc-900'}`}>
                <span className="font-bold text-base">{q.icon}</span>
                {q.label}
                {q.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{q.badge}</span>
                )}
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <p className={`${label} mb-3`}>Pending Posts</p>
            {pendingPosts.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-6 rounded-2xl border border-dashed ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                <span className="text-2xl mb-1">✅</span>
                <p className={`text-xs ${muted}`}>All posts reviewed</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingPosts.map(p => (
                  <div key={p._id} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-black/[0.02]'}`}>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{p.creatorId?.name || 'Creator'}</p>
                      <p className={`text-[10px] ${muted}`}>{p.platform} · {p.campaignId?.title || 'Campaign'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-500/10 text-yellow-400 font-bold ml-2 flex-shrink-0">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
