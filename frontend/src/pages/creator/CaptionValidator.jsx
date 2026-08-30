import { useState, useEffect, useMemo, useRef } from 'react'
import { getOrders } from '../../services/orders'
import { checkCaption, validateCaption, getAiStatus } from '../../services/ai'

/**
 * Caption checker — a live preview of post verification.
 *
 * As the creator types, the draft runs through the SAME rule engine that will
 * judge the real post at submission time (backend previewDraft → buildChecks),
 * so a green check here is that check going green later — nothing is
 * approximated. The AI review is a second, optional layer: quality feedback
 * and a rewrite, never the compliance verdict.
 */

// Demo campaigns used only when the creator has no delivered orders yet.
const DEMO = [
  { id: 'demo-glowup',   label: 'GlowUp Matte Lipstick (demo)',   hashtags: ['#GlowUpMatte', '#FlextagCreator'], handles: ['@glowupbd'] },
  { id: 'demo-urbanfit', label: 'UrbanFit Gym Tank (demo)',       hashtags: ['#UrbanFitBD', '#GymWear'],         handles: ['@urbanfitbd'] },
  { id: 'demo-skinlab',  label: 'SkinLab Vitamin C Serum (demo)', hashtags: ['#SkinLabBD', '#VitaminC'],         handles: ['@skinlabbd'] },
]

const FORMATS = [
  { id: '',         label: 'Not sure yet' },
  { id: 'reel',     label: 'Reel' },
  { id: 'post',     label: 'Photo post' },
  { id: 'carousel', label: 'Carousel' },
]

const card = { background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 16, padding: 24 }
const muted = (a) => `rgba(var(--ink-rgb),${a})`

// pass → ✓ · required failure → ✗ · optional miss → – · deferred/unknown → ·
const glyphOf = (c) => (c.passed === true ? { mark: '✓', color: '#4ade80' }
  : c.passed === false ? (c.required ? { mark: '✗', color: '#f87171' } : { mark: '–', color: '#fbbf24' })
  : { mark: '·', color: muted(0.35) })

const CheckRow = ({ check, dim }) => {
  const glyph = glyphOf(check)
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, opacity: dim ? 0.65 : 1 }}>
      <span style={{ color: glyph.color, fontWeight: 700, flexShrink: 0, width: 14, textAlign: 'center', fontSize: 14 }}>{glyph.mark}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ fontSize: 13.5, fontWeight: check.passed === false && check.required ? 600 : 500, color: 'var(--text)' }}>{check.label}</span>
        {check.detail && (check.passed !== true || !dim) && (
          <span style={{ display: 'block', fontSize: 12, color: muted(0.45), lineHeight: 1.5 }}>{check.detail}</span>
        )}
      </span>
    </li>
  )
}

const ScoreRing = ({ score }) => {
  const r = 34, c = 2 * Math.PI * r
  const s = Math.max(0, Math.min(100, Number(score) || 0))
  const color = s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
      <svg viewBox="0 0 80 80" width="84" height="84" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(var(--ink-rgb),0.08)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - s / 100)} style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.2,0,0,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="tnum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{Math.round(s)}</span>
        <span style={{ fontSize: 9.5, color: muted(0.4) }}>/ 100</span>
      </div>
    </div>
  )
}

const CaptionValidator = () => {
  const [caption, setCaption]   = useState('')
  const [orders, setOrders]     = useState([])
  const [selected, setSelected] = useState('')
  const [planned, setPlanned]   = useState('')
  const [preview, setPreview]   = useState(null)   // live deterministic check
  const [ai, setAi]             = useState(null)   // { configured, model }
  const [review, setReview]     = useState(null)   // AI validate result
  const [reviewing, setReviewing] = useState(false)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)
  const reqSeq = useRef(0)      // late live-check responses must not overwrite newer ones

  useEffect(() => {
    getAiStatus().then(setAi).catch(() => setAi({ configured: false }))
    getOrders({ status: 'delivered' })
      .then(d => {
        const list = (d.orders || []).filter(o => o.campaignId)
        setOrders(list)
        setSelected(list[0]?._id || DEMO[0].id)
      })
      .catch(() => setSelected(DEMO[0].id))
  }, [])

  const options = useMemo(() => ([
    ...orders.map(o => ({ id: o._id, label: `${o.product} — ${o.brand}`, order: o })),
    ...DEMO.map(d => ({ id: d.id, label: d.label, demo: d })),
  ]), [orders])
  const current = useMemo(() => options.find(o => o.id === selected), [options, selected])

  const bodyFor = (extra = {}) => current?.demo
    ? { hashtags: current.demo.hashtags, handles: current.demo.handles, mediaType: planned || undefined, ...extra }
    : { orderId: current?.id, mediaType: planned || undefined, ...extra }

  // Live check: every draft change re-runs the real verification rules (debounced).
  useEffect(() => {
    if (!current) return
    const seq = ++reqSeq.current
    const t = setTimeout(() => {
      checkCaption(current.demo
        ? { caption, hashtags: current.demo.hashtags, handles: current.demo.handles, mediaType: planned || undefined }
        : { caption, orderId: current.id, mediaType: planned || undefined })
        .then(d => { if (seq === reqSeq.current) setPreview(d) })
        .catch(() => {})
    }, caption ? 450 : 0)
    return () => clearTimeout(t)
  }, [caption, planned, current])

  const runReview = async () => {
    if (!caption.trim() || reviewing) return
    setReviewing(true); setError(''); setReview(null)
    try {
      setReview(await validateCaption(bodyFor({ caption })))
    } catch (e) {
      setError(e.response?.data?.message || 'Could not review right now. Please try again.')
    } finally {
      setReviewing(false)
    }
  }

  const copyImproved = async () => {
    try { await navigator.clipboard?.writeText(review.improvedCaption) } catch { /* clipboard unavailable */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const foundSet = new Set([...(preview?.found?.hashtags || []), ...(preview?.found?.mentions || [])].map(x => x.toLowerCase()))
  const requiredChips = [...(preview?.required?.hashtags || []), ...(preview?.required?.mentions || [])]
  const liveChecks = preview?.checks || []
  const laterChecks = preview?.postTimeChecks || []

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Creator tools</span></div>
        <h1 className="page-title">Caption checker</h1>
        <p className="page-subtitle">Your draft runs through the same checks as post verification — fix misses before you post, not after.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Draft ── */}
        <div style={card}>
          <label className="field-label">Campaign</label>
          <select value={selected} onChange={e => { setSelected(e.target.value); setReview(null) }} className="field-input" style={{ marginBottom: 16 }}>
            {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>

          <label className="field-label">Planned format</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {FORMATS.map(f => (
              <button key={f.id} onClick={() => setPlanned(f.id)} style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 150ms cubic-bezier(0.2,0,0,1), color 150ms cubic-bezier(0.2,0,0,1)',
                background: planned === f.id ? 'var(--purple)' : muted(0.04),
                color: planned === f.id ? '#fff' : muted(0.5),
                border: `1px solid ${planned === f.id ? 'var(--purple)' : muted(0.08)}`,
              }}>{f.label}</button>
            ))}
          </div>

          <label className="field-label">Your caption</label>
          <textarea value={caption} onChange={e => { setCaption(e.target.value); setReview(null) }} rows={9}
            placeholder="Write or paste your draft here — checks update as you type…"
            className="field-input" style={{ resize: 'vertical', lineHeight: 1.6 }} />
          <p className="tnum" style={{ fontSize: 12, color: muted(0.35), margin: '6px 0 0' }}>{caption.length} characters</p>

          <div style={{ marginTop: 18 }}>
            <p style={{ fontSize: 12.5, fontWeight: 500, color: muted(0.5), margin: '0 0 8px' }}>Required in this campaign</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {requiredChips.map(chip => {
                const present = foundSet.has(chip.toLowerCase())
                // Chips carry content (a literal hashtag), not a status word — undo the badge's uppercase.
                const asContent = { textTransform: 'none', letterSpacing: 0, fontSize: 12 }
                return (
                  <span key={chip} className={`badge ${present ? 'badge-success' : ''}`}
                    style={present ? asContent : { ...asContent, background: muted(0.04), color: muted(0.45), border: `1px dashed ${muted(0.2)}` }}>
                    {present ? '✓ ' : ''}{chip}
                  </span>
                )
              })}
              {requiredChips.length === 0 && <span style={{ fontSize: 12.5, color: muted(0.35) }}>No specific hashtags or mentions required.</span>}
            </div>
          </div>
        </div>

        {/* ── Verification preview ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Verification preview</h2>
              {preview && (
                <span className={`badge ${preview.wouldPass ? 'badge-success' : 'badge-error'}`}>
                  {preview.wouldPass ? 'Caption would pass' : 'Would not pass yet'}
                </span>
              )}
            </div>

            {!preview ? (
              <p style={{ fontSize: 13, color: muted(0.4), margin: 0 }}>Pick a campaign to see its checks.</p>
            ) : (
              <>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                  {liveChecks.map(c => <CheckRow key={c.key} check={c} />)}
                </ul>
                {laterChecks.length > 0 && (
                  <>
                    <p style={{ fontSize: 12.5, fontWeight: 500, color: muted(0.4), margin: '18px 0 8px' }}>Checked when you post</p>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
                      {laterChecks.map(c => <CheckRow key={c.key} check={c} dim />)}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>

          {/* ── AI review ── */}
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>AI review</h2>
            <p style={{ fontSize: 12.5, color: muted(0.45), margin: '0 0 14px', lineHeight: 1.55 }}>
              A second opinion on the writing itself — authenticity, clarity, claims — plus a rewrite in your voice.
            </p>

            <button onClick={runReview} disabled={!caption.trim() || reviewing || ai?.configured === false}
              className="btn-primary" style={{ width: '100%', padding: 12 }}>
              {reviewing ? 'Reviewing…' : 'Review my caption'}
            </button>
            {ai?.configured === false && (
              <p style={{ fontSize: 12, color: muted(0.4), margin: '10px 0 0', lineHeight: 1.55 }}>
                The requirement checks above are always on. The AI review needs an Anthropic API key on the server (ANTHROPIC_API_KEY).
              </p>
            )}
            {error && <p style={{ fontSize: 12.5, color: '#f87171', margin: '10px 0 0' }}>{error}</p>}

            {review && (
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 14 }}>
                  <ScoreRing score={review.score} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                      {review.score >= 80 ? 'Strong caption' : review.score >= 60 ? 'Nearly there' : 'Needs work'}
                    </p>
                    <p style={{ fontSize: 12.5, color: muted(0.45), margin: '3px 0 0', lineHeight: 1.5 }}>
                      {review.source === 'claude'
                        ? `Quality ${Math.round(review.qualityScore)}/100 · requirements ${review.requirementsMet ? 'met' : 'missing'}`
                        : 'Requirements only — AI feedback unavailable right now.'}
                    </p>
                  </div>
                </div>

                {(review.issues || []).length > 0 && (
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
                    {review.issues.map((it, i) => (
                      <li key={i} style={{ fontSize: 12.5, color: muted(0.6), lineHeight: 1.5, display: 'flex', gap: 8 }}>
                        <span style={{ color: '#fbbf24', flexShrink: 0 }}>–</span><span>{it.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(review.suggestions || []).length > 0 && (
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
                    {review.suggestions.map((s, i) => (
                      <li key={i} style={{ fontSize: 12.5, color: muted(0.6), lineHeight: 1.5, display: 'flex', gap: 8 }}>
                        <span style={{ color: '#67e8f9', flexShrink: 0 }}>→</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {review.improvedCaption && review.improvedCaption.trim() !== caption.trim() && (
                  <div style={{ padding: 14, borderRadius: 12, background: muted(0.03), border: `1px solid ${muted(0.08)}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: muted(0.5) }}>
                        {review.source === 'claude' ? 'Suggested rewrite' : 'With the missing requirements added'}
                      </span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={copyImproved} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                        <button onClick={() => { setCaption(review.improvedCaption); setReview(null) }} className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
                          Use it
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{review.improvedCaption}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CaptionValidator
