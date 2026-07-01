import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'

const allProducts = [
  { id: 1, name: 'Matte Lipstick Set', brand: 'GlowUp Cosmetics', price: 1200, cashback: 50, category: 'Beauty', image: '💄', rating: 4.8, reviews: 124, inStock: true, desc: 'Premium matte lipstick set with 6 versatile shades perfect for everyday wear. Long-lasting formula that stays vibrant all day.', requirements: ['Tag @glowupbd', 'Use #GlowUpMatte #FlextagCreator', 'Reel or Post, min 15 seconds', 'Product must be visible'], retention: 7 },
  { id: 2, name: 'Gym Tank Top', brand: 'UrbanFit BD', price: 800, cashback: 40, category: 'Fashion', image: '👕', rating: 4.5, reviews: 89, inStock: true, desc: 'Breathable gym tank top made from premium moisture-wicking fabric. Available in 5 colors.', requirements: ['Tag @urbanfitbd', 'Use #UrbanFitBD #GymWear', 'Show the product being worn', 'Story or Post'], retention: 7 },
  { id: 3, name: 'Wireless Earbuds Pro', brand: 'TechNova', price: 3500, cashback: 35, category: 'Tech', image: '🎧', rating: 4.9, reviews: 256, inStock: true, desc: 'Premium wireless earbuds with active noise cancellation, 32-hour battery life, and crystal-clear audio.', requirements: ['Tag @technovabd', 'Use #TechNovaPro', 'Demonstrate product features', 'Reel preferred'], retention: 7 },
]

const ProductDetail = () => {
  const { id } = useParams()
  const product = allProducts.find(p => p.id === Number(id)) || allProducts[0]
  const [qty, setQty] = useState(1)

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <Link to="/creator/catalog" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-orange-400 mb-6 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Catalog
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-[120px] relative overflow-hidden">
          <span>{product.image}</span>
          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-orange-500/90 text-white text-sm font-bold shadow-lg">{product.cashback}% Cashback</div>
        </div>

        {/* Info */}
        <div>
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{product.brand}</span>
          <h1 className="text-3xl font-bold text-white mt-2">{product.name}</h1>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < Math.floor(product.rating) ? '#fbbf24' : '#27272a'} stroke={i < Math.floor(product.rating) ? '#fbbf24' : '#3f3f46'} strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}
            </div>
            <span className="text-sm text-zinc-400">{product.rating} · {product.reviews} reviews</span>
          </div>

          <p className="text-zinc-400 mt-4 leading-relaxed">{product.desc}</p>

          {/* Pricing */}
          <div className="mt-6 p-5 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-500">Retail Price</span>
              <span className="text-xl font-bold text-white">৳{product.price.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-500">Cashback ({product.cashback}%)</span>
              <span className="text-xl font-bold text-emerald-400">-৳{Math.round(product.price * product.cashback / 100).toLocaleString()}</span>
            </div>
            <div className="border-t border-white/5 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-300">Your Net Cost</span>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                ৳{Math.round(product.price * (1 - product.cashback / 100)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Requirements */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Posting Requirements</h3>
            <div className="space-y-2">
              {product.requirements?.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  {r}
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Retention period: {product.retention} days
              </div>
            </div>
          </div>

          {/* Add to Cart */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center rounded-xl bg-white/5 border border-white/10">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3 text-zinc-400 hover:text-white transition-colors">−</button>
              <span className="px-4 py-3 text-white font-semibold min-w-[40px] text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-3 text-zinc-400 hover:text-white transition-colors">+</button>
            </div>
            <Link to="/creator/cart" className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold text-center shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all">
              Add to Cart — ৳{(product.price * qty).toLocaleString()}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
