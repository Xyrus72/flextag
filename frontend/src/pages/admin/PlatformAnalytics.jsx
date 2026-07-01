import React, { useState } from 'react'

const monthlyMetrics = [
  { month: 'Jan', gmv: 820, creators: 680, campaigns: 22, commission: 82 },
  { month: 'Feb', gmv: 950, creators: 780, campaigns: 28, commission: 95 },
  { month: 'Mar', gmv: 1100, creators: 920, campaigns: 34, commission: 110 },
  { month: 'Apr', gmv: 1050, creators: 980, campaigns: 31, commission: 105 },
  { month: 'May', gmv: 1350, creators: 1100, campaigns: 42, commission: 135 },
  { month: 'Jun', gmv: 1580, creators: 1247, campaigns: 48, commission: 158 },
]

const trendingCategories = [
  { name: 'Beauty', share: 38, growth: 12, color: 'bg-pink-500' },
  { name: 'Fashion', share: 28, growth: 8, color: 'bg-violet-500' },
  { name: 'Tech', share: 18, growth: 22, color: 'bg-blue-500' },
  { name: 'Lifestyle', share: 10, growth: -3, color: 'bg-emerald-500' },
  { name: 'Food', share: 6, growth: 45, color: 'bg-yellow-500' },
]

const PlatformAnalytics = () => {
  const [period, setPeriod] = useState('6mo')
  const maxGmv = Math.max(...monthlyMetrics.map(m => m.gmv))

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Platform Analytics</h1>
          <p className="text-zinc-500 mt-1">Historical trends and forecasting</p>
        </div>
        <div className="flex bg-white/5 rounded-xl p-1">
          {['3mo', '6mo', '1yr'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${period === p ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white' : 'text-zinc-500'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* GMV Chart */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-6">Monthly GMV (৳K)</h2>
        <div className="flex items-end gap-3 h-48">
          {monthlyMetrics.map(m => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold">৳{m.gmv}K</span>
              <div className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-pink-500 hover:opacity-80 transition-all cursor-pointer"
                style={{ height: `${(m.gmv / maxGmv) * 100}%` }} />
              <span className="text-xs text-zinc-600">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Growth metrics table */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Monthly Growth</h2>
          <table className="w-full">
            <thead><tr className="border-b border-white/5">
              {['Month', 'GMV', 'Creators', 'Campaigns', 'Commission'].map(h =>
                <th key={h} className="text-left text-xs text-zinc-500 font-semibold uppercase tracking-wider px-3 py-3">{h}</th>
              )}
            </tr></thead>
            <tbody>
              {monthlyMetrics.map(m => (
                <tr key={m.month} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-3 py-3 text-sm text-white font-medium">{m.month}</td>
                  <td className="px-3 py-3 text-sm text-zinc-300">৳{m.gmv}K</td>
                  <td className="px-3 py-3 text-sm text-zinc-300">{m.creators.toLocaleString()}</td>
                  <td className="px-3 py-3 text-sm text-zinc-300">{m.campaigns}</td>
                  <td className="px-3 py-3 text-sm text-emerald-400 font-semibold">৳{m.commission}K</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trending categories */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Trending Categories</h2>
          <div className="space-y-4">
            {trendingCategories.map(c => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{c.share}%</span>
                    <span className={`text-xs font-semibold ${c.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {c.growth >= 0 ? '↑' : '↓'}{Math.abs(c.growth)}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${c.color} transition-all`} style={{ width: `${c.share}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Forecast */}
          <div className="mt-6 p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
            <p className="text-sm font-bold text-violet-400 mb-1">📈 Forecast: July</p>
            <p className="text-xs text-zinc-400">Based on current trends, projected GMV: <span className="text-white font-bold">৳1,820K</span> (+15%). Food category expected to grow fastest.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlatformAnalytics
