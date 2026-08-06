import React, { useState } from 'react'

const CaptionValidator = () => {
  const [caption, setCaption] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('glowup')
  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)

  const campaigns = {
    glowup: { name: 'GlowUp Matte Lipstick', hashtags: ['#GlowUpMatte', '#FlextagCreator'], handles: ['@glowupbd'], rules: ['Product must be visible', 'Min 3 hashtags'] },
    urbanfit: { name: 'UrbanFit Gym Tank', hashtags: ['#UrbanFitBD', '#GymWear'], handles: ['@urbanfitbd'], rules: ['Product must be worn', 'Use at least 2 hashtags'] },
    skinlab: { name: 'SkinLab Vitamin C Serum', hashtags: ['#SkinLabBD', '#VitaminC'], handles: ['@skinlabbd'], rules: ['Show product usage', 'Tag brand account'] },
  }

  const validateCaption = async () => {
    setChecking(true)
    await new Promise(r => setTimeout(r, 1000))
    const camp = campaigns[selectedCampaign]
    const checks = []

    camp.hashtags.forEach(h => {
      const found = caption.toLowerCase().includes(h.toLowerCase())
      checks.push({ type: 'hashtag', label: h, passed: found, suggestion: found ? null : `Add ${h} to your caption` })
    })

    camp.handles.forEach(h => {
      const found = caption.toLowerCase().includes(h.toLowerCase())
      checks.push({ type: 'handle', label: h, passed: found, suggestion: found ? null : `Tag ${h} in your caption` })
    })

    const hasMinLength = caption.length >= 50
    checks.push({ type: 'length', label: 'Min 50 characters', passed: hasMinLength, suggestion: hasMinLength ? null : `Add more content (${50 - caption.length} chars needed)` })

    const allPassed = checks.every(c => c.passed)
    setResult({ checks, allPassed })
    setChecking(false)
  }

  return (
    <div className="page-root">
        <div className="page-header">
          <div className="page-label"><span>AI Tools</span></div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:12 }}>
            Caption Validator
            <span style={{ padding:'3px 10px', borderRadius:100, background:'rgba(124,58,237,0.15)', color:'#a78bfa', fontSize:11, fontWeight:700, border:'1px solid rgba(124,58,237,0.3)', letterSpacing:'0.1em' }}>★ AI</span>
          </h1>
          <p className="page-subtitle">Check your caption before posting — avoid rejections</p>
        </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="mb-4">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Campaign</label>
            <select value={selectedCampaign} onChange={e => { setSelectedCampaign(e.target.value); setResult(null) }}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none">
              {Object.entries(campaigns).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Your Caption</label>
            <textarea value={caption} onChange={e => { setCaption(e.target.value); setResult(null) }} rows={8}
              placeholder="Paste your draft caption here..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all placeholder:text-zinc-600 resize-none" />
            <p className="text-xs text-zinc-600 mt-1">{caption.length} characters</p>
          </div>

          <button onClick={validateCaption} disabled={!caption || checking} className="btn-primary" style={{ width:'100%', padding:14 }}>
            {checking ? 'Checking…' : '✓ Validate Caption'}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Requirements */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Campaign Requirements</h3>
            <div className="space-y-2">
              {campaigns[selectedCampaign].hashtags.map(h => (
                <div key={h} className="flex items-center gap-2 text-sm text-zinc-400"><span className="text-violet-400">#</span>{h}</div>
              ))}
              {campaigns[selectedCampaign].handles.map(h => (
                <div key={h} className="flex items-center gap-2 text-sm text-zinc-400"><span className="text-blue-400">@</span>{h}</div>
              ))}
              {campaigns[selectedCampaign].rules.map(r => (
                <div key={r} className="flex items-center gap-2 text-sm text-zinc-400"><span className="text-zinc-600">•</span>{r}</div>
              ))}
            </div>
          </div>

          {/* Validation result */}
          {result && (
            <div className={`rounded-2xl border p-6 ${result.allPassed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex items-center gap-3 mb-4">
                {result.allPassed ? (
                  <><div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div><div><p className="text-sm font-bold text-emerald-400">All checks passed! ✓</p><p className="text-xs text-zinc-500">Your caption meets all requirements</p></div></>
                ) : (
                  <><div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><div><p className="text-sm font-bold text-red-400">Issues found</p><p className="text-xs text-zinc-500">Fix these before posting</p></div></>
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
          )}
        </div>
      </div>
    </div>
  )
}

export default CaptionValidator
