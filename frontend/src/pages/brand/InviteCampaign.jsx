import { useState, useEffect } from 'react'
import { getUsers } from '../../services/users'
import api from '../../services/api'
import { ShieldCheck, Users, AtSign, TrendingUp, Search } from 'lucide-react'

const isNum = (n) => n != null && n !== '' && !Number.isNaN(Number(n))
const compact = (n) => {
  if (!isNum(n)) return '—'
  const v = Number(n)
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k'
  return String(v)
}
const normHandle = (h) => String(h || '').replace(/^@/, '').trim()

const gradeColor = (s) => (s >= 85 ? '#22c55e' : s >= 70 ? '#4ade80' : s >= 55 ? '#f59e0b' : '#ef4444')
const qualityOf = (pct) => (pct == null ? { label: '—', color: 'rgba(var(--ink-rgb),0.4)' }
  : pct < 15 ? { label: 'Clean', color: '#22c55e' } : pct < 30 ? { label: 'Fair', color: '#f59e0b' } : { label: 'Risky', color: '#ef4444' })

const HealthDot = ({ score }) => {
  if (!isNum(score)) return null
  const c = gradeColor(Number(score))
  return <span style={{ fontSize: 11, fontWeight: 700, color: c, background: `${c}18`, border: `1px solid ${c}38`, padding: '2px 8px', borderRadius: 8 }}>Health {Math.round(Number(score))}</span>
}

const InviteCampaign = () => {
  const [creators, setCreators] = useState([])
  const [loading, setLoading]   = useState(true)
  const [invited, setInvited]   = useState({})
  const [sending, setSending]   = useState({})
  const [search, setSearch]     = useState('')
  const [minFollowers, setMinFollowers] = useState(0)
  const [maxFake, setMaxFake]   = useState(100)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sort, setSort]         = useState('health')

  useEffect(() => {
    getUsers({ role: 'creator' })
      .then(d => setCreators(d.users || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = creators
    .filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || normHandle(c.instagramHandle).toLowerCase().includes(search.toLowerCase()))
    .filter(c => (c.followersCount || 0) >= minFollowers)
    .filter(c => c.igFakeFollowerPct == null || c.igFakeFollowerPct <= maxFake)
    .filter(c => !verifiedOnly || c.igVerified)
    .sort((a, b) => {
      if (sort === 'followers') return (b.followersCount || 0) - (a.followersCount || 0)
      if (sort === 'earnings')  return (b.totalEarnings || 0) - (a.totalEarnings || 0)
      return (b.igHealthScore || 0) - (a.igHealthScore || 0) // health default
    })

  const invite = async (c) => {
    setSending(s => ({ ...s, [c._id]: true }))
    try {
      await api.post(`/api/users/${c._id}/invite`, {})
      setInvited(inv => ({ ...inv, [c._id]: true }))
    } catch { /* keep button active to retry */ } finally {
      setSending(s => ({ ...s, [c._id]: false }))
    }
  }

  const invitedCount = Object.values(invited).filter(Boolean).length

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Brand · Creators</span></div>
        <h1 className="page-title">Discover Creators</h1>
        <p className="page-subtitle">Find verified creators by audience quality and reach — invite them to your campaigns</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(var(--ink-rgb),0.35)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or @handle…"
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 12, background: 'rgba(var(--ink-rgb),0.05)', border: '1px solid rgba(var(--ink-rgb),0.1)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={minFollowers} onChange={e => setMinFollowers(Number(e.target.value))} className="disc-select">
          <option value={0}>Any followers</option><option value={1000}>1k+</option><option value={5000}>5k+</option><option value={10000}>10k+</option><option value={50000}>50k+</option>
        </select>
        <select value={maxFake} onChange={e => setMaxFake(Number(e.target.value))} className="disc-select">
          <option value={100}>Any audience</option><option value={30}>≤30% fake</option><option value={15}>≤15% fake</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="disc-select">
          <option value="health">Sort: Health</option><option value="followers">Sort: Followers</option><option value="earnings">Sort: Earnings</option>
        </select>
        <button type="button" onClick={() => setVerifiedOnly(v => !v)} style={{
          padding: '9px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          border: `1px solid ${verifiedOnly ? 'rgba(34,197,94,0.4)' : 'rgba(var(--ink-rgb),0.1)'}`,
          background: verifiedOnly ? 'rgba(34,197,94,0.12)' : 'rgba(var(--ink-rgb),0.04)', color: verifiedOnly ? '#4ade80' : 'rgba(var(--ink-rgb),0.5)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}><ShieldCheck size={13} /> Verified only</button>
      </div>
      <style>{`.disc-select{padding:10px 12px;border-radius:12px;background:rgba(var(--ink-rgb),0.05);border:1px solid rgba(var(--ink-rgb),0.1);color:#fff;font-size:13px;outline:none;cursor:pointer}`}</style>

      <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)', marginBottom: 14 }}>
        {filtered.length} creator{filtered.length !== 1 ? 's' : ''}{invitedCount > 0 ? ` · ${invitedCount} invited` : ''}
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>🔍</p><p>No creators match these filters</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          {filtered.map(c => {
            const q = qualityOf(c.igFakeFollowerPct)
            const handle = normHandle(c.instagramHandle)
            return (
              <div key={c._id} className="stat-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, overflow: 'hidden' }}>
                    {c.avatar ? <img src={c.avatar} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.name?.[0]?.toUpperCase() || '?')}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                      {c.igVerified && <ShieldCheck size={14} style={{ color: '#22c55e', flexShrink: 0 }} />}
                    </div>
                    {handle && <a href={`https://instagram.com/${handle}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><AtSign size={11} /> @{handle}</a>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '14px 0' }}>
                  <div><p style={{ margin: 0, fontSize: 10, color: 'rgba(var(--ink-rgb),0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}><Users size={10} style={{ display: 'inline', marginRight: 3 }} />Followers</p><p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{compact(c.followersCount)}</p></div>
                  <div><p style={{ margin: 0, fontSize: 10, color: 'rgba(var(--ink-rgb),0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}><TrendingUp size={10} style={{ display: 'inline', marginRight: 3 }} />Engagement</p><p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{isNum(c.engagementRate) ? c.engagementRate + '%' : '—'}</p></div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  <HealthDot score={c.igHealthScore} />
                  {c.igFakeFollowerPct != null && <span style={{ fontSize: 11, fontWeight: 700, color: q.color, background: `${q.color}18`, border: `1px solid ${q.color}38`, padding: '2px 8px', borderRadius: 8 }}>{q.label} · {Math.round(c.igFakeFollowerPct)}% fake</span>}
                  {c.completedCampaigns > 0 && <span className="badge badge-neutral">{c.completedCampaigns} campaigns</span>}
                  {c.tier && <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{c.tier}</span>}
                </div>

                <button type="button" onClick={() => invite(c)} disabled={sending[c._id] || invited[c._id]}
                  className={invited[c._id] ? 'btn-ghost' : 'btn-primary'} style={{ width: '100%', padding: 10, fontSize: 13 }}>
                  {invited[c._id] ? '✓ Invited' : sending[c._id] ? 'Sending…' : 'Invite to campaign'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default InviteCampaign
