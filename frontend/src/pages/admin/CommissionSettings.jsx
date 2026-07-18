import React, { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '../../services/admin'
import { useAuth } from '../../context/AuthContext'

const fields = [
  { key: 'commissionRate', label: 'Commission Rate (%)',           desc: 'Platform commission from each cashback payout', suffix: '%', icon: '💰' },
  { key: 'listingFee',     label: 'Listing Fee per Campaign (৳)',  desc: 'Flat fee charged when a brand creates a campaign', suffix: '৳', icon: '📋' },
  { key: 'featuredFee',    label: 'Featured Placement Fee (৳)',    desc: 'Fee for premium product placement in catalog', suffix: '৳', icon: '⭐' },
  { key: 'minWithdrawal',  label: 'Min Withdrawal Threshold (৳)',  desc: 'Minimum balance required for creator cashout', suffix: '৳', icon: '🏦' },
  { key: 'retentionDays',  label: 'Default Retention Period',      desc: 'Days a post must stay live for cashback release', suffix: 'days', icon: '📅' },
  { key: 'maxCashback',    label: 'Max Cashback Rate (%)',         desc: 'Maximum cashback percentage brands can offer', suffix: '%', icon: '📊' },
]

const CommissionSettings = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState({})
  const [tempSettings, setTempSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [changelog, setChangelog] = useState([])

  useEffect(() => {
    getSettings()
      .then(d => {
        setSettings(d.settings || {})
        setTempSettings(d.settings || {})
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Build diff
      const changes = []
      const updates = {}
      fields.forEach(f => {
        if (String(settings[f.key]) !== String(tempSettings[f.key])) {
          changes.push({ date: new Date().toLocaleString(), field: f.label, from: String(settings[f.key]), to: String(tempSettings[f.key]), by: user?.name })
          updates[f.key] = tempSettings[f.key]
        }
      })
      if (Object.keys(updates).length > 0) {
        await updateSettings(updates)
        setSettings(tempSettings)
        setChangelog(prev => [...changes, ...prev])
      }
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Commission & Fee Settings</h1>
          <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-bold border border-orange-500/20">★ CORE</span>
        </div>
        <p className="text-zinc-500">Configure platform revenue model and operational parameters</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Platform Settings</h2>
              {!editing ? (
                <button onClick={() => { setTempSettings(settings); setEditing(true) }}
                  className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/20 hover:bg-orange-500/20 transition-all">
                  Edit Settings
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg bg-white/5 text-zinc-400 text-xs font-semibold border border-white/5">Cancel</button>
                  <button onClick={saveSettings} disabled={saving}
                    className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 hover:bg-emerald-500/25 transition-all disabled:opacity-40">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
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
                    <input type="number" value={tempSettings[f.key] || 0}
                      onChange={e => setTempSettings({ ...tempSettings, [f.key]: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-lg font-bold focus:border-orange-500 outline-none mt-2" />
                  ) : (
                    <p className="text-2xl font-extrabold text-white mt-2">
                      {f.suffix === '৳' && '৳'}{(settings[f.key] || 0).toLocaleString()}{f.suffix === '%' && '%'}{f.suffix === 'days' && ' days'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-5">Change Log</h2>
            {changelog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-white/10">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-xs text-zinc-500">No changes yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {changelog.slice(0, 10).map((c, i) => (
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CommissionSettings
