import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getProduct } from '../../services/products'
import { getCampaigns } from '../../services/campaigns'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct]   = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [qty, setQty]           = useState(1)

  useEffect(() => {
    const load = async () => {
      try {
        // Try to load as product first
        const { product: p } = await getProduct(id).catch(() => ({ product: null }))
        if (p) {
          setProduct(p)
          // Find associated campaign
          const { campaigns } = await getCampaigns({ status: 'active' })
          const camp = campaigns.find(c => c.product === p.name || c.productId === p._id)
          setCampaign(camp || null)
        } else {
          // id might be a campaign id — load campaign as "product"
          const { campaigns } = await getCampaigns()
          const camp = campaigns.find(c => c._id === id)
          if (camp) {
            setCampaign(camp)
            setProduct({
              _id: camp._id,
              name: camp.product,
              brand: camp.brand,
              price: camp.price,
              cashbackRate: camp.cashbackRate,
              image: '📦',
              rating: 0,
              reviews: 0,
              inStock: camp.stockLeft > 0,
              description: '',
            })
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const addToCart = () => {
    const cartKey = 'flextag_cart'
    const existing = JSON.parse(localStorage.getItem(cartKey) || '[]')
    const item = { ...product, campaignId: campaign?._id, qty }
    const idx = existing.findIndex(i => i._id === item._id)
    if (idx >= 0) existing[idx].qty += qty
    else existing.push(item)
    localStorage.setItem(cartKey, JSON.stringify(existing))
    navigate('/creator/cart')
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8 min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-4 lg:p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg text-zinc-400">Product not found</p>
          <Link to="/creator/catalog" className="text-violet-400 hover:text-violet-300 mt-2 block">Back to Catalog</Link>
        </div>
      </div>
    )
  }

  const netCost = Math.round(product.price * (1 - (product.cashbackRate || 0) / 100))

  return (
    <div className="page-root">
      <Link to="/creator/catalog" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-violet-400 mb-6 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Catalog
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-[120px] relative overflow-hidden">
          <span>{product.image || '📦'}</span>
          {product.cashbackRate > 0 && (
            <div style={{ position:'absolute', top:16, right:16, padding:'6px 14px', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#06b6d4)', color:'#fff', fontSize:13, fontWeight:800, boxShadow:'0 0 20px rgba(124,58,237,0.4)' }}>
              {product.cashbackRate}% Cashback
            </div>
          )}
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-xl font-bold text-zinc-400">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{product.brand}</span>
          <h1 className="text-3xl font-bold text-white mt-2">{product.name}</h1>
          {product.rating > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < Math.floor(product.rating) ? '#fbbf24' : '#27272a'} stroke={i < Math.floor(product.rating) ? '#fbbf24' : '#3f3f46'} strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ))}
              </div>
              <span className="text-sm text-zinc-400">{product.rating} · {product.reviews} reviews</span>
            </div>
          )}

          {product.description && <p className="text-zinc-400 mt-4 leading-relaxed">{product.description}</p>}

          {/* Pricing */}
          <div className="mt-6 p-5 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-500">Retail Price</span>
              <span className="text-xl font-bold text-white">৳{product.price?.toLocaleString()}</span>
            </div>
            {product.cashbackRate > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-zinc-500">Cashback ({product.cashbackRate}%)</span>
                <span className="text-xl font-bold text-emerald-400">-৳{Math.round(product.price * product.cashbackRate / 100).toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-white/5 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-300">Your Net Cost</span>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-violet-500 to-cyan-400 bg-clip-text text-transparent">
                ৳{netCost.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Campaign requirements */}
          {campaign && (campaign.hashtags || campaign.handles || campaign.retentionDays) && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Posting Requirements</h3>
              <div className="space-y-2">
                {campaign.hashtags && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Hashtags: {campaign.hashtags}
                  </div>
                )}
                {campaign.handles && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Tag: {campaign.handles}
                  </div>
                )}
                {campaign.minFollowers > 0 && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Minimum {campaign.minFollowers.toLocaleString()} followers required
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Retention period: {campaign.retentionDays || 7} days
                </div>
              </div>
            </div>
          )}

          {/* Add to Cart */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center rounded-xl bg-white/5 border border-white/10">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3 text-zinc-400 hover:text-white transition-colors">−</button>
              <span className="px-4 py-3 text-white font-semibold min-w-[40px] text-center">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-3 text-zinc-400 hover:text-white transition-colors">+</button>
            </div>
            <button onClick={addToCart} disabled={!product.inStock}
              className="btn-primary" style={{ flex:1, padding:'14px', fontSize:14 }}>
              {product.inStock ? `Add to Cart — ৳${(product.price * qty).toLocaleString()}` : 'Out of Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
