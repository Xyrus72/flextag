import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const stats = [
  { label: 'Total Earned', value: '৳34,500', change: '+৳2,340 this week', icon: '💰', accent: 'text-emerald-400' },
  { label: 'Active Campaigns', value: '3', change: '2 expiring soon', icon: '📢', accent: 'text-orange-400' },
  { label: 'Completed Posts', value: '18', change: '2 pending review', icon: '📱', accent: 'text-blue-400' },
  { label: 'Avg Engagement', value: '4.7%', change: '+0.3% this month', icon: '❤️', accent: 'text-pink-400' },
]

const recentActivity = [
  { action: 'Cashback approved', detail: 'GlowUp Matte Lipstick · ৳660', time: '2h ago', type: 'credit' },
  { action: 'Post submitted', detail: 'Vitamin C Serum campaign', time: '5h ago', type: 'pending' },
  { action: 'Order delivered', detail: 'ORD-3301 · Matte Lipstick Set', time: '1d ago', type: 'delivery' },
  { action: 'Tier upgraded', detail: 'Bronze → Silver 🎉', time: '3d ago', type: 'tier' },
]

const campaigns = [
  { name: 'GlowUp Matte Lipstick', brand: 'GlowUp Cosmetics', cashback: 50, deadline: '2026-07-10', status: 'active', progress: 65 },
  { name: 'Vitamin C Serum', brand: 'SkinLab BD', cashback: 65, deadline: '2026-07-05', status: 'active', progress: 30 },
  { name: 'Sunscreen SPF50+', brand: 'SkinLab BD', cashback: 70, deadline: '2026-07-15', status: 'pending', progress: 0 },
]

const tierInfo = { bronze: { next: 'silver', progress: 70, needed: 3 }, silver: { next: 'gold', progress: 45, needed: 7 }, gold: { next: 'diamond', progress: 28, needed: 22 }, diamond: { next: null, progress: 100, needed: 0 } }

const CreatorDashboard = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const tier = tierInfo[user?.tier] || tierInfo.gold

  const card = `rounded-3xl p-6 transition-all duration-300 ${isDark ? 'glass-panel card-hover' : 'bg-white border border-black/5 hover:border-black/10 hover:-translate-y-0.5 shadow-sm hover:shadow-md'}`
  const label = `text-[10px] uppercase tracking-widest font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`
  const muted = `text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`

  return (
    <div className="p-6 lg:p-10 min-h-screen">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-[1px] bg-orange-500" />
          <span className={label}>Creator Dashboard</span>
        </div>
        <h1 className={`text-3xl lg:text-4xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className={`text-sm font-light mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Here's your earning overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className={card}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{s.icon}</span>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{s.value}</p>
            <p className={`${label} mt-1`}>{s.label}</p>
            <p className={`text-[10px] mt-2 ${s.accent}`}>{s.change}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Campaigns */}
        <div className={`lg:col-span-2 rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-base font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Active Campaigns</h2>
            <Link to="/creator/catalog" className={`text-xs uppercase tracking-widest transition-colors ${isDark ? 'text-zinc-500 hover:text-orange-400' : 'text-zinc-400 hover:text-orange-500'} flex items-center gap-1`}>
              Browse more <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
          <div className="space-y-4">
            {campaigns.map(c => (
              <div key={c.name} className={`p-4 rounded-2xl border transition-all ${isDark ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]' : 'border-black/5 bg-black/[0.01] hover:bg-black/[0.03]'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{c.name}</p>
                    <p className={muted}>{c.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-400">{c.cashback}%</p>
                    <p className={muted}>cashback</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 h-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <div className={`h-full rounded-full transition-all ${c.status === 'pending' ? 'bg-zinc-500/50' : 'bg-gradient-to-r from-orange-500 to-pink-500'}`}
                      style={{ width: `${c.progress}%` }} />
                  </div>
                  <span className={muted}>{c.progress}%</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'}`}>{c.status}</span>
                </div>
                <p className={`text-[10px] mt-2 ${muted}`}>Deadline: {c.deadline}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Tier Progress */}
          <div className={`rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
            <h2 className={`text-base font-medium tracking-tight mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Tier Progress</h2>
            <div className="flex items-center gap-3 mb-5">
              <div className="text-3xl">{user?.tier === 'diamond' ? '💎' : user?.tier === 'gold' ? '🥇' : user?.tier === 'silver' ? '🥈' : '🥉'}</div>
              <div>
                <p className={`text-sm font-medium capitalize ${isDark ? 'text-white' : 'text-zinc-900'}`}>{user?.tier} Creator</p>
                {tier.next && <p className={muted}>{tier.needed} campaigns to {tier.next}</p>}
              </div>
            </div>
            <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all" style={{ width: `${tier.progress}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              <span className={`capitalize ${muted}`}>{user?.tier}</span>
              {tier.next && <span className={`capitalize ${muted}`}>{tier.next}</span>}
            </div>
          </div>

          {/* Recent Activity */}
          <div className={`rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
            <h2 className={`text-base font-medium tracking-tight mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.map((a, i) => {
                const dot = a.type === 'credit' ? 'bg-emerald-400' : a.type === 'pending' ? 'bg-orange-400' : a.type === 'tier' ? 'bg-pink-400' : 'bg-blue-400'
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{a.action}</p>
                      <p className={muted}>{a.detail}</p>
                    </div>
                    <span className={`text-[10px] flex-shrink-0 ${muted}`}>{a.time}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className={`rounded-3xl p-5 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
            <h2 className={`text-base font-medium tracking-tight mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/creator/catalog', label: 'Shop', icon: '🛍️' },
                { to: '/creator/submit-post', label: 'Submit Post', icon: '📱' },
                { to: '/creator/wallet', label: 'Wallet', icon: '💳' },
                { to: '/creator/leaderboard', label: 'Rankings', icon: '🏆' },
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
