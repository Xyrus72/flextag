import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { createCampaign } from '../../services/campaigns'

// Instagram post format a creator's submission must match (verified by the backend audit).
const CONTENT_TYPE_LABELS = {
  any:      'Any post or reel',
  reel:     'Reel',
  post:     'Feed post (photo)',
  carousel: 'Carousel',
}

const CampaignBuilder = () => {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({
    title: '', category: 'Beauty', product: '', price: '', cashbackRate: 50, instantSplitPct: 50, stock: '',
    minFollowers: 1000, hashtags: '', handles: '', deadline: '', retentionDays: 7,
    budgetCap: '', isPrivate: false, contentType: 'any',
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const steps = ['Campaign details', 'Product & pricing', 'Creator requirements', 'Review & launch']

  const handleLaunch = async () => {
    setSubmitting(true)
    setError('')
    try {
      await createCampaign({
        title:       form.title,
        category:    form.category,
        product:     form.product,
        price:       Number(form.price),
        cashbackRate: Number(form.cashbackRate),
        instantSplitPct: Number(form.instantSplitPct),
        stock:       Number(form.stock) || 100,
        minFollowers: Number(form.minFollowers),
        hashtags:    form.hashtags,
        handles:     form.handles,
        deadline:    form.deadline || undefined,
        retentionDays: Number(form.retentionDays),
        budgetCap:   form.budgetCap ? Number(form.budgetCap) : 0,
        isPrivate:   form.isPrivate,
        contentType: form.contentType,
      })
      navigate('/brand')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Campaigns</span></div>
        <h1 className="page-title">Create campaign</h1>
        <p className="page-subtitle">Set up a new product campaign for creators</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 max-w-2xl">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                background: step > i ? 'var(--success)' : step === i + 1 ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.05)',
                color: step > i || step === i + 1 ? '#fff' : 'rgba(var(--ink-rgb),0.4)',
              }}>
                {step > i ? <Check size={15} strokeWidth={2} /> : i + 1}
              </div>
              <span className="hidden sm:block" style={{ fontSize: 12, fontWeight: 500, color: step === i + 1 ? 'var(--text)' : 'rgba(var(--ink-rgb),0.4)' }}>{s}</span>
            </div>
            {i < 3 && <div className="flex-1 h-0.5 rounded" style={{ background: step > i + 1 ? 'var(--success)' : step === i + 1 ? 'rgba(124,58,237,0.3)' : 'rgba(var(--ink-rgb),0.05)' }} />}
          </React.Fragment>
        ))}
      </div>

      <div className="max-w-2xl">
        <div style={{ borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)', padding: 24 }}>
          {error && <p style={{ fontSize: 12, color: '#f87171', marginBottom: 16, padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}

          {step === 1 && (
            <div className="space-y-4">
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Campaign details</h2>
              <div><label className="field-label">Campaign title</label>
                <input value={form.title} onChange={set('title')} placeholder="e.g. Summer Glow Collection" className="field-input" /></div>
              <div><label className="field-label">Category</label>
                <select value={form.category} onChange={set('category')} className="field-select">
                  {['Beauty', 'Fashion', 'Tech', 'Lifestyle', 'Food', 'Health'].map(c => <option key={c} value={c} style={{ background: 'var(--bg-2)', color: 'var(--text)' }}>{c}</option>)}
                </select></div>
              <div><label className="field-label">Campaign deadline</label>
                <input type="date" value={form.deadline} onChange={set('deadline')} className="field-input" /></div>
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <input type="checkbox" checked={form.isPrivate} onChange={set('isPrivate')} className="accent-violet-500 w-4 h-4" />
                <div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Private campaign</p><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Invite-only. Not visible in public catalog.</p></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Product & pricing</h2>
              <div><label className="field-label">Product name</label>
                <input value={form.product} onChange={set('product')} placeholder="e.g. Matte Lipstick Set" className="field-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="field-label">Retail price (৳)</label>
                  <input type="number" value={form.price} onChange={set('price')} placeholder="1200" className="field-input" /></div>
                <div><label className="field-label">Stock quantity</label>
                  <input type="number" value={form.stock} onChange={set('stock')} placeholder="100" className="field-input" /></div>
              </div>
              <div><label className="field-label">Cashback rate: <span style={{ color: 'var(--violet-ink)', fontWeight: 700 }}>{form.cashbackRate}%</span></label>
                <input type="range" min="30" max="70" value={form.cashbackRate} onChange={set('cashbackRate')} className="w-full accent-violet-500" />
                <div className="flex justify-between" style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)' }}><span>30%</span><span>70%</span></div></div>
              <div><label className="field-label">Instant discount split: <span style={{ color: 'var(--cyan-ink)', fontWeight: 700 }}>{form.instantSplitPct}%</span></label>
                <input type="range" min="0" max="100" step="10" value={form.instantSplitPct} onChange={set('instantSplitPct')} className="w-full accent-cyan-500" />
                <div className="flex justify-between" style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)' }}><span>All after post</span><span>All instant</span></div>
                {form.price && form.cashbackRate > 0 && (() => {
                  const reward = Math.round(Number(form.price) * Number(form.cashbackRate) / 100)
                  const instant = Math.round(reward * Number(form.instantSplitPct) / 100)
                  return <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Creators get <span className="tnum" style={{ color: 'var(--cyan-ink)', fontWeight: 600 }}>৳{instant.toLocaleString()} off at checkout</span> + <span className="tnum" style={{ color: 'var(--green-ink)', fontWeight: 600 }}>৳{(reward - instant).toLocaleString()} bonus</span> after their post verifies.</p>
                })()}</div>
              <div><label className="field-label">Budget cap (৳)</label>
                <input type="number" value={form.budgetCap} onChange={set('budgetCap')} placeholder="e.g. 50000" className="field-input" />
                <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)', marginTop: 4 }}>Campaign auto-closes when cashback reaches this limit</p></div>
              {form.price && form.cashbackRate && (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Net cost for creators</p>
                  <p className="tnum" style={{ fontSize: 20, fontWeight: 700, color: 'var(--green-ink)' }}>৳{Math.round(Number(form.price) * (1 - Number(form.cashbackRate) / 100)).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Creator requirements</h2>
              <div><label className="field-label">Min followers</label>
                <input type="number" value={form.minFollowers} onChange={set('minFollowers')} className="field-input" /></div>
              <div><label className="field-label">Required hashtags (comma-separated)</label>
                <input value={form.hashtags} onChange={set('hashtags')} placeholder="#GlowUpMatte, #FlextagCreator" className="field-input" /></div>
              <div><label className="field-label">Required tags (handles)</label>
                <input value={form.handles} onChange={set('handles')} placeholder="@glowupbd" className="field-input" /></div>
              <div><label className="field-label">Required content type</label>
                <select value={form.contentType} onChange={set('contentType')} className="field-select">
                  {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v} style={{ background: 'var(--bg-2)', color: 'var(--text)' }}>{l}</option>)}
                </select>
                <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)', marginTop: 4 }}>Submitted posts must match this format to pass verification</p></div>
              <div><label className="field-label">Retention period (days)</label>
                <select value={form.retentionDays} onChange={set('retentionDays')} className="field-select">
                  {[3, 5, 7, 14, 30].map(d => <option key={d} value={d} style={{ background: 'var(--bg-2)', color: 'var(--text)' }}>{d} days</option>)}
                </select></div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Review & launch</h2>
              <div className="space-y-3">
                {[
                  ['Campaign',     form.title || '—'],
                  ['Category',     form.category],
                  ['Product',      form.product || '—'],
                  ['Price',        form.price ? `৳${Number(form.price).toLocaleString()}` : '—'],
                  ['Cashback',     `${form.cashbackRate}%`],
                  ['Reward split', `${form.instantSplitPct}% instant / ${100 - Number(form.instantSplitPct)}% after post`],
                  ['Stock',        form.stock || '100'],
                  ['Budget cap',   form.budgetCap ? `৳${Number(form.budgetCap).toLocaleString()}` : 'Unlimited'],
                  ['Min followers',Number(form.minFollowers).toLocaleString()],
                  ['Hashtags',     form.hashtags || '—'],
                  ['Handles',      form.handles || '—'],
                  ['Content type', CONTENT_TYPE_LABELS[form.contentType] || CONTENT_TYPE_LABELS.any],
                  ['Private',      form.isPrivate ? 'Yes' : 'No'],
                  ['Retention',    `${form.retentionDays} days`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(var(--ink-rgb),0.04)' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{l}</span>
                    <span className="tnum" style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && <button onClick={() => setStep(step - 1)} className="btn-ghost" style={{ flex: 1, padding: '14px 0' }}><ArrowLeft size={15} /> Back</button>}
            {step < 4 ? (
              <button onClick={() => setStep(step + 1)}
                disabled={step === 1 && !form.title || step === 2 && (!form.product || !form.price)}
                className="btn-primary" style={{ flex: 1, padding: '14px 0' }}>
                Continue
              </button>
            ) : (
              <button onClick={handleLaunch} disabled={submitting}
                className="btn-primary" style={{ flex: 1, padding: '14px 0' }}>
                {submitting ? 'Launching…' : 'Launch campaign'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CampaignBuilder
