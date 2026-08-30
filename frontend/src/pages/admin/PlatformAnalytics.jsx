import { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { getAdminAnalytics } from '../../services/admin'

const COLORS = ['bg-pink-500','bg-violet-500','bg-blue-500','bg-emerald-500','bg-yellow-500','bg-orange-500']

const PlatformAnalytics = () => {
  const [period, setPeriod] = useState('6mo')
  const [data, setData]     = useState({ monthlyGMV: [], monthlyCreators: [], monthlyCampaigns: [], categoryBreakdown: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminAnalytics()
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const monthlyData = data.monthlyGMV || []
  const maxGmv = Math.max(...monthlyData.map(m => m.value || 0), 1)
  const totalGMV = monthlyData.reduce((s, m) => s + (m.value || 0), 0)
  const totalCategories = (data.categoryBreakdown || []).reduce((s, c) => s + c.count, 0)

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Analytics</span></div>
        <h1 className="page-title">Platform Analytics</h1>
        <p className="page-subtitle">Historical trends and performance metrics</p>
      </div>

      <div className="flex justify-end mb-6">
        <div className="flex bg-white/5 rounded-xl p-1">
          {['3mo', '6mo', '1yr'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${period === p ? 'bg-violet-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* GMV Chart */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-6">Monthly GMV (৳)</h2>
        {loading ? (
          <div className="flex justify-center py-10"><div className="spinner" /></div>
        ) : monthlyData.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm">No transactions recorded yet</div>
        ) : (
          <div className="flex items-end gap-3 h-48">
            {monthlyData.slice(-6).map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-zinc-400 font-semibold">৳{m.value >= 1000 ? (m.value / 1000).toFixed(1) + 'K' : m.value}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-cyan-500 hover:opacity-80 transition-all cursor-pointer"
                  style={{ height: `${(m.value / maxGmv) * 100}%`, minHeight: '4px' }} />
                <span className="text-xs text-zinc-600">{m.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly growth table */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Monthly Breakdown</h2>
          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner" /></div>
          ) : monthlyData.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">No data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/5">
                  {['Month', 'GMV (৳)', 'Creators', 'Campaigns'].map(h =>
                    <th key={h} className="text-left text-xs text-zinc-500 font-semibold uppercase tracking-wider px-3 py-3">{h}</th>
                  )}
                </tr></thead>
                <tbody>
                  {monthlyData.slice(-6).map((m, i) => {
                    const creatorRow = (data.monthlyCreators || [])[i]
                    const campRow    = (data.monthlyCampaigns || [])[i]
                    return (
                      <tr key={m.month} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-3 py-3 text-sm text-white font-medium">{m.month}</td>
                        <td className="px-3 py-3 text-sm text-zinc-300">৳{(m.value || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-sm text-zinc-300">{creatorRow?.value || 0}</td>
                        <td className="px-3 py-3 text-sm text-emerald-400 font-semibold">{campRow?.value || 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Category Distribution</h2>
          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner" /></div>
          ) : (data.categoryBreakdown || []).length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">No campaign categories yet</div>
          ) : (
            <div className="space-y-4">
              {(data.categoryBreakdown || []).map((c, i) => {
                const share = totalCategories > 0 ? Math.round((c.count / totalCategories) * 100) : 0
                return (
                  <div key={c._id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{c._id}</span>
                      <span className="text-xs text-zinc-400">{share}% ({c.count} campaigns)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full rounded-full ${COLORS[i % COLORS.length]} transition-all`} style={{ width: `${share}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {totalGMV > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
              <p className="text-sm font-bold text-violet-400 mb-1 flex items-center gap-1.5"><TrendingUp size={14} strokeWidth={1.75} /> Total Platform GMV</p>
              <p className="text-xl font-extrabold text-white">৳{totalGMV.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlatformAnalytics
