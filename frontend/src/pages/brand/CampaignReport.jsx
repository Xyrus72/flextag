import { useState, useEffect, useCallback } from 'react'
import { getCampaigns } from '../../services/campaigns'
import { getCampaignReport, shareCampaignReport, unshareCampaignReport } from '../../services/campaigns'
import { API_URL } from '../../config'
import { useAuth } from '../../context/AuthContext'

/**
 * The campaign report card.
 *
 * Every number a brand shows their boss — verified posts, engagement, cost per
 * engagement — computed from real rows and snapshots, nothing self-reported.
 * The share button mints a tokenized public page: the case study that closes
 * the next campaign (and, honestly, the next brand for FlexTag).
 */
const Stat = ({ value, label, accent }) => (
  <div style={{
    padding: 18, borderRadius: 16, textAlign: 'center',
    background: accent ? 'rgba(6,182,212,0.08)' : 'rgba(var(--ink-rgb),0.03)',
    border: `1px solid ${accent ? 'rgba(6,182,212,0.4)' : 'rgba(var(--ink-rgb),0.07)'}`,
  }}>
    <p style={{ fontSize: 24, fontWeight: 900, color: accent ? '#67e8f9' : 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.4)', margin: '6px 0 0' }}>{label}</p>
  </div>
)

const n = (v) => Number(v || 0).toLocaleString()

const CampaignReport = () => {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [report, setReport] = useState(null)
  const [shareToken, setShareToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    getCampaigns()
      .then(d => {
        if (!alive) return
        const mine = (d.campaigns || []).filter(c => String(c.brandId?._id || c.brandId) === String(user?._id))
        setCampaigns(mine)
        if (mine.length) setSelectedId(String(mine[0]._id))
        else setLoading(false)
      })
      .catch(() => setLoading(false))
    return () => { alive = false }
  }, [user?._id])

  const load = useCallback(() => {
    if (!selectedId) return undefined
    return getCampaignReport(selectedId)
      .then(d => { setReport(d.report); setShareToken(d.shareToken) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedId])

  useEffect(() => { load() }, [load])

  const changeCampaign = (id) => { setLoading(true); setSelectedId(id) }

  const shareUrl = shareToken ? `${API_URL}/share/report/${shareToken}` : null

  const toggleShare = async () => {
    setBusy(true)
    try {
      if (shareToken) {
        await unshareCampaignReport(selectedId)
        setShareToken(null)
      } else {
        const d = await shareCampaignReport(selectedId)
        setShareToken(d.shareToken)
      }
    } catch { /* row state speaks for itself */ } finally { setBusy(false) }
  }

  const copyLink = () => {
    if (!shareUrl) return
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }

  const r = report

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Proof</span></div>
        <h1 className="page-title">Campaign Report</h1>
        <p className="page-subtitle">
          Verified posts, real engagement, cost per result — nothing self-reported. Share it as a page anyone can open.
        </p>
      </div>

      {campaigns.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 24 }}>
          <select value={selectedId} onChange={e => changeCampaign(e.target.value)} className="field-select" style={{ maxWidth: 340 }}>
            {campaigns.map(c => (
              <option key={c._id} value={c._id} style={{ background: 'var(--bg-2)' }}>{c.product} ({c.status})</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {shareUrl && (
              <>
                <a href={shareUrl} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: '9px 16px', fontSize: 12, textDecoration: 'none' }}>Open public page</a>
                <button onClick={copyLink} className="btn-primary" style={{ padding: '9px 16px', fontSize: 12 }}>
                  {copied ? 'Copied ✓' : 'Copy link'}
                </button>
              </>
            )}
            <button onClick={toggleShare} disabled={busy} style={{
              padding: '9px 16px', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              background: shareToken ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.15)',
              color: shareToken ? '#f87171' : '#a78bfa',
              border: `1px solid ${shareToken ? 'rgba(239,68,68,0.25)' : 'rgba(124,58,237,0.3)'}`,
            }}>
              {busy ? 'Working…' : shareToken ? 'Revoke public link' : 'Make shareable'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : !campaigns.length ? (
        <div className="empty-state"><p style={{ fontSize: 28, marginBottom: 8 }}>📊</p><p>No campaigns yet — the report builds itself as one runs.</p></div>
      ) : !r ? (
        <div className="empty-state"><p>Could not load the report.</p></div>
      ) : (
        <>
          {/* The headline row — what a marketer compares vendors on */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
            <Stat value={n(r.posts.verified)} label="Verified posts" accent />
            <Stat value={n(r.engagement.engagements)} label="Engagements" />
            <Stat value={n(r.engagement.audienceReached)} label="Audience reached" />
            <Stat value={r.money.costPerEngagement == null ? '—' : `৳${r.money.costPerEngagement}`} label="Cost / engagement" accent />
            <Stat value={r.money.costPerPost == null ? '—' : `৳${n(r.money.costPerPost)}`} label="Cost / verified post" />
          </div>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr' }} className="lg:grid-cols-2">
            <div style={{ background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 20, padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}>Sales this campaign drove</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Stat value={n(r.orders.total)} label="Orders" />
                <Stat value={`৳${n(r.orders.gmv)}`} label="Product sales (GMV)" />
                <Stat value={n(r.orders.uniqueCreators)} label="Creators" />
                <Stat value={n(r.orders.returned)} label="Returns" />
              </div>
              <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(var(--ink-rgb),0.02)', fontSize: 13, color: 'rgba(var(--ink-rgb),0.55)', lineHeight: 1.7 }}>
                Spent ৳{n(r.money.spend)} in rewards + ৳{n(r.money.fees)} platform fee = <strong style={{ color: 'var(--text)' }}>৳{n(r.money.netSpend)}</strong> total,
                against ৳{n(r.orders.gmv)} of product sold and {n(r.engagement.engagements)} verified engagements.
              </div>
            </div>

            <div style={{ background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 20, padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}>Content quality</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Stat value={`${n(r.posts.stillLive)}/${n(r.posts.verified)}`} label="Still live" />
                <Stat value={n(r.posts.fromVerifiedCreators)} label="Identity-verified creators" />
                <Stat value={n(r.posts.autoApproved)} label="Machine-verified" />
                <Stat value={n(r.engagement.views)} label="Video views" />
              </div>
              <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)', lineHeight: 1.7 }}>
                Every post was fetched from Instagram and checked — hashtags, brand mentions, content type, account
                ownership — before any reward was released. Engagement is the snapshot at verification time.
              </p>
            </div>
          </div>

          {r.topPosts.length > 0 && (
            <div style={{ background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 20, padding: 24, marginTop: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}>Top posts</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {r.topPosts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(var(--ink-rgb),0.02)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 160 }}>
                      {p.creator}{p.handle ? <span style={{ color: 'rgba(var(--ink-rgb),0.35)', fontWeight: 400 }}> @{String(p.handle).replace(/^@/, '')}</span> : null}
                      {p.verified && <span className="badge badge-success" style={{ marginLeft: 8, fontSize: 9 }}>verified</span>}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.45)' }}>
                      {p.likes == null ? '—' : `${n(p.likes)} likes`} · {p.comments == null ? '—' : `${n(p.comments)} comments`}{p.views ? ` · ${n(p.views)} views` : ''}
                    </span>
                    {p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#67e8f9' }}>view ↗</a>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CampaignReport
