import { useState, useEffect } from 'react'
import { getOrders } from '../../services/orders'
import { validateCaption } from '../../services/ai'

// Demo campaigns used only when the creator has no delivered orders yet.
const DEMO = [
  { id: 'demo-glowup',   label: 'GlowUp Matte Lipstick (demo)',   hashtags: ['#GlowUpMatte', '#FlextagCreator'], handles: ['@glowupbd'] },
  { id: 'demo-urbanfit', label: 'UrbanFit Gym Tank (demo)',       hashtags: ['#UrbanFitBD', '#GymWear'],         handles: ['@urbanfitbd'] },
  { id: 'demo-skinlab',  label: 'SkinLab Vitamin C Serum (demo)', hashtags: ['#SkinLabBD', '#VitaminC'],         handles: ['@skinlabbd'] },
]

const splitStr = (v) => String(v || '').split(/[,\s]+/).map(s => s.trim()).filter(Boolean)

const scoreColor = (s) => (s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444')

const ScoreRing = ({ score }) => {
  const r = 34, c = 2 * Math.PI * r
  const s = Math.max(0, Math.min(100, Number(score) || 0))
  const color = scoreColor(s)
  return (
    <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
      <svg viewBox="0 0 80 80" width="88" height="88" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - s / 100)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{Math.round(s)}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>/ 100</span>
      </div>
    </div>
  )
}

const Chip = ({ text, tone }) => (
  <span className={`badge ${tone === 'bad' ? 'badge-error' : 'badge-success'}`} style={{ marginRight: 6, marginBottom: 6 }}>{text}</span>
)

const CaptionValidator = () => {
  const [caption, setCaption]   = useState('')
  const [orders, setOrders]     = useState([])
  const [selected, setSelected] = useState('')
  const [result, setResult]     = useState(null)
  const [checking, setChecking] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    getOrders({ status: 'delivered' })
      .then(d => {
        const list = (d.orders || []).filter(o => o.campaignId)
        setOrders(list)
        setSelected(list[0]?._id || DEMO[0].id)
      })
      .catch(() => setSelected(DEMO[0].id))
  }, [])

  const options = [
    ...orders.map(o => ({ id: o._id, label: `${o.product} — ${o.brand}`, order: o })),
    ...DEMO.map(d => ({ id: d.id, label: d.label, demo: d })),
  ]
  const current = options.find(o => o.id === selected)

  const requiredFrom = (opt) => {
    if (opt?.demo) return { hashtags: opt.demo.hashtags, handles: opt.demo.handles }
    const c = opt?.order?.campaignId || {}
    return { hashtags: splitStr(c.hashtags), handles: splitStr(c.handles) }
  }
  const req = requiredFrom(current)

  const run = async () => {
    if (!caption.trim()) return
    setChecking(true); setError(''); setResult(null)
    try {
      const body = current?.demo
        ? { caption, hashtags: current.demo.hashtags, handles: current.demo.handles }
        : { caption, orderId: current?.id }
      setResult(await validateCaption(body))
    } catch (e) {
      setError(e.response?.data?.message || 'Could not validate right now. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Creator · AI Tools</span></div>
        <h1 className="page-title">Caption Validator</h1>
        <p className="page-subtitle">Check your caption before posting — catch missing tags and weak copy, avoid rejections</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Campaign</label>
          <select value={selected} onChange={e => { setSelected(e.target.value); setResult(null) }}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none mb-4">
            {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>

          <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Your caption</label>
          <textarea value={caption} onChange={e => { setCaption(e.target.value); setResult(null) }} rows={8}
            placeholder="Paste your draft caption here…"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none resize-none" />
          <p className="text-xs text-zinc-600 mt-1">{caption.length} characters</p>

          <button onClick={run} disabled={!caption.trim() || checking} className="btn-primary" style={{ width: '100%', padding: 14, marginTop: 12 }}>
            {checking ? 'Checking…' : '✨ Validate caption'}
          </button>
          {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

          <div className="mt-5">
            <p className="text-xs text-zinc-500 mb-2">Required in this campaign:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {req.hashtags.map(h => <Chip key={h} text={h.startsWith('#') ? h : '#' + h} />)}
              {req.handles.map(h => <Chip key={h} text={h.startsWith('@') ? h : '@' + h} />)}
              {req.hashtags.length === 0 && req.handles.length === 0 && <span className="text-xs text-zinc-600">No specific hashtags/mentions required.</span>}
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-sm text-zinc-400">Validate a caption to see its score, missing tags and an improved version.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <ScoreRing score={result.score} />
                <div>
                  <span className={`badge ${result.passes ? 'badge-success' : 'badge-warning'}`}>
                    {result.passes ? 'Ready to post ✓' : 'Needs work'}
                  </span>
                  <p className="text-xs text-zinc-500 mt-2">
                    {result.source === 'claude' ? 'Reviewed by AI' : 'Rule-based check'}
                    {typeof result.qualityScore === 'number' ? ` · quality ${result.qualityScore}/100` : ''}
                  </p>
                </div>
              </div>

              {(result.missingHashtags?.length || result.missingMentions?.length) ? (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Missing (add these):</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {result.missingHashtags?.map(h => <Chip key={h} text={h} tone="bad" />)}
                    {result.missingMentions?.map(h => <Chip key={h} text={h} tone="bad" />)}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-400">✓ All required hashtags and mentions are present.</p>
              )}

              {result.issues?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Notes:</p>
                  <ul className="space-y-1.5">
                    {result.issues.map((it, i) => (
                      <li key={i} className="text-xs text-zinc-300 flex gap-2"><span className="text-amber-400">•</span><span>{it.message}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {result.improvedCaption && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-zinc-500">Improved version</p>
                    <div className="flex gap-3">
                      <button onClick={() => navigator.clipboard?.writeText(result.improvedCaption)} className="text-xs text-violet-400 hover:text-violet-300">Copy</button>
                      <button onClick={() => { setCaption(result.improvedCaption); setResult(null) }} className="text-xs text-violet-400 hover:text-violet-300">Use it</button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed p-3 rounded-xl bg-white/5 border border-white/5">{result.improvedCaption}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CaptionValidator
