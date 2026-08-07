import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProduct } from '../../services/products'

const CATEGORIES = ['Beauty', 'Fashion', 'Tech', 'Lifestyle', 'Food', 'Health', 'Home', 'Sports']

const Field = ({ label, required, hint, children }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {label} {required && <span style={{ color: '#a78bfa' }}>*</span>}
      </label>
      {hint && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{hint}</span>}
    </div>
    {children}
  </div>
)

const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.04)',
  color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
}

const PostProduct = () => {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [imgError, setImgError] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'Beauty', price: '', cashbackRate: 50,
    stock: '', description: '', image: '',
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
    try {
      await createProduct({
        name: form.name, category: form.category,
        price: Number(form.price), cashbackRate: Number(form.cashbackRate),
        stock: Number(form.stock) || 0, description: form.description, image: form.image,
      })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post product.')
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setDone(false)
    setForm({ name: '', category: 'Beauty', price: '', cashbackRate: 50, stock: '', description: '', image: '' })
    setError('')
    setImgError(false)
  }

  /* ── Success Screen ─────────────────────────────────────────────────────── */
  if (done) return (
    <div className="page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '65vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', margin: '0 auto 24px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, rgba(124,58,237,0.05) 70%)',
          border: '2px solid rgba(124,58,237,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38,
          boxShadow: '0 0 40px rgba(124,58,237,0.15)',
        }}>⏳</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Submitted for Review</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.75, marginBottom: 28 }}>
          Your product has been submitted and is now{' '}
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>pending admin approval</span>.
          Once approved, it will appear in the creator catalog.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={resetForm} style={{ padding: '11px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
            + Post Another
          </button>
          <button onClick={() => navigate('/brand/my-products')} style={{ padding: '11px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}>
            View My Products →
          </button>
        </div>
      </div>
    </div>
  )

  /* ── Main Form ──────────────────────────────────────────────────────────── */
  return (
    <div className="page-root">
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 100, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Brand Portal</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Post a Product</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
          Submit your product for admin review. After approval it goes live in the creator catalog.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }}>

        {/* ── Left: Form ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Error */}
          {error && (
            <div style={{ padding: '13px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>⚠️</span> {error}
            </div>
          )}

          {/* Section: Basic Info */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>① Basic Information</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Product Name" required>
                <input value={form.name} onChange={set('name')} placeholder="e.g. Matte Lipstick Collection" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.55)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Category" required>
                  <select value={form.category} onChange={set('category')} style={{ ...inputStyle, background: '#0d0d20', cursor: 'pointer' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.55)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Stock Quantity" hint="optional">
                  <input type="number" value={form.stock} onChange={set('stock')} placeholder="100" min="0" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.55)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
                </Field>
              </div>

              <Field label="Description" hint="optional">
                <textarea value={form.description} onChange={set('description')}
                  placeholder="Describe your product — ingredients, benefits, what makes it special..." rows={3}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }}
                  onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.55)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
              </Field>
            </div>
          </div>

          {/* Section: Pricing */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>② Pricing & Cashback</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Retail Price (৳)" required>
                <input type="number" value={form.price} onChange={set('price')} placeholder="1200" min="0" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.55)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
              </Field>

              <Field label={<>Cashback Rate <span style={{ color: '#a78bfa', fontWeight: 900 }}>{form.cashbackRate}%</span></>}>
                <input type="range" min="10" max="80" value={form.cashbackRate}
                  onChange={e => setForm(f => ({ ...f, cashbackRate: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                  <span>10%</span><span>80%</span>
                </div>
              </Field>

              {/* Pricing breakdown */}
              {form.price && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: 'rgba(74,222,128,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Creator Pays</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#4ade80' }}>৳{netPrice?.toLocaleString()}</p>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: 'rgba(167,139,250,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Cashback Earned</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa' }}>৳{cashbackAmount?.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Image */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24, marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>③ Product Image</p>
            <Field label="Image URL" hint="paste a direct image link">
              <input value={form.image} onChange={set('image')} placeholder="https://example.com/product-image.jpg" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.55)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
            </Field>
            {form.image && !imgError && (
              <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 70, height: 70, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }}>
                  <img src={form.image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setImgError(true)} />
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Image preview — visible to creators in the catalog.</p>
              </div>
            )}
            {form.image && imgError && (
              <p style={{ marginTop: 10, fontSize: 12, color: '#f87171' }}>⚠️ Could not load image from this URL. Please check the link.</p>
            )}
          </div>

          {/* Submit Button */}
          <button onClick={handleSubmit} disabled={submitting || !form.name || !form.price}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none', fontFamily: 'inherit',
              background: submitting || !form.name || !form.price
                ? 'rgba(255,255,255,0.04)'
                : 'linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #06b6d4 100%)',
              color: submitting || !form.name || !form.price ? 'rgba(255,255,255,0.2)' : '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: submitting || !form.name || !form.price ? 'not-allowed' : 'pointer',
              boxShadow: submitting || !form.name || !form.price ? 'none' : '0 8px 36px rgba(124,58,237,0.35)',
              transition: 'all 0.2s', letterSpacing: '0.02em',
            }}
            onMouseEnter={e => { if (!submitting && form.name && form.price) e.currentTarget.style.boxShadow = '0 10px 48px rgba(124,58,237,0.5)' }}
            onMouseLeave={e => { if (!submitting && form.name && form.price) e.currentTarget.style.boxShadow = '0 8px 36px rgba(124,58,237,0.35)' }}>
            {submitting ? '⏳ Submitting...' : '📤 Submit for Approval'}
          </button>
        </div>

        {/* ── Right: Live Preview Card ────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Live Preview</p>

          {/* Product Card Preview */}
          <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            {/* Image area */}
            <div style={{ aspectRatio: '1.1', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {form.image && !imgError ? (
                <img src={form.image} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setImgError(true)} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 52, opacity: 0.18 }}>📦</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>No image added</span>
                </div>
              )}
              {/* Cashback badge */}
              <div style={{ position: 'absolute', top: 12, right: 12, padding: '5px 12px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', fontSize: 12, fontWeight: 800, boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
                {form.cashbackRate}% back
              </div>
              {/* Pending badge */}
              <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 8, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: 10, fontWeight: 700 }}>
                ⏳ Pending
              </div>
            </div>

            {/* Card info */}
            <div style={{ padding: '18px 18px 20px' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>Your Brand</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: form.name ? '#fff' : 'rgba(255,255,255,0.18)', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {form.name || 'Product Name'}
              </p>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 600, background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}>
                  {form.category}
                </span>
                {form.stock && (
                  <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 600, background: 'rgba(74,222,128,0.08)', color: 'rgba(74,222,128,0.7)', border: '1px solid rgba(74,222,128,0.15)' }}>
                    {form.stock} in stock
                  </span>
                )}
              </div>

              {form.description && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {form.description}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
                    ৳{form.price ? Number(form.price).toLocaleString() : '—'}
                  </p>
                  {netPrice && (
                    <p style={{ fontSize: 11, color: '#4ade80', marginTop: 2 }}>
                      Net: ৳{netPrice.toLocaleString()}
                    </p>
                  )}
                </div>
                <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 12, fontWeight: 700 }}>
                  Shop Now
                </div>
              </div>
            </div>
          </div>

          {/* Workflow steps */}
          <div style={{ marginTop: 20, padding: '18px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Approval Flow</p>
            {[
              { icon: '📤', label: 'You submit', desc: 'Product goes to review queue', done: true },
              { icon: '🔍', label: 'Admin reviews', desc: 'Checked within 24 hours', done: false },
              { icon: '🚀', label: 'Goes live', desc: 'Visible to all creators', done: false },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 14 : 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: step.done ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${step.done ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {step.icon}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: step.done ? '#fff' : 'rgba(255,255,255,0.45)', marginBottom: 2 }}>{step.label}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default PostProduct
