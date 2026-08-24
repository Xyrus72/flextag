import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShieldCheck, AtSign, UserPlus } from 'lucide-react'
import { runInstagramAudit } from '../../services/instagram'

/**
 * Brand tool: vet ANY public Instagram account with the same engine that
 * verifies FlexTag posts — health score, fake-follower estimate, engagement.
 * Useful even for collabs a brand runs outside FlexTag.
 */
const panel = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24, backdropFilter: 'blur(20px)' }

const gradeColor = (g) => ({ A: '#4ade80', B: '#a3e635', C: '#facc15', D: '#fb923c', F: '#f87171' }[String(g || '').charAt(0)] || '#a78bfa')

const Kpi = ({ label, value, sub, color = '#fff' }) => (
  <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
    <p style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.03em', marginBottom: 4 }}>{value}</p>
    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>{label}</p>
    {sub && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{sub}</p>}
  </div>
)

const CreatorAudit = () => {
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)   // { audit, cached }

  const run = async () => {
    const username = handle.replace(/^@/, '').trim()
    if (!username || busy) return
    setBusy(true); setError(''); setResult(null)
    try {
      setResult(await runInstagramAudit({ username }))
    } catch (err) {
      setError(err.response?.data?.message || 'Audit failed — try again in a minute.')
    } finally { setBusy(false) }
  }

  const audit = result?.audit
  const profile = audit?.profile || {}
  const metrics = audit?.metrics || {}
  const health = audit?.health || {}
  const audience = audit?.audience || {}
  const eligibility = audit?.eligibility || {}

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Brand Tools</span></div>
        <h1 className="page-title">Creator Audit</h1>
        <p className="page-subtitle">Vet any public Instagram account before working with them — the same engine that verifies FlexTag posts. Works for collabs outside FlexTag too.</p>
      </div>

      {/* Search */}
      <div style={{ ...panel, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <AtSign size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={handle} onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && run()}
              placeholder="instagram handle, e.g. sunnahskin.bd"
              className="field-input" style={{ paddingLeft: 38 }}
            />
          </div>
          <button onClick={run} disabled={busy || !handle.trim()} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 22px' }}>
            {busy
              ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Auditing…</>
              : <><Search size={14} /> Run Audit</>}
          </button>
        </div>
        {busy && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '12px 0 0' }}>Pulling the profile, recent posts and a follower sample — this can take up to a minute.</p>}
        {error && <p style={{ fontSize: 13, color: '#f87171', margin: '12px 0 0' }}>{error}</p>}
      </div>

      {audit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Profile header */}
          <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
              {profile.profilePicUrl
                ? <img src={profile.profilePicUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
                : '👤'}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>{profile.fullName || `@${audit.username}`}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                @{audit.username}
                {profile.isVerified && <span style={{ color: '#67e8f9' }}> · verified</span>}
                {profile.isPrivate && <span style={{ color: '#fb923c' }}> · private</span>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 24, textAlign: 'center' }}>
              {[['Followers', profile.followers], ['Following', profile.following], ['Posts', profile.posts]].map(([l, v]) => (
                <div key={l}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{(Number(v) || 0).toLocaleString()}</p>
                  <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Verdict banner */}
          <div style={{
            padding: '14px 18px', borderRadius: 14,
            background: eligibility.eligible ? 'rgba(34,197,94,0.08)' : 'rgba(251,146,60,0.08)',
            border: `1px solid ${eligibility.eligible ? 'rgba(34,197,94,0.25)' : 'rgba(251,146,60,0.25)'}`,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <ShieldCheck size={18} color={eligibility.eligible ? '#4ade80' : '#fb923c'} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0, flex: 1 }}>
              {eligibility.eligible
                ? 'This account meets FlexTag creator standards.'
                : `Flagged: ${(eligibility.reasons || []).join(' · ') || 'does not meet creator standards.'}`}
            </p>
            <Link to="/brand/invite" style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <UserPlus size={13} /> Invite to a campaign →
            </Link>
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
            <Kpi label="Health Score" value={`${health.score ?? '—'}/100`} sub={health.grade ? `Grade ${health.grade}` : ''} color={gradeColor(health.grade)} />
            <Kpi label="Fake Followers" value={audience.fakeFollowerPct != null ? `${audience.fakeFollowerPct}%` : '—'}
              sub={audience.sampleSize ? `${audience.sampleSize} sampled · ${audience.quality || ''}` : 'no sample available'}
              color={audience.fakeFollowerPct > 25 ? '#f87171' : audience.fakeFollowerPct > 12 ? '#facc15' : '#4ade80'} />
            <Kpi label="Engagement" value={metrics.engagementRate != null ? `${metrics.engagementRate}%` : '—'} sub={metrics.postsAnalyzed ? `${metrics.postsAnalyzed} posts analyzed` : ''} color="#f9a8d4" />
            <Kpi label="Avg Likes" value={(Number(metrics.avgLikes) || 0).toLocaleString()} sub={metrics.avgComments != null ? `${Number(metrics.avgComments).toLocaleString()} avg comments` : ''} color="#67e8f9" />
            <Kpi label="Posting Cadence" value={metrics.postsPerWeek != null ? `${metrics.postsPerWeek}/wk` : '—'}
              sub={metrics.daysSinceLastPost != null ? `last post ${metrics.daysSinceLastPost}d ago` : ''} color="#a78bfa" />
          </div>

          {/* Health flags */}
          {Array.isArray(health.flags) && health.flags.length > 0 && (
            <div style={panel}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>⚠️ Things to know</h2>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {health.flags.map((f, i) => <li key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{typeof f === 'string' ? f : f.label || f.message}</li>)}
              </ul>
            </div>
          )}

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            Audited {audit.fetchedAt ? new Date(audit.fetchedAt).toLocaleString() : 'just now'}{result.cached ? ' (cached — refreshes hourly)' : ''}. Data from public Instagram profiles.
          </p>
        </div>
      )}
    </div>
  )
}

export default CreatorAudit
