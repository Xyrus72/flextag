import { useState, useEffect, useCallback } from 'react'
import { Hourglass, Megaphone, Banknote, BarChart3, CheckCircle2 } from 'lucide-react'
import { getAdminFinancial } from '../../services/admin'
import { getPlatformFloat, confirmBankTransfer } from '../../services/brandWallet'

const FinancialDashboard = () => {
  const [data, setData]     = useState({ campaignEscrow: [], totalEscrow: 0, commissionRevenue: 0, upcomingPayouts: [] })
  const [loading, setLoading] = useState(true)
  // Brand funding — the money brands have actually put in, against what the
  // platform still owes creators.
  const [float, setFloat]   = useState(null)
  const [busyId, setBusyId] = useState(null)

  const loadFloat = useCallback(() => getPlatformFloat().then(setFloat).catch(() => {}), [])

  useEffect(() => {
    getAdminFinancial()
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
    loadFloat()
  }, [loadFloat])

  const confirmTransfer = async (entry) => {
    if (!window.confirm(`Confirm you can see ৳${entry.amount.toLocaleString()} from ${entry.brandId?.companyName || entry.brandId?.name || 'this brand'} on the statement?`)) return
    setBusyId(entry._id)
    try { await confirmBankTransfer(entry._id); await loadFloat() } catch { /* surfaced by the row staying */ }
    finally { setBusyId(null) }
  }

  const { campaignEscrow, totalEscrow, commissionRevenue, upcomingPayouts } = data

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Finance</span></div>
        <h1 className="page-title">Financial Health Dashboard</h1>
        <p className="page-subtitle">Real-time cashback liability and platform solvency</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Escrow',      value: `৳${(totalEscrow || 0).toLocaleString()}`,                                  Icon: Hourglass, color: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: 'var(--amber-ink)' },
          { label: 'Active Campaigns',  value: String(campaignEscrow.length),                                              Icon: Megaphone, color: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.25)',  text: 'var(--cyan-ink)' },
          { label: 'Upcoming Payouts',  value: String(upcomingPayouts.reduce((s, u) => s + u.payouts, 0)),                  Icon: Banknote,  color: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)', text: 'var(--violet-ink)' },
          { label: 'Commission Income', value: `৳${(commissionRevenue || 0).toLocaleString()}`,                            Icon: BarChart3, color: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)',  text: 'var(--green-ink)' },
        ].map(s => (
          <div key={s.label} className="p-5 rounded-2xl" style={{ background: s.color, border: `1px solid ${s.border}` }}>
            <span style={{ display: 'inline-flex', width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <s.Icon size={18} strokeWidth={1.75} style={{ color: s.text }} />
            </span>
            <p className="text-2xl font-extrabold text-white tnum">{loading ? '—' : s.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Brand funding ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Brand Funding</h2>
            <p className="text-xs text-zinc-500">Money brands have put in, against what has been paid out on their behalf.</p>
          </div>
          {float && (
            <div className="text-right">
              <p className={`text-2xl font-extrabold tnum ${float.float >= (data.totalEscrow || 0) ? 'text-emerald-400' : 'text-yellow-400'}`}>
                ৳{(float.float || 0).toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500">held for campaigns</p>
            </div>
          )}
        </div>

        {!float ? (
          <p className="text-sm text-zinc-500">No brand funding recorded yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                { l: 'Funded',   v: float.funded,   c: 'text-emerald-400' },
                { l: 'Spent',    v: float.spent,    c: 'text-violet-400' },
                { l: 'Refunded', v: float.refunded, c: 'text-cyan-400' },
                { l: 'Fees',     v: float.fees,     c: 'text-yellow-400' },
              ].map(m => (
                <div key={m.l} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                  <p className={`text-lg font-bold tnum ${m.c}`}>৳{(m.v || 0).toLocaleString()}</p>
                  <p className="text-xs text-zinc-500">{m.l}</p>
                </div>
              ))}
            </div>

            {float.pendingTransfers?.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-bold text-white mb-3">Bank transfers awaiting confirmation</p>
                <div className="space-y-2">
                  {float.pendingTransfers.map(t => (
                    <div key={t._id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-sm text-white">{t.brandId?.companyName || t.brandId?.name || 'Brand'}</p>
                        <p className="text-xs text-zinc-500">{t.desc} · {new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-bold text-yellow-400 tnum">৳{t.amount.toLocaleString()}</span>
                      <button className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}
                        disabled={busyId === t._id} onClick={() => confirmTransfer(t)}>
                        {busyId === t._id ? 'Confirming…' : 'Confirm received'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {float.balances?.length > 0 && (
              <div>
                <p className="text-sm font-bold text-white mb-3">Balances (lowest first)</p>
                <div className="space-y-2">
                  {float.balances.slice(0, 6).map(b => (
                    <div key={b.brandId} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                      <span className="text-sm text-zinc-300">{b.name}</span>
                      <span className={`text-sm font-bold tnum ${b.balance <= 0 ? 'text-red-400' : b.balance < 2000 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                        ৳{b.balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Escrow by campaign */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Cashback Liability by Campaign</h2>
          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner" /></div>
          ) : campaignEscrow.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-white/10">
              <CheckCircle2 size={28} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 10 }} />
              <p className="text-sm text-zinc-400">No pending escrow</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaignEscrow.map((d, i) => {
                const pct = d.budget > 0 ? Math.round((d.escrow / d.budget) * 100) : 0
                const risk = pct > 80 ? 'high' : pct > 60 ? 'medium' : 'normal'
                const riskColors = { high: 'text-red-400 bg-red-500/10 border-red-500/20', medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', normal: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
                return (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{d.campaign}</p>
                        <p className="text-xs text-zinc-500">{d.brand} · {d.creators} creators</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${riskColors[risk]}`}>{risk}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <span className="text-xs text-zinc-400 w-20 text-right tnum">৳{d.escrow.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Solvency + upcoming */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Solvency Status</h2>

          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner" /></div>
          ) : (
            <>
              <div className={`p-5 rounded-2xl ${commissionRevenue >= totalEscrow ? 'bg-emerald-500/5 border border-emerald-500/15' : 'bg-red-500/5 border border-red-500/15'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${commissionRevenue >= totalEscrow ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  <p className={`text-sm font-bold ${commissionRevenue >= totalEscrow ? 'text-emerald-400' : 'text-red-400'}`}>
                    {commissionRevenue >= totalEscrow ? 'Platform solvent' : 'Potential shortfall'}
                  </p>
                </div>
                <p className="text-xs text-zinc-500">
                  {commissionRevenue >= totalEscrow
                    ? 'Commission income covers projected escrow obligations.'
                    : `Escrow (৳${totalEscrow.toLocaleString()}) exceeds revenue (৳${commissionRevenue.toLocaleString()}). Review campaigns.`}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-white mb-3">Upcoming Payouts</p>
                {upcomingPayouts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-white/10">
                    <p className="text-xs text-zinc-500">No upcoming payouts in the next 4 weeks</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingPayouts.slice(0, 4).map((w, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                        <span className="text-sm text-zinc-300">Week {w._id?.week || i + 1}</span>
                        <p className="text-sm font-bold text-violet-400">{w.payouts} payouts pending</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default FinancialDashboard
