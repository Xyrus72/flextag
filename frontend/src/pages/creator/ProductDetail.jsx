import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getProduct, getProductReviews } from '../../services/products'
import StarRating from '../../components/StarRating'
import WishlistButton from '../../components/WishlistButton'
import { API_URL } from '../../config'
import { getWishlist } from '../../services/users'
import { getCampaigns } from '../../services/campaigns'
import { startConversation } from '../../services/messages'
import { Package, ChevronLeft, Share2, MessageCircle, SearchX } from 'lucide-react'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [reviews, setReviews] = useState({ reviews: [], average: 0, count: 0 })
  const [savedIds, setSavedIds] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const { product: p } = await getProduct(id).catch(() => ({ product: null }))
        if (p) {
          setProduct(p)
          const { campaigns } = await getCampaigns({ status: 'active' }).catch(() => ({ campaigns: [] }))
          const camp = (campaigns || []).find(c => c.product === p.name || c.productId === p._id)
          setCampaign(camp || null)
        } else {
          const { campaigns } = await getCampaigns().catch(() => ({ campaigns: [] }))
          const camp = (campaigns || []).find(c => c._id === id)
          if (camp) {
            setCampaign(camp)
            setProduct({
              _id: camp._id,
              name: camp.product,
              brand: camp.brand,
              price: camp.price,
              cashbackRate: camp.cashbackRate,
              instantSplitPct: camp.instantSplitPct || 0,
              image: '',
              rating: 0,
              reviews: 0,
              inStock: camp.stockLeft > 0,
              description: 'Campaign product available for creator cashback rewards.',
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

  useEffect(() => {
    let alive = true
    getWishlist().then(d => { if (alive) setSavedIds(d.ids || []) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // Reviews are creators rating the product after delivery — only real ones.
  useEffect(() => {
    let alive = true
    getProductReviews(id)
      .then(d => { if (alive) setReviews(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [id])

  const shareProduct = async () => {
    const url = `${API_URL}/share/p/${product._id}`
    const payload = { title: `${product.cashbackRate}% back on ${product.name}`, url }
    if (navigator.share) {
      try { await navigator.share(payload); return } catch { /* dismissed — fall through to copy */ }
    }
    navigator.clipboard?.writeText(url).catch(() => {})
  }

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

  const handleChatWithBrand = async () => {
    try {
      const targetId = product.brandId?._id || product.brandId
      if (targetId) {
        await startConversation({ targetUserId: targetId, type: 'direct' })
      }
    } catch (err) {
      console.error('Error starting brand chat:', err)
    } finally {
      navigate('/support/chat')
    }
  }

  if (loading) {
    return (
      <div className="page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="page-root">
        <div className="empty-state">
          <SearchX size={28} strokeWidth={1.5} style={{ color: 'var(--text-dim)', marginBottom: 10 }} />
          <p>Product not found</p>
          <Link to="/creator/catalog" className="btn-ghost" style={{ marginTop: 16, textDecoration: 'none' }}>Back to catalog</Link>
        </div>
      </div>
    )
  }

  const netCost = Math.round(product.price * (1 - (product.cashbackRate || 0) / 100))
  const totalSpent = product.totalCashbackSpent || 0
  const isCapReached = product.campaignBudget ? totalSpent >= product.campaignBudget : false

  return (
    <div className="page-root">
      <Link to="/creator/catalog" className="inline-flex items-center gap-2 text-sm hover:text-violet-400 mb-6 transition-colors" style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={16} strokeWidth={1.75} />
        Back to catalog
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="aspect-square rounded-2xl flex items-center justify-center relative overflow-hidden" style={{ background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)' }}>
          {product.image && (product.image.startsWith('http') || product.image.startsWith('/')) ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package size={64} strokeWidth={1.5} style={{ color: 'rgba(var(--ink-rgb),0.2)' }} />
          )}
          {product.cashbackRate > 0 && (
            <div className="tnum" style={{ position: 'absolute', top: 16, right: 16, padding: '6px 14px', borderRadius: 10, background: 'var(--purple)', color: '#fff', fontSize: 13, fontWeight: 700 }}>
              {product.cashbackRate}% Cashback
            </div>
          )}
          {isCapReached && (
            <div style={{ position: 'absolute', top: 16, left: 16, padding: '6px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', fontSize: 12, fontWeight: 800 }}>
              Budget cap reached
            </div>
          )}
          {!product.inStock && !isCapReached && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-xl font-bold" style={{ color: 'rgba(var(--ink-rgb),0.6)' }}>Out of stock</span>
            </div>
          )}
        </div>

        <div>
          <span className="text-xs" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: 0, textTransform: 'none' }}>{product.brand}</span>
          <div className="flex items-start justify-between gap-4 mt-2">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{product.name}</h1>
            <div className="flex items-center gap-2">
              {/* Shares the crawler-friendly link, so it unfurls with the actual
                  deal on it instead of a blank card. */}
              <button onClick={shareProduct} title="Share this deal" aria-label="Share this deal"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36,
                  borderRadius: 10, cursor: 'pointer', background: 'rgba(var(--ink-rgb),0.05)',
                  border: '1px solid rgba(var(--ink-rgb),0.1)', color: 'rgba(var(--ink-rgb),0.5)',
                }}>
                <Share2 size={18} strokeWidth={1.75} />
              </button>
              <WishlistButton productId={product._id} saved={savedIds.includes(String(product._id))} onChange={ids => setSavedIds(ids)} />
            </div>
          </div>
          {reviews.count > 0 ? (
            <div className="flex items-center gap-2 mt-3">
              <StarRating value={reviews.average} />
              <span className="text-sm tnum" style={{ color: 'rgba(var(--ink-rgb),0.6)' }}>{reviews.average} · {reviews.count} creator review{reviews.count === 1 ? '' : 's'}</span>
            </div>
          ) : (
            <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>No reviews yet — be the first creator to try it.</p>
          )}

          {product.description && <p className="mt-4 leading-relaxed" style={{ color: 'rgba(var(--ink-rgb),0.6)' }}>{product.description}</p>}

          <div className="mt-6 p-5 rounded-2xl" style={{ background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Retail price</span>
              <span className="text-xl font-bold tnum" style={{ color: 'var(--text)' }}>৳{product.price?.toLocaleString()}</span>
            </div>
            {product.cashbackRate > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm tnum" style={{ color: 'var(--text-muted)' }}>Cashback ({product.cashbackRate}%)</span>
                <span className="text-xl font-bold tnum" style={{ color: 'var(--green-ink)' }}>-৳{Math.round(product.price * product.cashbackRate / 100).toLocaleString()}</span>
              </div>
            )}
            <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(var(--ink-rgb),0.07)' }}>
              <span className="text-sm font-semibold" style={{ color: 'rgba(var(--ink-rgb),0.72)' }}>Your net cost</span>
              <span className="text-2xl font-extrabold tnum" style={{ color: 'var(--text)' }}>
                ৳{netCost.toLocaleString()}
              </span>
            </div>
          </div>

          {product.campaignBudget && (
            <div className="mt-4 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Campaign spend control</span>
                <span className="text-xs font-semibold text-cyan-400 tnum">Cap: ৳{product.campaignBudget.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(var(--ink-rgb),0.1)' }}>
                <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{ width: `${Math.min(100, (totalSpent / product.campaignBudget) * 100)}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs tnum" style={{ color: 'rgba(var(--ink-rgb),0.6)' }}>
                <span>Disbursed: ৳{totalSpent.toLocaleString()}</span>
                <span>Available: ৳{Math.max(0, product.campaignBudget - totalSpent).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="mt-4 p-5 rounded-2xl bg-violet-950/20 border border-violet-500/20">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Posting rules &amp; requirements</h3>
            <div className="space-y-2 text-sm" style={{ color: 'rgba(var(--ink-rgb),0.72)' }}>
              <div>Hashtags: <span className="font-semibold" style={{ color: 'var(--violet-ink)' }}>{product.postingRules?.hashtags?.join(' ') || '#FlexTag #BrandPartner'}</span></div>
              <div>Tag handle: <span className="font-semibold" style={{ color: 'var(--green-ink)' }}>{product.postingRules?.taggingHandles?.join(' ') || '@flextag.official'}</span></div>
              {product.creatorCriteria?.minFollowers > 0 && (
                <div>Min followers: <span className="font-semibold tnum">{product.creatorCriteria.minFollowers.toLocaleString()}</span></div>
              )}
              <div>Retention: <span className="font-semibold">7 days mandatory retention</span></div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center rounded-xl self-center sm:self-auto" style={{ background: 'rgba(var(--ink-rgb),0.05)', border: '1px solid rgba(var(--ink-rgb),0.1)' }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3 transition-colors" style={{ color: 'rgba(var(--ink-rgb),0.6)' }}>−</button>
              <span className="px-4 py-3 font-semibold min-w-[40px] text-center tnum" style={{ color: 'var(--text)' }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-3 transition-colors" style={{ color: 'rgba(var(--ink-rgb),0.6)' }}>+</button>
            </div>
            <button onClick={addToCart} disabled={!product.inStock || isCapReached}
              className="btn-primary tnum" style={{ flex: 1, padding: '14px', fontSize: 14 }}>
              {isCapReached ? 'Budget cap reached' : product.inStock ? `Add to cart — ৳${(product.price * qty).toLocaleString()}` : 'Out of stock'}
            </button>
            <button onClick={handleChatWithBrand} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px' }}>
              <MessageCircle size={16} strokeWidth={1.75} />
              Chat with brand
            </button>
          </div>
        </div>
      </div>

      {/* Creator reviews — written by people who actually received the product */}
      {reviews.count > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
            What creators said ({reviews.count})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {reviews.reviews.map(r => (
              <div key={r.id} style={{ padding: 18, borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                    {r.creator}{r.handle ? <span style={{ color: 'rgba(var(--ink-rgb),0.35)', fontWeight: 400 }}> · @{String(r.handle).replace(/^@/, '')}</span> : null}
                  </p>
                  <StarRating value={r.quality} size={13} />
                </div>
                {r.comment && <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', margin: '0 0 8px' }}>{r.comment}</p>}
                <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.3)', margin: 0 }}>
                  Shipping {r.shipping}/5 · Support {r.support}/5 · {new Date(r.at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductDetail
