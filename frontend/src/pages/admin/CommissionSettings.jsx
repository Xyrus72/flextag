import React, { useState } from 'react'

const CommissionSettings = () => {
  const [settings, setSettings] = useState({
    commissionRate: 10, listingFee: 500, featuredFee: 2000,
    minWithdrawal: 500, retentionDays: 7, maxCashback: 70,
  })
  const [changelog, setChangelog] = useState([
    { date: '2026-06-25 14:30', field: 'Commission Rate', from: '8%', to: '10%', by: 'Rafiq Ahmed' },
    { date: '2026-06-20 09:15', field: 'Featured Placement Fee', from: '৳1,500', to: '৳2,000', by: 'Rafiq Ahmed' },
    { date: '2026-06-15 16:45', field: 'Min Withdrawal', from: '৳300', to: '৳500', by: 'Rafiq Ahmed' },
  ])
  const [editing, setEditing] = useState(false)
  const [tempSettings, setTempSettings] = useState(settings)

  const saveSettings = () => {
    const changes = []
    Object.keys(settings).forEach(k => {
      if (settings[k] !== tempSettings[k]) {
        changes.push({ date: new Date().toISOString().slice(0, 16).replace('T', ' '), field: k, from: String(settings[k]), to: String(tempSettings[k]), by: 'Rafiq Ahmed' })
      }
    })
    setChangelog([...changes, ...changelog])
    setSettings(tempSettings)
    setEditing(false)
  }

  const fields = [
    { key: 'commissionRate', label: 'Commission Rate (%)', desc: 'Platform commission from each cashback payout', suffix: '%', icon: '💰' },
    { key: 'listingFee', label: 'Listing Fee per Campaign (৳)', desc: 'Flat fee charged when a brand creates a campaign', suffix: '৳', icon: '📋' },
    { key: 'featuredFee', label: 'Featured Placement Fee (৳)', desc: 'Fee for premium product placement in catalog', suffix: '৳', icon: '⭐' },
    { key: 'minWithdrawal', label: 'Min Withdrawal Threshold (৳)', desc: 'Minimum balance required for creator cashout', suffix: '৳', icon: '🏦' },
    { key: 'retentionDays', label: 'Default Retention Period', desc: 'Days a post must stay live for cashback release', suffix: 'days', icon: '📅' },
    { key: 'maxCashback', label: 'Max Cashback Rate (%)', desc: 'Maximum cashback percentage brands can offer', suffix: '%', icon: '📊' },
  ]

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Commission & Fee Settings</h1>
          <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-bold border border-orange-500/20">★ CORE</span>
        </div>
        <p className="text-zinc-500">Configure platform revenue model and operational parameters</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Platform Settings</h2>
            {!editing ? (
              <button onClick={() => { setTempSettings(settings); setEditing(true) }} className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/20 hover:bg-orange-500/20 transition-all">Edit Settings</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg bg-white/5 text-zinc-400 text-xs font-semibold border border-white/5">Cancel</button>
                <button onClick={saveSettings} className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 hover:bg-emerald-500/25 transition-all">Save Changes</button>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{f.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.label}</p>
                    <p className="text-[10px] text-zinc-600">{f.desc}</p>
                  </div>
                </div>
                {editing ? (
                  <input type="number" value={tempSettings[f.key]} onChange={e => setTempSettings({ ...tempSettings, [f.key]: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-lg font-bold focus:border-orange-500 outline-none mt-2" />
                ) : (
                  <p className="text-2xl font-extrabold text-white mt-2">
                    {f.suffix === '৳' && '৳'}{settings[f.key].toLocaleString()}{f.suffix === '%' && '%'}{f.suffix === 'days' && ' days'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Change Log</h2>
          <div className="space-y-3">
            {changelog.map((c, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <p className="text-sm font-medium text-white">{c.field}</p>
                <p className="text-xs text-zinc-500 mt-1">{c.from} → <span className="text-orange-400">{c.to}</span></p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-zinc-600">{c.by}</span>
                  <span className="text-[10px] text-zinc-600">{c.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommissionSettings
