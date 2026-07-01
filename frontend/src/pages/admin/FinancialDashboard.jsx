import React from 'react'

const escrowData = [
  { campaign: 'GlowUp Matte Lipstick', brand: 'GlowUp Cosmetics', escrow: 53400, budget: 100000, creators: 89, risk: 'normal' },
  { campaign: 'Vitamin C Serum', brand: 'SkinLab BD', escrow: 80600, budget: 100000, creators: 124, risk: 'high' },
  { campaign: 'UrbanFit Gym Collection', brand: 'UrbanFit BD', escrow: 12800, budget: 50000, creators: 32, risk: 'normal' },
  { campaign: 'TechNova Earbuds', brand: 'TechNova', escrow: 42350, budget: 75000, creators: 67, risk: 'medium' },
  { campaign: 'Sunscreen Summer', brand: 'SkinLab BD', escrow: 19250, budget: 50000, creators: 45, risk: 'normal' },
]

const weeklyProjections = [
  { week: 'Jul 1-7', payouts: 125000, commission: 12500 },
  { week: 'Jul 8-14', payouts: 98000, commission: 9800 },
  { week: 'Jul 15-21', payouts: 142000, commission: 14200 },
  { week: 'Jul 22-28', payouts: 88000, commission: 8800 },
]

const riskColors = { high: 'text-red-400 bg-red-500/10 border-red-500/20', medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', normal: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }

const FinancialDashboard = () => {
  const totalEscrow = escrowData.reduce((s, d) => s + d.escrow, 0)
  const totalBudget = escrowData.reduce((s, d) => s + d.budget, 0)
  const totalCommission = weeklyProjections.reduce((s, w) => s + w.commission, 0)
  const totalPayouts = weeklyProjections.reduce((s, w) => s + w.payouts, 0)

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Financial Health Dashboard</h1>
          <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-bold border border-orange-500/20">★ CRITICAL</span>
        </div>
        <p className="text-zinc-500">Real-time cashback liability and platform solvency</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Escrow', value: `৳${(totalEscrow / 1000).toFixed(0)}K`, icon: '⏳', color: 'from-yellow-500/15 to-amber-500/15', border: 'border-yellow-500/20' },
          { label: 'Total Budget Caps', value: `৳${(totalBudget / 1000).toFixed(0)}K`, icon: '🛡️', color: 'from-blue-500/15 to-cyan-500/15', border: 'border-blue-500/20' },
          { label: 'Projected Payouts', value: `৳${(totalPayouts / 1000).toFixed(0)}K`, icon: '💸', color: 'from-orange-500/15 to-pink-500/15', border: 'border-orange-500/20' },
          { label: 'Commission Income', value: `৳${(totalCommission / 1000).toFixed(0)}K`, icon: '📊', color: 'from-emerald-500/15 to-teal-500/15', border: 'border-emerald-500/20' },
        ].map(s => (
          <div key={s.label} className={`p-5 rounded-2xl bg-gradient-to-br ${s.color} border ${s.border}`}>
            <span className="text-2xl block mb-2">{s.icon}</span>
            <p className="text-2xl font-extrabold text-white">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Escrow by campaign */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Cashback Liability by Campaign</h2>
          <div className="space-y-4">
            {escrowData.map(d => {
              const pct = Math.round((d.escrow / d.budget) * 100)
              return (
                <div key={d.campaign} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{d.campaign}</p>
                      <p className="text-xs text-zinc-500">{d.brand} · {d.creators} creators</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${riskColors[d.risk]}`}>{d.risk}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-zinc-400 w-16 text-right">৳{(d.escrow / 1000).toFixed(0)}K/{(d.budget / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Weekly projections */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Projected Payouts (4 weeks)</h2>
          <div className="space-y-3 mb-6">
            {weeklyProjections.map(w => (
              <div key={w.week} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                <span className="text-sm text-zinc-300">{w.week}</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-orange-400">৳{(w.payouts / 1000).toFixed(0)}K payouts</p>
                  <p className="text-xs text-emerald-400">+৳{(w.commission / 1000).toFixed(1)}K commission</p>
                </div>
              </div>
            ))}
          </div>

          {/* Solvency indicator */}
          <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-bold text-emerald-400">Platform Solvent ✓</p>
            </div>
            <p className="text-xs text-zinc-500">Commission income covers projected escrow obligations. No campaigns flagged for budget overexposure.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinancialDashboard
