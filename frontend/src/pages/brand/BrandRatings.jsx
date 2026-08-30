import { useState, useEffect } from 'react'
import { getBrandRatings } from '../../services/users'
import { Star } from 'lucide-react'

const Stars = ({ count }) => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, i) => (
      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < count ? '#fbbf24' : 'rgba(var(--ink-rgb),0.12)'} stroke={i < count ? '#fbbf24' : 'rgba(var(--ink-rgb),0.25)'} strokeWidth="1">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ))}
  </div>
)

const BrandRatings = () => {
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBrandRatings()
      .then(d => setRatings(d.ratings || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const avgQuality  = ratings.length ? (ratings.reduce((s, r) => s + (r.quality  || 0), 0) / ratings.length).toFixed(1) : '—'
  const avgShipping = ratings.length ? (ratings.reduce((s, r) => s + (r.shipping || 0), 0) / ratings.length).toFixed(1) : '—'
  const avgSupport  = ratings.length ? (ratings.reduce((s, r) => s + (r.support  || 0), 0) / ratings.length).toFixed(1) : '—'
  const overall     = ratings.length ? (([avgQuality, avgShipping, avgSupport].reduce((s, v) => s + Number(v), 0)) / 3).toFixed(1) : '—'

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Brand · Reputation</span></div>
        <h1 className="page-title">Brand reputation</h1>
        <p className="page-subtitle">Creator feedback on your products and service</p>
      </div>

      {/* Overall scores */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div style={{ padding: 24, borderRadius: 16, textAlign: 'center', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <p className="tnum" style={{ fontSize: 32, fontWeight: 800, color: 'var(--amber-ink)', marginBottom: 4 }}>{loading ? '—' : overall}</p>
          {!loading && ratings.length > 0 && <Stars count={Math.round(Number(overall))} />}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Overall score</p>
        </div>
        {[
          { l: 'Product quality', v: avgQuality,  c: 'var(--green-ink)' },
          { l: 'Shipping speed',  v: avgShipping, c: '#60a5fa' },
          { l: 'Support',         v: avgSupport,  c: 'var(--violet-ink)' },
        ].map(m => (
          <div key={m.l} className="stat-card" style={{ textAlign: 'center' }}>
            <p className="tnum" style={{ fontSize: 22, fontWeight: 800, color: m.c }}>{loading ? '—' : m.v}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{m.l}</p>
          </div>
        ))}
      </div>

      {/* Reviews */}
      <div style={{ borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)', padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>Creator reviews ({loading ? '—' : ratings.length})</h2>
        {loading ? (
          <div className="flex justify-center py-10"><div className="spinner" /></div>
        ) : ratings.length === 0 ? (
          <div className="empty-state" style={{ border: '1px dashed rgba(var(--ink-rgb),0.1)' }}>
            <Star size={28} strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: 10 }} />
            <p>No reviews yet</p>
            <p>Reviews will appear when creators rate your orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ratings.map(r => (
              <div key={r._id} style={{ padding: 16, borderRadius: 12, background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.04)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.creatorId?.name || 'Creator'}</p>
                  <span style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{r.orderId?.product || 'Product'}</p>
                <div className="flex gap-4 mb-3">
                  {[{ l: 'Quality', v: r.quality || 0 }, { l: 'Shipping', v: r.shipping || 0 }, { l: 'Support', v: r.support || 0 }].map(s => (
                    <div key={s.l} className="flex items-center gap-1">
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.l}:</span>
                      <Stars count={s.v} />
                    </div>
                  ))}
                </div>
                {r.comment && <p style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),0.72)', fontStyle: 'italic' }}>"{r.comment}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BrandRatings
