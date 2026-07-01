import React, { useState } from 'react'

const kpis = [
  { label: 'Total Posts', value: '342', change: '+28', icon: '📝' },
  { label: 'Total Reach', value: '1.2M', change: '+15%', icon: '👁️' },
  { label: 'Avg Engagement', value: '4.6%', change: '+0.3', icon: '❤️' },
  { label: 'Cost Per Engagement', value: '৳2.40', change: '-৳0.30', icon: '💰' },
  { label: 'Total Cashback Paid', value: '৳1.2M', change: 'This month', icon: '💸' },
  { label: 'ROI', value: '4.8x', change: '+0.3', icon: '📊' },
]

const campaignData = [
  { name: 'Matte Lipstick', posts: 89, likes: 12400, comments: 890, views: 45000, cashbackPaid: 53400, budget: 100000, status: 'active' },
  { name: 'Vitamin C Serum', posts: 124, likes: 18900, comments: 1250, views: 72000, cashbackPaid: 80600, budget: 100000, status: 'active' },
  { name: 'Face Wash Gel', posts: 67, likes: 8200, comments: 520, views: 28000, cashbackPaid: 26100, budget: 30000, status: 'completed' },
  { name: 'Sunscreen SPF50+', posts: 45, likes: 6800, comments: 410, views: 22000, cashbackPaid: 19250, budget: 50000, status: 'active' },
  { name: 'Hair Styling Clay', posts: 17, likes: 2100, comments: 180, views: 8500, cashbackPaid: 6085, budget: 25000, status: 'active' },
]

const monthlyData = [
  { month: 'Jan', posts: 42, reach: 180 },
  { month: 'Feb', posts: 58, reach: 220 },
  { month: 'Mar', posts: 71, reach: 310 },
  { month: 'Apr', posts: 63, reach: 280 },
  { month: 'May', posts: 89, reach: 420 },
  { month: 'Jun', posts: 102, reach: 520 },
]

const Analytics = () => {
  const [period, setPeriod] = useState('month')
  const maxReach = Math.max(...monthlyData.map(d => d.reach))

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Campaign Analytics</h1>
          <p className="text-zinc-500 mt-1">Real-time performance metrics & ROI</p>
        </div>
        <div className="flex bg-white/5 rounded-xl p-1">
          {['week', 'month', 'year'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${period === p ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{k.icon}</span>
              <span className="text-xs text-emerald-400 font-semibold">{k.change}</span>
            </div>
            <p className="text-2xl font-extrabold text-white">{k.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Chart (CSS bar chart) */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-6">Monthly Reach (K)</h2>
        <div className="flex items-end gap-3 h-48">
          {monthlyData.map(d => (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold">{d.reach}K</span>
              <div className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-pink-500 transition-all hover:from-orange-400 hover:to-pink-400"
                style={{ height: `${(d.reach / maxReach) * 100}%` }} />
              <span className="text-xs text-zinc-600">{d.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign breakdown */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h2 className="text-lg font-bold text-white mb-5">Campaign Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">
              {['Campaign', 'Posts', 'Likes', 'Comments', 'Reach', 'Cashback', 'Budget Used', 'Status'].map(h =>
                <th key={h} className="text-left text-xs text-zinc-500 font-semibold uppercase tracking-wider px-3 py-3">{h}</th>
              )}
            </tr></thead>
            <tbody>
              {campaignData.map(c => {
                const pct = Math.round((c.cashbackPaid / c.budget) * 100)
                return (
                  <tr key={c.name} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3 text-sm font-medium text-white">{c.name}</td>
                    <td className="px-3 py-3 text-sm text-zinc-300">{c.posts}</td>
                    <td className="px-3 py-3 text-sm text-zinc-300">{c.likes.toLocaleString()}</td>
                    <td className="px-3 py-3 text-sm text-zinc-300">{c.comments.toLocaleString()}</td>
                    <td className="px-3 py-3 text-sm text-zinc-300">{(c.views / 1000).toFixed(0)}K</td>
                    <td className="px-3 py-3 text-sm text-orange-400 font-semibold">৳{(c.cashbackPaid / 1000).toFixed(1)}K</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} /></div>
                        <span className="text-xs text-zinc-400 w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>{c.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Analytics
