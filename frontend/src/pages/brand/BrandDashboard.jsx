import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getMyStats } from '../../services/users'

const BrandDashboard = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [stats, setStats]         = useState({ activeCampaigns: 0, totalCreators: 0, cashbackDisbursed: 0 })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getMyStats()
      .then(d => {
        setStats({
          activeCampaigns:   d.activeCampaigns   || 0,
          totalCreators:     d.totalCreators      || 0,
          cashbackDisbursed: d.cashbackDisbursed  || 0,
        })
        setRecentOrders(d.recentOrders || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const card  = `rounded-3xl p-6 transition-all ${isDark ? 'glass-panel card-hover' : 'bg-white border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-0.5'}`
  const label = `text-[10px] uppercase tracking-widest font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`
  const muted = `text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`

  const kpis = [
    { label: 'Active Campaigns',     value: String(stats.activeCampaigns),                              icon: '📢', sub: stats.activeCampaigns > 0 ? 'Live now' : 'No campaigns yet' },
    { label: 'Total Creators',       value: String(stats.totalCreators),                                icon: '👥', sub: stats.totalCreators > 0 ? 'Joined your campaigns' : 'None joined yet' },
    { label: 'Cashback Disbursed',   value: `৳${(stats.cashbackDisbursed || 0).toLocaleString()}`,     icon: '💸', sub: 'Total paid out' },
    { label: 'Avg. ROI',             value: stats.cashbackDisbursed > 0 ? '—' : '—',                   icon: '📊', sub: 'No data yet' },
  ]

  return (
    <div className="p-6 lg:p-10 min-h-screen">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-[1px] bg-orange-500" />
          <span className={label}>Brand Partner</span>
        </div>
        <h1 className={`text-3xl lg:text-4xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {user?.companyName || user?.name || 'Brand Dashboard'}
        </h1>
        <p className={`text-sm font-light mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Campaign performance overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(s => (
          <div key={s.label} className={card}>
            <span className="text-2xl block mb-4">{s.icon}</span>
            <p className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {loading ? '...' : s.value}
            </p>
            <p className={`${label} mt-1`}>{s.label}</p>
            <p className={`text-[10px] mt-2 ${muted}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className={`lg:col-span-2 rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-base font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Recent Orders</h2>
            <Link to="/brand/orders" className={`text-xs uppercase tracking-widest transition-colors flex items-center gap-1 ${isDark ? 'text-zinc-500 hover:text-orange-400' : 'text-zinc-400 hover:text-orange-500'}`}>
              View all <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <span className="text-4xl mb-3">📦</span>
              <p className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>No orders yet</p>
              <p className={`text-xs mt-1 mb-4 ${muted}`}>Launch a campaign to start receiving orders</p>
              <Link to="/brand/campaign-builder" className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-medium uppercase tracking-widest hover:bg-orange-600 transition-all">
                Create Campaign
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(o => (
                <div key={o._id} className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-black/[0.02] border border-black/5'}`}>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl flex-shrink-0">{o.image || '📦'}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{o.product}</p>
                    <p className={`text-xs ${muted}`}>{o.creatorId?.name || 'Creator'} · {o.orderId}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>৳{o.total?.toLocaleString()}</p>
                    <p className={`text-xs capitalize ${o.status === 'delivered' ? 'text-emerald-400' : 'text-orange-400'}`}>{o.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className={`rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
          <h2 className={`text-base font-medium tracking-tight mb-6 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Quick Actions</h2>
          <div className="space-y-3">
            {[
              { to: '/brand/campaign-builder', label: 'Create Campaign',   icon: '📢', desc: 'Launch a new product campaign' },
              { to: '/brand/orders',           label: 'Manage Orders',     icon: '📦', desc: 'Update shipping & tracking' },
              { to: '/brand/analytics',        label: 'View Analytics',    icon: '📊', desc: 'Campaign performance metrics' },
              { to: '/brand/invite',           label: 'Invite Creators',   icon: '👥', desc: 'Send private campaign invites' },
            ].map(q => (
              <Link key={q.to} to={q.to}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isDark ? 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]' : 'bg-black/[0.02] border border-black/5 hover:bg-black/[0.04]'}`}>
                <span className="text-xl">{q.icon}</span>
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{q.label}</p>
                  <p className={`text-xs ${muted}`}>{q.desc}</p>
                </div>
              </Link>
            ))}
          </div>
          <Link to="/brand/analytics" className={`mt-4 flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs uppercase tracking-widest transition-all ${isDark ? 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-zinc-400 hover:text-white' : 'bg-black/[0.02] border border-black/5 hover:bg-black/[0.04] text-zinc-400 hover:text-zinc-900'}`}>
            Full Analytics
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default BrandDashboard
