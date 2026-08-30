import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWishlist } from '../../services/users'
import WishlistButton from '../../components/WishlistButton'
import StarRating from '../../components/StarRating'
import { useT } from '../../context/LanguageContext'
import { Package } from 'lucide-react'

/**
 * Saved products.
 *
 * Campaigns run out of budget and stock, so this page shows the CURRENT state
 * of each saved product — cap reached, out of stock — rather than a frozen
 * snapshot from the day it was saved.
 */
const Wishlist = () => {
  const t = useT()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getWishlist()
      .then(d => { if (alive) setProducts(d.products || []) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const drop = (id) => setProducts(prev => prev.filter(p => String(p._id) !== String(id)))

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Saved</span></div>
        <h1 className="page-title">{t('page.wishlist.title')}</h1>
        <p className="page-subtitle">{t('page.wishlist.subtitle')}</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 28, marginBottom: 8 }}>🤍</p>
          <p>Nothing saved yet.</p>
          <Link to="/creator/catalog" style={{ color: '#67e8f9', fontSize: 13, fontWeight: 600 }}>Browse the catalog →</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 18 }}>
          {products.map(p => {
            const price = p.price || 0
            const netPrice = Math.round(price * (1 - (p.cashbackRate || 0) / 100))
            const capReached = p.campaignBudget && (p.totalCashbackSpent || 0) >= p.campaignBudget
            const unavailable = capReached || p.inStock === false
            return (
              <Link key={p._id} to={`/creator/product/${p._id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  borderRadius: 14, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)',
                  overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', opacity: unavailable ? 0.65 : 1,
                }}>
                  <div style={{ aspectRatio: '1.2', background: 'rgba(var(--ink-rgb),0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, position: 'relative' }}>
                    {p.image && (p.image.startsWith('http') || p.image.startsWith('/')) ? (
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (<Package size={22} strokeWidth={1.5} style={{ color: 'rgba(var(--ink-rgb),0.25)' }} />)}
                    <div style={{ position: 'absolute', top: 10, left: 10 }}>
                      <WishlistButton productId={p._id} saved onChange={() => drop(p._id)} size={16} floating />
                    </div>
                    <div style={{ position: 'absolute', top: 10, right: 10, padding: '4px 10px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                      {p.cashbackRate}% back
                    </div>
                    {unavailable && (
                      <div style={{ position: 'absolute', bottom: 10, left: 10, padding: '4px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', fontSize: 10, fontWeight: 800 }}>
                        {capReached ? 'Cap reached' : 'Out of stock'}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>{p.brand}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3 }}>{p.name}</p>
                      {p.reviews > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <StarRating value={p.rating} size={12} />
                          <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)' }}>{p.rating} ({p.reviews})</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', background: 'rgba(var(--ink-rgb),0.02)', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(var(--ink-rgb),0.05)' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: 10, color: 'rgba(var(--ink-rgb),0.3)', textTransform: 'uppercase' }}>Retail</span>
                        <span style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.4)', textDecoration: 'line-through' }}>৳{price.toLocaleString()}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: 10, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase' }}>Net cost</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#4ade80' }}>৳{netPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Wishlist
