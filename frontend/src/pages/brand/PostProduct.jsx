import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProduct } from '../../services/products'
import { AlertTriangle, Clock, Package } from 'lucide-react'

const CATEGORIES = ['Beauty', 'Fashion', 'Tech', 'Lifestyle', 'Food', 'Health', 'Home', 'Sports']

const Field = ({ label, required, hint, children }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <label className="field-label" style={{ marginBottom: 0 }}>
        {label} {required && <span style={{ color: 'var(--violet-ink)' }}>*</span>}
      </label>
      {hint && <span style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),0.2)' }}>{hint}</span>}
    </div>
    {children}
  </div>
)

const PostProduct = () => {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [imgError, setImgError] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'Beauty', price: '', cashbackRate: 50, instantSplitPct: 50,
    stock: '', description: '', image: '',
    campaignBudget: '50000', minFollowers: '1000',
    hashtags: '#FlexTag, #BrandPartner', taggingHandles: '@flextag.official',
  })

  const set = k => e => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (k === 'image') setImgError(false)
  }

  const netPrice = form.price ? Math.round(Number(form.price) * (1 - form.cashbackRate / 100)) : null
  const cashbackAmount = form.price ? Math.round(Number(form.price) * form.cashbackRate / 100) : null

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.cashbackRate) {
      setError('Product name, price and cashback rate are required.')
      return
    }
    setSubmitting(true)
    setError('')

    const hashtagsArr = form.hashtags ? form.hashtags.split(',').map(s => s.trim()).filter(Boolean) : []
    const handlesArr = form.taggingHandles ? form.taggingHandles.split(',').map(s => s.trim()).filter(Boolean) : []

    try {
      await createProduct({
        name: form.name,
        category: form.category,
        price: Number(form.price),
        cashbackRate: Number(form.cashbackRate),
        instantSplitPct: Number(form.instantSplitPct),
        stock: Number(form.stock) || 0,
        campaignBudget: Number(form.campaignBudget) || 50000,
        description: form.description,
        image: form.image,
        creatorCriteria: {
          minFollowers: Number(form.minFollowers) || 1000,
          targetCategory: form.category
        },
        postingRules: {
          hashtags: hashtagsArr,
          taggingHandles: handlesArr,
          contentType: 'Instagram Post or Reel'
        }
      })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post product campaign.')
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setDone(false)
    setForm({
      name: '', category: 'Beauty', price: '', cashbackRate: 50, instantSplitPct: 50,
      stock: '', description: '', image: '', campaignBudget: '50000',
      minFollowers: '1000', hashtags: '#FlexTag, #BrandPartner', taggingHandles: '@flextag.official',
    })
    setError('')
    setImgError(false)
  }

  if (done) return (
    <div className="page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '65vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', margin: '0 auto 24px',
          background: 'rgba(124,58,237,0.1)',
          border: '2px solid rgba(124,58,237,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Clock size={36} strokeWidth={1.5} style={{ color: 'var(--violet-ink)' }} /></div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Campaign submitted for review</h2>
        <p style={{ color: 'rgba(var(--ink-rgb),0.4)', fontSize: 14, lineHeight: 1.75, marginBottom: 28 }}>
          Your product campaign has been configured with a{' '}
          <span className="tnum" style={{ color: 'var(--cyan-ink)', fontWeight: 700 }}>৳{Number(form.campaignBudget || 50000).toLocaleString()} budget cap</span> and is now{' '}
          <span style={{ color: 'var(--amber-ink)', fontWeight: 700 }}>pending admin approval</span>.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={resetForm} className="btn-ghost" style={{ padding: '11px 24px' }}>
            Create another
          </button>
          <button onClick={() => navigate('/brand/my-products')} className="btn-primary" style={{ padding: '11px 24px' }}>
            View my products
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Campaigns</span></div>
        <h1 className="page-title">Post a product</h1>
        <p className="page-subtitle">
          Configure product campaigns, set total cashback budget caps, define creator eligibility, and specify social posting rules.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 24, alignItems: 'start' }} className="lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {error && (
            <div style={{ padding: '13px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
            </div>
          )}

          <div style={{ background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.06)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 20 }}>Basics</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Product / Campaign Name" required>
                <input value={form.name} onChange={set('name')} placeholder="e.g. Matte Lipstick Collection" className="field-input" />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Category" required>
                  <select value={form.category} onChange={set('category')} className="field-select">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Stock Inventory" hint="units available">
                  <input type="number" value={form.stock} onChange={set('stock')} placeholder="100" min="0" className="field-input" />
                </Field>
              </div>

              <Field label="Description" hint="optional">
                <textarea value={form.description} onChange={set('description')}
                  placeholder="Describe your product campaign — ingredients, benefits, what makes it special..." rows={3}
                  className="field-input" style={{ resize: 'vertical', lineHeight: 1.65 }} />
              </Field>
            </div>
          </div>

          <div style={{ background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.06)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 20 }}>Pricing & cashback</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Retail Price (৳)" required>
                <input type="number" value={form.price} onChange={set('price')} placeholder="1200" min="0" className="field-input" />
              </Field>

              <Field label={<>Cashback Rate <span style={{ color: 'var(--violet-ink)', fontWeight: 800 }}>{form.cashbackRate}%</span></>}>
                <input type="range" min="10" max="80" value={form.cashbackRate}
                  onChange={e => setForm(f => ({ ...f, cashbackRate: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(var(--ink-rgb),0.2)', marginTop: 4 }}>
                  <span>10%</span><span>80%</span>
                </div>
              </Field>

              <Field label={<>Instant Discount Split <span style={{ color: 'var(--cyan-ink)', fontWeight: 800 }}>{form.instantSplitPct}%</span></>}>
                <input type="range" min="0" max="100" step="10" value={form.instantSplitPct}
                  onChange={e => setForm(f => ({ ...f, instantSplitPct: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(var(--ink-rgb),0.2)', marginTop: 4 }}>
                  <span>All after post</span><span>All instant</span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', marginTop: 6 }}>
                  Part of the reward comes off the bill at checkout; the rest releases after the post verifies.
                </p>
              </Field>

              {form.price && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>Creator net cost</p>
                    <p className="tnum" style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-ink)' }}>৳{netPrice?.toLocaleString()}</p>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>Cashback reward</p>
                    <p className="tnum" style={{ fontSize: 20, fontWeight: 800, color: 'var(--violet-ink)' }}>৳{cashbackAmount?.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.06)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 20 }}>Budget cap & spend control</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Max Total Cashback Budget Cap (৳)" required hint="auto-closes when cap reached">
                <input type="number" value={form.campaignBudget} onChange={set('campaignBudget')} placeholder="50000" min="1000" className="field-input" />
              </Field>
              <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)', lineHeight: 1.6 }}>
                Once your total cashback payouts reach this cap, the campaign automatically closes to new creator purchases, protecting your brand from unmanaged liability.
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.06)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 20 }}>Creator eligibility & posting rules</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Minimum Followers Required">
                <input type="number" value={form.minFollowers} onChange={set('minFollowers')} placeholder="1000" min="0" className="field-input" />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Required Hashtags" hint="comma separated">
                  <input value={form.hashtags} onChange={set('hashtags')} placeholder="#FlexTag, #BrandPartner" className="field-input" />
                </Field>
                <Field label="Tagging Handles" hint="comma separated">
                  <input value={form.taggingHandles} onChange={set('taggingHandles')} placeholder="@flextag.official" className="field-input" />
                </Field>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.06)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 20 }}>Product image</p>
            <Field label="Image URL" hint="paste direct link">
              <input value={form.image} onChange={set('image')} placeholder="https://example.com/product-image.jpg" className="field-input" />
            </Field>
            {form.image && !imgError && (
              <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 70, height: 70, borderRadius: 10, border: '1px solid rgba(var(--ink-rgb),0.08)', overflow: 'hidden', background: 'rgba(var(--ink-rgb),0.03)', flexShrink: 0 }}>
                  <img src={form.image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
                </div>
                <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)' }}>Image preview — visible to creators in catalog.</p>
              </div>
            )}
          </div>

          <button onClick={handleSubmit} disabled={submitting || !form.name || !form.price}
            className="btn-primary" style={{ width: '100%', padding: 15, fontSize: 15 }}>
            {submitting ? 'Launching campaign…' : 'Launch campaign'}
          </button>
        </div>

        <div className="lg:sticky lg:top-6">
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14 }}>Live preview</p>

          <div style={{ borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)', overflow: 'hidden' }}>
            <div style={{ aspectRatio: '1.1', background: 'rgba(var(--ink-rgb),0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {form.image && !imgError ? (
                <img src={form.image} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Package size={44} strokeWidth={1.5} style={{ color: 'rgba(var(--ink-rgb),0.18)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.15)' }}>No image added</span>
                </div>
              )}
              <div style={{ position: 'absolute', top: 12, right: 12, padding: '5px 12px', borderRadius: 8, background: 'var(--purple)', color: '#fff', fontSize: 12, fontWeight: 800 }}>
                {form.cashbackRate}% back
              </div>
              <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 8, background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: 'var(--cyan-ink)', fontSize: 10, fontWeight: 700 }}>
                Cap: ৳{Number(form.campaignBudget || 50000).toLocaleString()}
              </div>
            </div>

            <div style={{ padding: '18px 18px 20px' }}>
              <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.25)', marginBottom: 4 }}>Your Brand</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: form.name ? 'var(--text)' : 'rgba(var(--ink-rgb),0.18)', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {form.name || 'Campaign Name'}
              </p>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span className="badge badge-info">{form.category}</span>
                <span className="badge badge-success">{Number(form.minFollowers || 1000).toLocaleString()}+ followers</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <p className="tnum" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                    ৳{form.price ? Number(form.price).toLocaleString() : '—'}
                  </p>
                  {netPrice && (
                    <p className="tnum" style={{ fontSize: 11, color: 'var(--green-ink)', marginTop: 2 }}>
                      Net: ৳{netPrice.toLocaleString()}
                    </p>
                  )}
                </div>
                <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: 'var(--violet-ink)', fontSize: 12, fontWeight: 700 }}>
                  Shop now
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default PostProduct
