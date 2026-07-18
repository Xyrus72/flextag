import React, { useState, useEffect } from 'react'
import { getBrandRatings } from '../../services/users'

const Stars = ({ count }) => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, i) => (
      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < count ? '#fbbf24' : '#27272a'} stroke={i < count ? '#fbbf24' : '#3f3f46'} strokeWidth="1">
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
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Brand Reputation</h1>
          <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-bold border border-orange-500/20">★ NEW</span>
        </div>
        <p className="text-zinc-500">Creator feedback on your products and service</p>
      </div>

      {/* Overall scores */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 text-center">
          <p className="text-4xl font-extrabold text-yellow-400 mb-1">{loading ? '...' : overall}</p>
          {!loading && ratings.length > 0 && <Stars count={Math.round(Number(overall))} />}
          <p className="text-xs text-zinc-500 mt-2">Overall Score</p>
        </div>
        {[
          { l: 'Product Quality', v: avgQuality,  c: 'text-emerald-400' },
          { l: 'Shipping Speed',  v: avgShipping, c: 'text-blue-400' },
          { l: 'Support',         v: avgSupport,  c: 'text-violet-400' },
        ].map(m => (
          <div key={m.l} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
            <p className={`text-2xl font-extrabold ${m.c}`}>{loading ? '...' : m.v}</p>
            <p className="text-xs text-zinc-500 mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      {/* Reviews */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h2 className="text-lg font-bold text-white mb-5">Creator Reviews ({loading ? '...' : ratings.length})</h2>
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /></div>
        ) : ratings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 rounded-xl border border-dashed border-white/10">
            <p className="text-4xl mb-3">⭐</p>
            <p className="text-sm text-zinc-400">No reviews yet</p>
            <p className="text-xs text-zinc-600 mt-1">Reviews will appear when creators rate your orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ratings.map(r => (
              <div key={r._id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-white">{r.creatorId?.name || 'Creator'}</p>
                  <span className="text-xs text-zinc-600">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-2">{r.orderId?.product || 'Product'}</p>
                <div className="flex gap-4 mb-3">
                  {[{ l: 'Quality', v: r.quality || 0 }, { l: 'Shipping', v: r.shipping || 0 }, { l: 'Support', v: r.support || 0 }].map(s => (
                    <div key={s.l} className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">{s.l}:</span>
                      <Stars count={s.v} />
                    </div>
                  ))}
                </div>
                {r.comment && <p className="text-sm text-zinc-300 italic">"{r.comment}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BrandRatings
