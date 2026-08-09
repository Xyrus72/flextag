import React, { useState, useEffect } from 'react'
import { getCampaigns } from '../../services/campaigns'
import { validateCaption } from '../../services/captionValidator'

const CaptionValidator = () => {
  const [caption, setCaption]                   = useState('')
  const [campaigns, setCampaigns]               = useState([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [checking, setChecking]                 = useState(false)
  const [result, setResult]                     = useState(null)
  const [error, setError]                       = useState('')

  // Fetch real campaigns on mount
  useEffect(() => {
    getCampaigns()
      .then(d => {
        const list = d.campaigns || []
        setCampaigns(list)
        if (list.length) setSelectedCampaignId(list[0]._id)
      })
      .catch(err => console.error('[CaptionValidator] Failed to load campaigns:', err))
      .finally(() => setLoadingCampaigns(false))
  }, [])

  const selectedCampaign = campaigns.find(c => c._id === selectedCampaignId)

  // Parse comma/newline-separated strings into arrays
  const parseList = (str) => {
    if (!str || !str.trim()) return []
    return str.split(/[,\n]+/).map(s => s.trim()).filter(Boolean)
  }

  const campaignHashtags = parseList(selectedCampaign?.hashtags)
  const campaignHandles  = parseList(selectedCampaign?.handles)

  const handleValidate = async () => {
    if (!caption.trim() || !selectedCampaignId) return
    setChecking(true)
    setError('')
    setResult(null)
    try {
      const data = await validateCaption({ caption, campaignId: selectedCampaignId })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Validation failed. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const scoreColor = (score) => {
    if (score >= 80) return '#34d399'
    if (score >= 50) return '#facc15'
    return '#f87171'
  }

  const toneBadge = (tone) => {
    const map = {
      excellent:  { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', color: '#34d399', label: '✦ Excellent' },
      good:       { bg: 'rgba(250,204,21,0.12)',  border: 'rgba(250,204,21,0.3)',  color: '#facc15', label: '● Good' },
      needs_work: { bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)',  color: '#fb923c', label: '▲ Needs Work' },
      poor:       { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', color: '#f87171', label: '✗ Poor' },
    }
    return map[tone] || map.needs_work
  }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>AI Tools</span></div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          Caption Validator
          <span style={{
            padding: '3px 10px', borderRadius: 100,
            background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
            fontSize: 11, fontWeight: 700,
            border: '1px solid rgba(124,58,237,0.3)',
            letterSpacing: '0.1em',
          }}>★ AI</span>
        </h1>
        <p className="page-subtitle">Check your caption before posting — avoid rejections</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* ─── Left: Input Panel ─────────────────────────────────────── */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">

          {/* Campaign selector */}
          <div className="mb-4">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Campaign</label>
            {loadingCampaigns ? (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <div className="w-4 h-4 rounded-full border border-zinc-500 border-t-transparent animate-spin" />
                <span>Loading campaigns…</span>
              </div>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-zinc-600">No active campaigns found.</p>
            ) : (
              <select
                value={selectedCampaignId}
                onChange={e => { setSelectedCampaignId(e.target.value); setResult(null) }}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none"
              >
                {campaigns.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.title} — {c.brand}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Caption input */}
          <div className="mb-4">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Your Caption</label>
            <textarea
              value={caption}
              onChange={e => { setCaption(e.target.value); setResult(null) }}
              rows={8}
              placeholder="Paste your draft caption here…"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all placeholder:text-zinc-600 resize-none"
            />
            <p className="text-xs text-zinc-600 mt-1">{caption.length} characters</p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{error}</p>
          )}

          {/* Validate button */}
          <button
            onClick={handleValidate}
            disabled={!caption.trim() || !selectedCampaignId || checking}
            className="btn-primary"
            style={{ width: '100%', padding: 14 }}
          >
            {checking ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" style={{ display: 'inline-block' }} />
                Analyzing with AI…
              </span>
            ) : '✓ Validate Caption'}
          </button>
        </div>

        {/* ─── Right: Requirements + Results ─────────────────────────── */}
        <div className="space-y-4">

          {/* Campaign Requirements */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Campaign Requirements</h3>
            {selectedCampaign ? (
              <div className="space-y-2">
                {campaignHashtags.length > 0 ? campaignHashtags.map(h => (
                  <div key={h} className="flex items-center gap-2 text-sm text-zinc-400">
                    <span className="text-violet-400">#</span>{h.startsWith('#') ? h : `#${h}`}
                  </div>
                )) : (
                  <div className="text-sm text-zinc-600 italic">No required hashtags</div>
                )}
                {campaignHandles.length > 0 ? campaignHandles.map(h => (
                  <div key={h} className="flex items-center gap-2 text-sm text-zinc-400">
                    <span className="text-blue-400">@</span>{h.startsWith('@') ? h : `@${h}`}
                  </div>
                )) : (
                  <div className="text-sm text-zinc-600 italic">No required brand tags</div>
                )}
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-600">•</span>Min 50 characters
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">Select a campaign to see requirements.</p>
            )}
          </div>

          {/* ─── Validation Results ───────────────────────────────────── */}
          {result && (
            <>
              {/* Deterministic checks */}
              <div className={`rounded-2xl border p-6 ${result.allPassed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-center gap-3 mb-4">
                  {result.allPassed ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-400">All checks passed! ✓</p>
                        <p className="text-xs text-zinc-500">Required hashtags & tags are present</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-400">Issues found</p>
                        <p className="text-xs text-zinc-500">Fix these before posting</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  {result.checks.map((c, i) => (
                    <div key={i} className={`flex items-start gap-2 p-3 rounded-xl ${c.passed ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
                      {c.passed ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" className="mt-0.5 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      )}
                      <div>
                        <p className={`text-sm font-medium ${c.passed ? 'text-emerald-400' : 'text-red-400'}`}>{c.label}</p>
                        {c.suggestion && <p className="text-xs text-zinc-500 mt-0.5">{c.suggestion}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Analysis */}
              {result.ai && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Analysis</h3>
                    <span style={{
                      padding: '2px 8px', borderRadius: 100,
                      background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                      fontSize: 9, fontWeight: 700,
                      border: '1px solid rgba(124,58,237,0.3)',
                      letterSpacing: '0.1em',
                    }}>LLAMA</span>
                  </div>

                  {/* Score + Tone */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {/* Readiness score */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Readiness</p>
                      <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 8px' }}>
                        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor(result.ai.score)} strokeWidth="3"
                            strokeDasharray={`${result.ai.score} ${100 - result.ai.score}`}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dasharray 0.8s ease' }}
                          />
                        </svg>
                        <span style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 800, color: scoreColor(result.ai.score),
                        }}>{result.ai.score}</span>
                      </div>
                      <p className="text-xs text-zinc-600">out of 100</p>
                    </div>

                    {/* Tone */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center flex flex-col items-center justify-center">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Tone</p>
                      {(() => {
                        const t = toneBadge(result.ai.tone)
                        return (
                          <span style={{
                            display: 'inline-block', padding: '5px 14px', borderRadius: 100,
                            background: t.bg, border: `1px solid ${t.border}`,
                            color: t.color, fontSize: 12, fontWeight: 700,
                          }}>{t.label}</span>
                        )
                      })()}
                      {result.ai.toneComment && (
                        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">{result.ai.toneComment}</p>
                      )}
                    </div>
                  </div>

                  {/* Suggestions */}
                  {result.ai.suggestions && result.ai.suggestions.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Suggestions</p>
                      <div className="space-y-2">
                        {result.ai.suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" className="mt-0.5 flex-shrink-0"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                            <p className="text-sm text-zinc-300">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improved caption */}
                  {result.ai.improvedCaption && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Suggested Caption</p>
                        <button
                          onClick={() => navigator.clipboard?.writeText(result.ai.improvedCaption)}
                          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                        >Copy</button>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{result.ai.improvedCaption}</p>
                      </div>
                      <button
                        onClick={() => { setCaption(result.ai.improvedCaption); setResult(null) }}
                        className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        ↳ Use this caption
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* No AI fallback notice */}
              {!result.ai && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <p className="text-xs text-zinc-500">AI analysis unavailable — showing rule-based checks only. Add your free Groq API key to enable AI analysis.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CaptionValidator
