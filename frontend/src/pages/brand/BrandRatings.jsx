import React from 'react'

const ratings = [
  { creator: 'Tasnim Rahman', product: 'Matte Lipstick Set', quality: 5, shipping: 4, support: 5, comment: 'Amazing product quality! Fast shipping too.', date: '2026-06-28' },
  { creator: 'Priya Das', product: 'Vitamin C Serum', quality: 4, shipping: 5, support: 4, comment: 'Love the serum, skin feels so fresh after using.', date: '2026-06-25' },
  { creator: 'Ayesha Karim', product: 'Face Wash Gel', quality: 5, shipping: 3, support: 4, comment: 'Great product but shipping was a bit slow.', date: '2026-06-20' },
  { creator: 'Nusrat Jahan', product: 'Sunscreen SPF50+', quality: 5, shipping: 5, support: 5, comment: 'Perfect sunscreen! Will definitely repurchase.', date: '2026-06-18' },
  { creator: 'Rafiq Hossain', product: 'Hair Styling Clay', quality: 4, shipping: 4, support: 3, comment: 'Good hold, nice texture. Works as expected.', date: '2026-06-15' },
]

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
  const avgQuality = (ratings.reduce((s, r) => s + r.quality, 0) / ratings.length).toFixed(1)
  const avgShipping = (ratings.reduce((s, r) => s + r.shipping, 0) / ratings.length).toFixed(1)
  const avgSupport = (ratings.reduce((s, r) => s + r.support, 0) / ratings.length).toFixed(1)
  const overall = ((Number(avgQuality) + Number(avgShipping) + Number(avgSupport)) / 3).toFixed(1)

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Brand Reputation</h1>
          <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-bold border border-orange-500/20">★ NEW</span>
        </div>
        <p className="text-zinc-500">Creator feedback on your products and service</p>
      </div>

      {/* Overall score */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 text-center">
          <p className="text-4xl font-extrabold text-yellow-400 mb-1">{overall}</p>
          <Stars count={Math.round(overall)} />
          <p className="text-xs text-zinc-500 mt-2">Overall Score</p>
        </div>
        {[{ l: 'Product Quality', v: avgQuality, c: 'text-emerald-400' }, { l: 'Shipping Speed', v: avgShipping, c: 'text-blue-400' }, { l: 'Support', v: avgSupport, c: 'text-violet-400' }].map(m => (
          <div key={m.l} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
            <p className={`text-2xl font-extrabold ${m.c}`}>{m.v}</p>
            <p className="text-xs text-zinc-500 mt-1">{m.l}</p>
          </div>
        ))}
      </div>

      {/* Reviews */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
        <h2 className="text-lg font-bold text-white mb-5">Creator Reviews ({ratings.length})</h2>
        <div className="space-y-4">
          {ratings.map((r, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.03]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">{r.creator}</p>
                <span className="text-xs text-zinc-600">{r.date}</span>
              </div>
              <p className="text-xs text-zinc-500 mb-2">{r.product}</p>
              <div className="flex gap-4 mb-3">
                {[{ l: 'Quality', v: r.quality }, { l: 'Shipping', v: r.shipping }, { l: 'Support', v: r.support }].map(s => (
                  <div key={s.l} className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500">{s.l}:</span>
                    <Stars count={s.v} />
                  </div>
                ))}
              </div>
              <p className="text-sm text-zinc-300 italic">"{r.comment}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BrandRatings
