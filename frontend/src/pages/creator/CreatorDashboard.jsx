import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getMyStats } from '../../services/users'
import { getOrders } from '../../services/orders'

const CreatorDashboard = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [stats, setStats] = useState({
    totalEarned: 0,
    activeCampaigns: 0,
    completedPosts: 0,
    engagementRate: null,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, ordersData] = await Promise.all([
          getMyStats(),
          getOrders({ status: 'all' }),
        ])
        setStats({
          totalEarned:     statsData.totalEarned     || 0,
          activeCampaigns: statsData.activeCampaigns || 0,
          completedPosts:  statsData.completedPosts  || 0,
          engagementRate:  statsData.engagementRate  || null,
        })
        const orders = ordersData.orders || []
        setRecentOrders(orders.slice(0, 3))

        // Build recent activity from latest orders
        setRecentActivity(orders.slice(0, 5).map(o => ({
          id: o._id,
          icon: o.status === 'delivered' ? '✅' : o.status === 'shipped' ? '🚚' : '📦',
          text: `${o.product} — ${o.status}`,
          sub:  new Date(o.createdAt).toLocaleDateString(),
        })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const card  = `rounded-3xl p-6 transition-all duration-300 ${isDark ? 'glass-panel card-hover' : 'bg-white border border-black/5 hover:border-black/10 hover:-translate-y-0.5 shadow-sm hover:shadow-md'}`
  const label = `text-[10px] uppercase tracking-widest font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`
  const muted = `text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`

  const kpis = [
    { label: 'Total Earned',     value: `৳${stats.totalEarned.toLocaleString()}`, icon: '💰', accent: 'text-emerald-400', sub: stats.totalEarned > 0 ? 'Lifetime cashback' : 'No earnings yet' },
    { label: 'Active Campaigns', value: String(stats.activeCampaigns),             icon: '📢', accent: 'text-orange-400',  sub: stats.activeCampaigns > 0 ? 'In progress' : 'No active campaigns' },
    { label: 'Completed Posts',  value: String(stats.completedPosts),              icon: '📱', accent: 'text-blue-400',    sub: stats.completedPosts > 0 ? 'Verified posts' : 'No posts submitted' },
    { label: 'Avg Engagement',   value: stats.engagementRate ? `${stats.engagementRate}%` : '—', icon: '❤️', accent: 'text-pink-400', sub: 'Engagement rate' },
  ]

  const tierInfo = {
    bronze:  { next: 'silver',  progress: (user?.completedCampaigns || 0) / 5  * 100, emoji: '🥉' },
    silver:  { next: 'gold',    progress: (user?.completedCampaigns || 0) / 20 * 100, emoji: '🥈' },
    gold:    { next: 'diamond', progress: (user?.completedCampaigns || 0) / 50 * 100, emoji: '🥇' },
    diamond: { next: null,      progress: 100, emoji: '💎' },
  }
  const tier = tierInfo[user?.tier] || tierInfo.bronze

  return (
    <div className="p-6 lg:p-10 min-h-screen">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-[1px] bg-orange-500" />
          <span className={label}>Creator Dashboard</span>
        </div>
        <h1 className={`text-3xl lg:text-4xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Welcome, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className={`text-sm font-light mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Here's your earning overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(s => (
          <div key={s.label} className={card}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{s.icon}</span>
              {loading && <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />}
            </div>
            <p className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{s.value}</p>
            <p className={`${label} mt-1`}>{s.label}</p>
            <p className={`text-[10px] mt-2 ${s.accent}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Orders */}
        <div className={`lg:col-span-2 rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-base font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Recent Orders</h2>
            <Link to="/creator/orders" className={`text-xs uppercase tracking-widest transition-colors ${isDark ? 'text-zinc-500 hover:text-orange-400' : 'text-zinc-400 hover:text-orange-500'} flex items-center gap-1`}>
              View all <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <span className="text-4xl mb-3">📭</span>
              <p className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>No orders yet</p>
              <p className={`text-xs mt-1 mb-4 ${muted}`}>Browse the catalog to find campaigns to join</p>
              <Link to="/creator/catalog" className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-medium uppercase tracking-widest hover:bg-orange-600 transition-all">
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(o => (
                <div key={o._id} className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-black/[0.02] border border-black/5'}`}>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl flex-shrink-0">{o.image || '📦'}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{o.product}</p>
                    <p className={`text-xs ${muted}`}>{o.brand} · {o.orderId}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>৳{o.total?.toLocaleString()}</p>
                    <p className="text-xs text-emerald-400">+৳{o.cashbackAmount?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Tier */}
          <div className={`rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
            <h2 className={`text-base font-medium tracking-tight mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Tier Progress</h2>
            <div className="flex items-center gap-3 mb-5">
              <div className="text-3xl">{tier.emoji}</div>
              <div>
                <p className={`text-sm font-medium capitalize ${isDark ? 'text-white' : 'text-zinc-900'}`}>{user?.tier || 'Bronze'} Creator</p>
                {tier.next && <p className={muted}>Complete campaigns to level up</p>}
              </div>
            </div>
            <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all" style={{ width: `${Math.min(100, tier.progress)}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              <span className={`capitalize ${muted}`}>{user?.tier || 'Bronze'}</span>
              {tier.next && <span className={`capitalize ${muted}`}>{tier.next}</span>}
            </div>
          </div>

          {/* Recent Activity */}
          <div className={`rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
            <h2 className={`text-base font-medium tracking-tight mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-8 rounded-2xl border border-dashed ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                <span className="text-3xl mb-2">🕐</span>
                <p className={`text-xs ${muted}`}>No activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="text-lg">{a.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{a.text}</p>
                      <p className={`text-[10px] ${muted}`}>{a.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className={`rounded-3xl p-5 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
            <h2 className={`text-base font-medium tracking-tight mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/creator/catalog',     label: 'Shop',        icon: '🛍️' },
                { to: '/creator/submit-post', label: 'Submit Post', icon: '📱' },
                { to: '/creator/wallet',      label: 'Wallet',      icon: '💳' },
                { to: '/creator/leaderboard', label: 'Rankings',    icon: '🏆' },
              ].map(q => (
                <Link key={q.to} to={q.to}
                  className={`p-3 rounded-xl text-center transition-all ${isDark ? 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]' : 'bg-black/[0.02] border border-black/5 hover:bg-black/[0.05]'}`}>
                  <p className="text-xl mb-1">{q.icon}</p>
                  <p className={`text-[10px] font-medium uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{q.label}</p>
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
