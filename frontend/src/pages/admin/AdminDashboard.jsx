import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'

const kpis = [
  { label: 'Total GMV', value: '৳12.4M', change: '+18%', icon: '💰' },
  { label: 'Active Creators', value: '1,247', change: '+86 this week', icon: '👥' },
  { label: 'Active Campaigns', value: '48', change: '+5 new', icon: '📢' },
  { label: 'Verified Brands', value: '34', change: '3 pending', icon: '🏢' },
  { label: 'Cashback Liability', value: '৳2.8M', change: 'In escrow', icon: '⏳' },
  { label: 'Commission Revenue', value: '৳480K', change: '+22% MoM', icon: '📊' },
]

const alerts = [
  { text: '3 brand applications pending review', type: 'warn', link: '/admin/brand-verification' },
  { text: '2 dispute tickets awaiting resolution', type: 'error', link: '/admin/disputes' },
  { text: 'Post deletion detected for @nusrat.beauty', type: 'error', link: '/admin/disputes' },
  { text: 'Campaign "Summer Glow" at 92% budget cap', type: 'warn', link: '/admin/financial' },
]

const recentActions = [
  { text: 'Brand "FreshKart" verified by admin', time: '2h ago' },
  { text: 'Dispute #D-102 resolved — refund issued', time: '5h ago' },
  { text: 'Commission rate updated to 12%', time: '1d ago' },
  { text: 'New category "Home & Living" created', time: '2d ago' },
]

const AdminDashboard = () => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const card = `rounded-3xl p-6 transition-all ${isDark ? 'glass-panel card-hover' : 'bg-white border border-black/5 shadow-sm hover:shadow-md hover:-translate-y-0.5'}`
  const label = `text-[10px] uppercase tracking-widest font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`
  const muted = `text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`

  return (
    <div className="p-6 lg:p-10 min-h-screen">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-[1px] bg-orange-500" />
          <span className={label}>Admin Control</span>
        </div>
        <h1 className={`text-3xl lg:text-4xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Platform Dashboard</h1>
        <p className={`text-sm font-light mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Real-time platform health and management</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpis.map(s => (
          <div key={s.label} className={card}>
            <span className="text-2xl block mb-4">{s.icon}</span>
            <p className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{s.value}</p>
            <p className={`${label} mt-1`}>{s.label}</p>
            <p className="text-[10px] text-emerald-400 mt-2">{s.change}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className={`rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
          <h2 className={`text-base font-medium tracking-tight mb-6 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block mr-2 animate-pulse" />
            Active Alerts
          </h2>
          <div className="space-y-3">
            {alerts.map((a, i) => (
              <Link key={i} to={a.link} className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all no-underline ${isDark ? 'border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10' : 'border-black/[0.04] bg-black/[0.01] hover:bg-black/[0.03]'}`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.type === 'error' ? 'bg-red-400 animate-pulse' : 'bg-yellow-400'}`} />
                <p className={`text-xs flex-1 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{a.text}</p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={isDark ? 'text-zinc-600' : 'text-zinc-300'}><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Actions */}
        <div className={`rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
          <h2 className={`text-base font-medium tracking-tight mb-6 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Recent Actions</h2>
          <div className="space-y-4">
            {recentActions.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{a.text}</p>
                  <p className={`text-[10px] mt-0.5 ${muted}`}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick nav */}
          <div className={`mt-6 pt-6 border-t grid grid-cols-2 gap-2 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
            {[
              { to: '/admin/brand-verification', label: 'Verify Brands', icon: '✓' },
              { to: '/admin/disputes', label: 'Disputes', icon: '⚠' },
              { to: '/admin/financial', label: 'Financials', icon: '$' },
              { to: '/admin/analytics', label: 'Analytics', icon: '↗' },
            ].map(q => (
              <Link key={q.to} to={q.to}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-xs transition-all ${isDark ? 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-zinc-400 hover:text-white' : 'bg-black/[0.02] border border-black/5 hover:bg-black/[0.04] text-zinc-500 hover:text-zinc-900'}`}>
                <span className="font-bold">{q.icon}</span>
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
