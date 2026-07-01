import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const stats = [
  { label: 'Active Campaigns', value: '12', change: '+2 this week', icon: '📢' },
  { label: 'Total Creators', value: '156', change: '+14 new', icon: '👥' },
  { label: 'Cashback Disbursed', value: '৳1.2M', change: 'This month', icon: '💸' },
  { label: 'Avg. ROI', value: '4.8x', change: '+0.3 vs last', icon: '📊' },
]

const recentOrders = [
  { id: 'ORD-3301', creator: 'Tasnim Rahman', product: 'Matte Lipstick Set', total: 1200, status: 'pending' },
  { id: 'ORD-3302', creator: 'Priya Das', product: 'Vitamin C Serum', total: 950, status: 'shipped' },
  { id: 'ORD-3303', creator: 'Ayesha Karim', product: 'Face Wash Gel', total: 450, status: 'delivered' },
  { id: 'ORD-3304', creator: 'Nusrat Jahan', product: 'Matte Lipstick Set', total: 1200, status: 'pending' },
]

const topCreators = [
  { name: 'Priya Das', posts: 8, reach: '45K', er: 5.8, tier: '💎' },
  { name: 'Tasnim Rahman', posts: 5, reach: '28K', er: 4.7, tier: '🥇' },
  { name: 'Ayesha Karim', posts: 6, reach: '32K', er: 5.2, tier: '🥇' },
]

const statusConfig = { pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', shipped: 'bg-blue-500/10 text-blue-400 border-blue-500/20', delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }

const BrandDashboard = () => {
  const { user } = useAuth()
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
          <span className={label}>Brand Partner</span>
        </div>
        <h1 className={`text-3xl lg:text-4xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          {user?.companyName || 'Brand Dashboard'}
        </h1>
        <p className={`text-sm font-light mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Campaign performance overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className={card}>
            <span className="text-2xl block mb-4">{s.icon}</span>
            <p className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{s.value}</p>
            <p className={`${label} mt-1`}>{s.label}</p>
            <p className="text-[10px] text-emerald-400 mt-2">{s.change}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders table */}
        <div className={`lg:col-span-2 rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-base font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Recent Orders</h2>
            <Link to="/brand/orders" className={`text-xs uppercase tracking-widest transition-colors flex items-center gap-1 ${isDark ? 'text-zinc-500 hover:text-orange-400' : 'text-zinc-400 hover:text-orange-500'}`}>
              View all <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                  {['Order', 'Creator', 'Product', 'Total', 'Status'].map(h => (
                    <th key={h} className={`text-left ${label} pb-3 pr-4`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id} className={`border-b transition-colors ${isDark ? 'border-white/[0.03] hover:bg-white/[0.02]' : 'border-black/[0.03] hover:bg-black/[0.01]'}`}>
                    <td className={`py-3 pr-4 text-xs font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{o.id}</td>
                    <td className={`py-3 pr-4 text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{o.creator}</td>
                    <td className={`py-3 pr-4 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{o.product}</td>
                    <td className={`py-3 pr-4 text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>৳{o.total.toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border capitalize ${statusConfig[o.status]}`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Creators */}
        <div className={`rounded-3xl p-6 ${isDark ? 'glass-panel' : 'bg-white border border-black/5 shadow-sm'}`}>
          <h2 className={`text-base font-medium tracking-tight mb-6 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Top Creators</h2>
          <div className="space-y-3">
            {topCreators.map((c, i) => (
              <div key={c.name} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isDark ? 'border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04]' : 'border-black/[0.04] bg-black/[0.01] hover:bg-black/[0.03]'}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{c.name}</p>
                  <p className={muted}>{c.posts} posts · {c.reach}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg">{c.tier}</span>
                  <p className="text-[10px] text-emerald-400">{c.er}% ER</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/brand/analytics" className={`mt-5 flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs uppercase tracking-widest transition-all ${isDark ? 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-zinc-400 hover:text-white' : 'bg-black/[0.02] border border-black/5 hover:bg-black/[0.04] text-zinc-400 hover:text-zinc-900'}`}>
            Full Analytics
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default BrandDashboard
