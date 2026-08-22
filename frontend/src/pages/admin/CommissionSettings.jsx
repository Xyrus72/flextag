import { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '../../services/admin'
import { useAuth } from '../../context/AuthContext'

// min/max mirror the clamps applied server-side (backend/utils/settings.js) so the
// page never displays a value the backend silently ignores.
const platformFields = [
  { key: 'commissionRate', label: 'Commission Rate (%)',           desc: 'Platform commission from each cashback payout', suffix: '%', icon: '💰', min: 0, max: 100 },
  { key: 'listingFee',     label: 'Listing Fee per Campaign (৳)',  desc: 'Flat fee charged when a brand creates a campaign', suffix: '৳', icon: '📋', min: 0 },
  { key: 'featuredFee',    label: 'Featured Placement Fee (৳)',    desc: 'Fee for premium product placement in catalog', suffix: '৳', icon: '⭐', min: 0 },
  { key: 'minWithdrawal',  label: 'Min Withdrawal Threshold (৳)',  desc: 'Minimum balance required for creator cashout', suffix: '৳', icon: '🏦', min: 0 },
  { key: 'retentionDays',  label: 'Default Retention Period',      desc: 'Days a post must stay live for cashback release', suffix: 'days', icon: '📅', min: 0, max: 365 },
  { key: 'maxCashback',    label: 'Max Cashback Rate (%)',         desc: 'Maximum cashback percentage brands can offer', suffix: '%', icon: '📊', min: 0, max: 100 },
]

// Instagram audit / post-verification settings. Seeded by the backend; all values
// are numeric — 'on/off' settings are stored as 1 / 0.
const instagramFields = [
  { key: 'igMinFollowers',     label: 'IG Minimum Followers',          desc: 'Creators need at least this many Instagram followers to register', suffix: 'followers', icon: '📸', min: 0 },
  { key: 'igBlockPrivate',     label: 'IG Block Private Accounts',     desc: '1 = private Instagram accounts cannot register, 0 = allow', suffix: 'on/off', icon: '🔒' },
  { key: 'igPrecheckEnforce',  label: 'IG Enforce Check at Signup',    desc: '1 = block ineligible accounts at signup, 0 = only warn', suffix: 'on/off', icon: '🛂' },
  { key: 'igAutoApprovePosts', label: 'IG Auto-approve Verified Posts', desc: '1 = release cashback automatically when every post check passes (ownership-verified creators only), 0 = manual review', suffix: 'on/off', icon: '⚡' },
  { key: 'igAuditTtlDays',     label: 'IG Audit Freshness',            desc: 'Re-use a cached audit for this many days before re-fetching', suffix: 'days', icon: '🗓️', min: 0, max: 365 },
  { key: 'igFollowerSample',   label: 'IG Follower Sample Size',       desc: 'Followers sampled for the fake-follower estimate (0–500)', suffix: 'followers', icon: '🧪', min: 0, max: 500 },
  { key: 'igPostsToFetch',     label: 'IG Posts to Analyze',           desc: 'Recent posts pulled per audit (6–60)', suffix: 'posts', icon: '🗂️', min: 6, max: 60 },
]

const clampField = (f, raw) => {
  let n = Number(raw)
  if (!Number.isFinite(n)) n = f.min ?? 0
  if (f.min != null) n = Math.max(f.min, n)
  if (f.max != null) n = Math.min(f.max, n)
  return n
}

// Single list used by the diff/save logic below.
const fields = [...platformFields, ...instagramFields]

// View-mode display: prefix '৳', suffix '%', 'On'/'Off' for toggles, otherwise "<n> <unit>".
const formatValue = (f, raw) => {
  const v = Number(raw) || 0
  if (f.suffix === 'on/off') return v ? 'On' : 'Off'
  if (f.suffix === '৳') return `৳${v.toLocaleString()}`
  if (f.suffix === '%') return `${v.toLocaleString()}%`
  return `${v.toLocaleString()} ${f.suffix}`
}

const CommissionSettings = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState({})
  const [tempSettings, setTempSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
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
    setError('')
    try {
      // Clamp numeric fields to the server's bounds, then build the diff
      const next = { ...tempSettings }
      fields.forEach(f => { if (f.suffix !== 'on/off' && next[f.key] !== undefined) next[f.key] = clampField(f, next[f.key]) })
      const changes = []
      const updates = {}
      fields.forEach(f => {
        if (String(settings[f.key]) !== String(next[f.key])) {
          changes.push({ date: new Date().toLocaleString(), field: f.label, from: String(settings[f.key]), to: String(next[f.key]), by: user?.name })
          updates[f.key] = next[f.key]
        }
      })
      if (Object.keys(updates).length > 0) {
        await updateSettings(updates)
        setSettings(next)
        setTempSettings(next)
        setChangelog(prev => [...changes, ...prev])
      }
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const renderCard = (f) => (
    <div key={f.key} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{f.icon}</span>
        <div>
          <p className="text-sm font-semibold text-white">{f.label}</p>
          <p className="text-[10px] text-zinc-600">{f.desc}</p>
        </div>
      </div>
      {!editing ? (
        <p className="text-2xl font-extrabold text-white mt-2">{formatValue(f, settings[f.key])}</p>
      ) : f.suffix === 'on/off' ? (
        <div className="flex gap-2 mt-2">
          {[[1, 'On'], [0, 'Off']].map(([val, lbl]) => (
            <button key={lbl} type="button"
              onClick={() => setTempSettings(prev => ({ ...prev, [f.key]: val }))}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all ${(Number(tempSettings[f.key]) || 0) === val ? 'bg-violet-500/15 text-violet-300 border-violet-500/30' : 'bg-white/5 text-zinc-500 border-white/10 hover:bg-white/10'}`}>
              {lbl}
            </button>
          ))}
        </div>
      ) : (
        <input type="number" value={tempSettings[f.key] ?? 0} min={f.min} max={f.max}
          onChange={e => { const v = e.target.value; setTempSettings(prev => ({ ...prev, [f.key]: v === '' ? '' : Number(v) })) }}
          onBlur={() => setTempSettings(prev => ({ ...prev, [f.key]: clampField(f, prev[f.key]) }))}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-lg font-bold focus:border-violet-500 outline-none mt-2" />
      )}
    </div>
  )

  return (
    <div className="page-root">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Commission & Fee Settings</h1>
          <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-bold border border-violet-500/20">★ CORE</span>
        </div>
        <p className="text-zinc-500">Configure platform revenue model and operational parameters</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Platform Settings</h2>
              {!editing ? (
                <button onClick={() => { setTempSettings(settings); setEditing(true) }}
                  className="px-4 py-2 rounded-lg bg-violet-500/10 text-violet-400 text-xs font-semibold border border-violet-500/20 hover:bg-violet-500/20 transition-all">
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

            {error && <p className="text-xs text-red-400 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{error}</p>}

            <div className="grid sm:grid-cols-2 gap-4">
              {platformFields.map(renderCard)}
            </div>

            <div className="flex items-center gap-3 mt-8 mb-4">
              <span className="text-lg">📸</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Instagram</h3>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {instagramFields.map(renderCard)}
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
                    <p className="text-xs text-zinc-500 mt-1">{c.from} → <span className="text-violet-400">{c.to}</span></p>
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
