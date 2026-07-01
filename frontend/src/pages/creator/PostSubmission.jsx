import React, { useState } from 'react'

const PostSubmission = () => {
  const [postUrl, setPostUrl] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const campaigns = [
    { id: 'c1', name: 'GlowUp Matte Lipstick', brand: 'GlowUp Cosmetics', deadline: '3d 14h' },
    { id: 'c2', name: 'UrbanFit Gym Tank Top', brand: 'UrbanFit BD', deadline: '5d 8h' },
    { id: 'c3', name: 'SkinLab Vitamin C Serum', brand: 'SkinLab BD', deadline: '1d 6h' },
  ]

  const generateCaption = async () => {
    setAiLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    const captions = {
      bangla: '💄 নতুন GlowUp Matte Lipstick Set দিয়ে আজকের লুক! ৬টা শেডে পারফেক্ট ম্যাট ফিনিশ — সারাদিন স্থায়ী! 🔥\n\n#GlowUpMatte #FlextagCreator #MakeupBD @glowupbd',
      english: '💄 Obsessed with this Matte Lipstick Set from @glowupbd! 6 gorgeous shades, long-lasting matte finish that stays ALL day. My new go-to! ✨\n\n#GlowUpMatte #FlextagCreator #BeautyBD @glowupbd',
      banglish: '💄 Amar new favorite lipstick set! GlowUp er ei Matte Lipstick Set ta literally AMAZING 🤩 6ta shade, full day thake. Tumi o try koro!\n\n#GlowUpMatte #FlextagCreator #LipstickLove @glowupbd',
    }
    setAiResponse(captions[aiPrompt] || captions.english)
    setAiLoading(false)
  }

  const handleSubmit = () => {
    if (postUrl && selectedCampaign) setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-4 lg:p-8 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Post Submitted!</h2>
          <p className="text-zinc-400 mb-6">Your post is now being reviewed. Keep it live for 7 days to earn your cashback.</p>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-left mb-6">
            <div className="flex justify-between text-sm mb-2"><span className="text-zinc-500">Status</span><span className="text-yellow-400 font-semibold">In Review</span></div>
            <div className="flex justify-between text-sm mb-2"><span className="text-zinc-500">Retention</span><span className="text-white">7 days</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Post URL</span><span className="text-blue-400 text-xs truncate max-w-[200px]">{postUrl}</span></div>
          </div>
          <button onClick={() => setSubmitted(false)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-semibold hover:bg-white/10 transition-all">
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Submit Post</h1>
      <p className="text-zinc-500 mb-8">Submit your Instagram post/reel URL for verification</p>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Submission form */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Post Details</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Select Campaign</label>
              <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none">
                <option value="">Choose a campaign...</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} — {c.brand} (⏰ {c.deadline})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Instagram Post/Reel URL</label>
              <input value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.instagram.com/p/..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all placeholder:text-zinc-600" />
              <p className="text-xs text-zinc-600 mt-1">Your post must be public and meet campaign requirements</p>
            </div>
            <button onClick={handleSubmit} disabled={!postUrl || !selectedCampaign}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              Submit for Verification
            </button>
          </div>
        </div>

        {/* AI Caption Assistant */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-1">AI Creative Assistant</h2>
          <p className="text-xs text-zinc-500 mb-5">Generate captions & hashtag ideas with AI</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Language</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'bangla', label: 'বাংলা' }, { id: 'english', label: 'English' }, { id: 'banglish', label: 'Banglish' }].map(l => (
                  <button key={l.id} onClick={() => setAiPrompt(l.id)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${aiPrompt === l.id ? 'bg-violet-500/15 border border-violet-500/30 text-violet-400' : 'bg-white/5 border border-white/5 text-zinc-500 hover:bg-white/10'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generateCaption} disabled={!aiPrompt || aiLoading}
              className="w-full py-3 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 font-semibold hover:bg-violet-500/25 transition-all disabled:opacity-30">
              {aiLoading ? '✨ Generating...' : '✨ Generate Caption'}
            </button>

            {aiResponse && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Generated Caption</span>
                  <button onClick={() => navigator.clipboard?.writeText(aiResponse)} className="text-xs text-orange-400 hover:text-orange-300">Copy</button>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostSubmission
