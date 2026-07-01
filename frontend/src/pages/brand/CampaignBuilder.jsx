import React, { useState } from 'react'

const CampaignBuilder = () => {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: '', category: 'Beauty', product: '', price: '', cashbackRate: 50, stock: '',
    minFollowers: 1000, hashtags: '', handles: '', deadline: '', retentionDays: 7,
    budgetCap: '', isPrivate: false,
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const steps = ['Campaign Details', 'Product & Pricing', 'Creator Requirements', 'Review & Launch']

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Create Campaign</h1>
      <p className="text-zinc-500 mb-8">Set up a new product campaign for creators</p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 max-w-2xl">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > i ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white' : 'bg-white/5 text-zinc-600'}`}>
                {step > i ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === i + 1 ? 'text-white' : 'text-zinc-600'}`}>{s}</span>
            </div>
            {i < 3 && <div className={`flex-1 h-0.5 rounded ${step > i + 1 ? 'bg-emerald-500' : step === i + 1 ? 'bg-orange-500/30' : 'bg-white/5'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="max-w-2xl">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-4">Campaign Details</h2>
              <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Campaign Title</label>
                <input value={form.title} onChange={set('title')} placeholder="e.g. Summer Glow Collection" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none placeholder:text-zinc-600" /></div>
              <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Category</label>
                <select value={form.category} onChange={set('category')} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none">
                  {['Beauty', 'Fashion', 'Tech', 'Lifestyle', 'Food'].map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Campaign Deadline</label>
                <input type="date" value={form.deadline} onChange={set('deadline')} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none" /></div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
                <input type="checkbox" checked={form.isPrivate} onChange={set('isPrivate')} className="accent-orange-500 w-4 h-4" />
                <div><p className="text-sm font-semibold text-white">★ Private Campaign</p><p className="text-xs text-zinc-500">Invite-only. Not visible in public catalog.</p></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-4">Product & Pricing</h2>
              <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Product Name</label>
                <input value={form.product} onChange={set('product')} placeholder="e.g. Matte Lipstick Set" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none placeholder:text-zinc-600" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Retail Price (৳)</label>
                  <input type="number" value={form.price} onChange={set('price')} placeholder="1200" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none placeholder:text-zinc-600" /></div>
                <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Stock Quantity</label>
                  <input type="number" value={form.stock} onChange={set('stock')} placeholder="100" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none placeholder:text-zinc-600" /></div>
              </div>
              <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Cashback Rate: <span className="text-orange-400 font-bold">{form.cashbackRate}%</span></label>
                <input type="range" min="30" max="70" value={form.cashbackRate} onChange={set('cashbackRate')} className="w-full accent-orange-500" />
                <div className="flex justify-between text-xs text-zinc-600"><span>30%</span><span>70%</span></div></div>
              <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">★ Budget Cap (৳)</label>
                <input type="number" value={form.budgetCap} onChange={set('budgetCap')} placeholder="e.g. 50000" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none placeholder:text-zinc-600" />
                <p className="text-xs text-zinc-600 mt-1">Campaign auto-closes when cashback reaches this limit</p></div>
              {form.price && form.cashbackRate && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <p className="text-xs text-zinc-500">Net cost for creators</p>
                  <p className="text-xl font-bold text-emerald-400">৳{Math.round(form.price * (1 - form.cashbackRate / 100)).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-4">Creator Requirements</h2>
              <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Min Followers</label>
                <input type="number" value={form.minFollowers} onChange={set('minFollowers')} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none" /></div>
              <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Required Hashtags (comma-separated)</label>
                <input value={form.hashtags} onChange={set('hashtags')} placeholder="#GlowUpMatte, #FlextagCreator" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none placeholder:text-zinc-600" /></div>
              <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Required Tags (handles)</label>
                <input value={form.handles} onChange={set('handles')} placeholder="@glowupbd" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none placeholder:text-zinc-600" /></div>
              <div><label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Retention Period (days)</label>
                <select value={form.retentionDays} onChange={set('retentionDays')} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none">
                  {[3, 5, 7, 14, 30].map(d => <option key={d} value={d}>{d} days</option>)}
                </select></div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-4">Review & Launch</h2>
              <div className="space-y-3">
                {[
                  ['Campaign', form.title || '—'], ['Category', form.category], ['Product', form.product || '—'],
                  ['Price', form.price ? `৳${Number(form.price).toLocaleString()}` : '—'], ['Cashback', `${form.cashbackRate}%`],
                  ['Budget Cap', form.budgetCap ? `৳${Number(form.budgetCap).toLocaleString()}` : 'Unlimited'],
                  ['Min Followers', form.minFollowers.toLocaleString()], ['Hashtags', form.hashtags || '—'],
                  ['Private', form.isPrivate ? 'Yes ★' : 'No'], ['Retention', `${form.retentionDays} days`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between py-2 border-b border-white/[0.03]">
                    <span className="text-sm text-zinc-500">{l}</span>
                    <span className="text-sm text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-semibold hover:bg-white/10 transition-all">← Back</button>}
            {step < 4 ? (
              <button onClick={() => setStep(step + 1)} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all">Continue →</button>
            ) : (
              <button className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all">🚀 Launch Campaign</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CampaignBuilder
