import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShieldCheck, Users, TrendingUp, Activity, ExternalLink } from 'lucide-react'
import { getPortfolio } from '../../services/users'

const isNum = (n) => n != null && n !== '' && !Number.isNaN(Number(n))
const compact = (n) => {
  if (!isNum(n)) return '—'
  const v = Number(n)
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k'
  return v.toLocaleString()
}
const TIER_COLOR = { platinum: '#a78bfa', gold: '#f59e0b', silver: '#94a3b8', bronze: '#cd7f32' }

const Stat = ({ icon: Icon, label, value, color }) => (
  <div style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.06)' }}>
    <Icon size={16} style={{ color, margin: '0 auto 6px', display: 'block' }} />
    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{value}</p>
    <p style={{ margin: '2px 0 0', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.35)' }}>{label}</p>
  </div>
)

const CreatorPortfolio = () => {
  const { handle } = useParams()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    let ok = true
    getPortfolio(handle)
      .then(d => { if (ok) { setData(d); setError('') } })
      .catch(e => { if (ok) setError(e.response?.status === 404 ? 'notfound' : 'error') })
      .finally(() => { if (ok) setLoading(false) })
    return () => { ok = false }
  }, [handle])

  const shell = (children) => (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <div className="aurora-bg" />
      <header style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', maxWidth: 960, margin: '0 auto' }}>
        <Link to="/"><img src="/products/flextag-logo.png" alt="FlexTag" style={{ height: 30 }} /></Link>
        <Link to="/register?role=creator" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 13 }}>Join FlexTag</Link>
      </header>
      <main style={{ position: 'relative', zIndex: 10, maxWidth: 960, margin: '0 auto', padding: '20px 24px 60px' }}>{children}</main>
    </div>
  )

  if (loading) return shell(<div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner" /></div>)
  if (error || !data) return shell(
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div style={{ fontSize: 46, marginBottom: 12 }}>{error === 'notfound' ? '🔍' : '⚠️'}</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{error === 'notfound' ? 'Creator not found' : 'Something went wrong'}</h1>
      <p style={{ color: 'rgba(var(--ink-rgb),0.5)', marginTop: 8 }}>No FlexTag creator with the handle <strong style={{ color: '#a78bfa' }}>@{handle}</strong>.</p>
      <Link to="/" className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 20, padding: '10px 20px' }}>← Back to FlexTag</Link>
    </div>
  )

  const { creator, posts } = data
  const tierC = TIER_COLOR[creator.tier] || '#7c3aed'

  return shell(
    <>
      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 32, overflow: 'hidden', boxShadow: '0 0 30px rgba(124,58,237,0.3)' }}>
          {creator.avatar ? <img src={creator.avatar} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (creator.name?.[0]?.toUpperCase() || '?')}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{creator.name}</h1>
            {creator.igVerified && <span className="badge badge-success"><ShieldCheck size={12} /> Verified</span>}
            {creator.tier && <span style={{ fontSize: 11, fontWeight: 700, color: tierC, background: `${tierC}1f`, border: `1px solid ${tierC}44`, padding: '2px 10px', borderRadius: 20, textTransform: 'capitalize' }}>{creator.tier}</span>}
          </div>
          {creator.instagramHandle && (
            <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: '#a78bfa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              @{creator.instagramHandle} <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 34 }}>
        <Stat icon={Users} label="Followers" value={compact(creator.followersCount)} color="#06b6d4" />
        <Stat icon={TrendingUp} label="Engagement" value={isNum(creator.engagementRate) ? creator.engagementRate + '%' : '—'} color="#ec4899" />
        {isNum(creator.healthScore) && <Stat icon={Activity} label="Health Score" value={Math.round(creator.healthScore)} color="#22c55e" />}
        <Stat icon={ShieldCheck} label="Campaigns" value={compact(creator.completedCampaigns)} color="#7c3aed" />
      </div>

      {/* Verified work */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Verified collaborations</h2>
      <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)', marginBottom: 18 }}>Real posts, verified by FlexTag, with live engagement</p>
      {posts.length === 0 ? (
        <div className="empty-state"><p>📸</p><p>No verified posts yet</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))', gap: 14 }}>
          {posts.map(p => (
            <a key={p._id} href={p.permalink} target="_blank" rel="noreferrer" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(var(--ink-rgb),0.06)', background: 'rgba(var(--ink-rgb),0.02)', textDecoration: 'none', display: 'block' }}>
              <div style={{ aspectRatio: '1 / 1', background: 'var(--bg-2)', position: 'relative' }}>
                {p.thumbnail ? <img src={p.thumbnail} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, opacity: 0.4 }}>📸</div>}
                {p.mediaType && <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 5, background: 'rgba(0,0,0,0.6)', color: '#fff' }}>{p.mediaType}</span>}
              </div>
              <div style={{ padding: 10 }}>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(var(--ink-rgb),0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.brand || p.product || 'Collaboration'}</p>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'rgba(var(--ink-rgb),0.4)', marginTop: 4 }}>
                  <span>❤ {p.likes == null ? '—' : compact(p.likes)}</span>
                  <span>💬 {compact(p.comments)}</span>
                  {p.views != null && <span>▶ {compact(p.views)}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: 40, textAlign: 'center', padding: '28px 20px', borderRadius: 20, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Want to earn cashback like {creator.name?.split(' ')[0]}?</p>
        <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.5)', margin: '6px 0 16px' }}>Shop products you love, post about them, earn 30–70% back.</p>
        <Link to="/register?role=creator" className="btn-primary" style={{ textDecoration: 'none', padding: '11px 24px' }}>Start earning on FlexTag →</Link>
      </div>
    </>
  )
}

export default CreatorPortfolio
