import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import StarRating from '../../components/StarRating'
import { getProducts } from '../../services/products'
import { useT } from '../../context/LanguageContext'

/**
 * The public shop window.
 *
 * The catalog lives behind a login, which means every visitor from a shared
 * reel, a portfolio link or a search result hits a login wall before seeing a
 * single deal. This is the same real catalog (the products API is public),
 * browsable by anyone — with one difference: the buy button says "join free".
 * A marketplace that hides its inventory converts nobody.
 */
const Explore = () => {
  const t = useT()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const categories = ['All', 'Beauty', 'Skincare', 'Fashion', 'Tech', 'Lifestyle']

  // `loading` starts true; category buttons flip it back on themselves, so
  // every setState in this effect happens inside a promise callback.
  useEffect(() => {
    let alive = true
    getProducts(category !== 'All' ? { category, sort: 'cashback' } : { sort: 'cashback' })
      .then(d => { if (alive) setProducts(d.products || []) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [category])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '110px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            {t('explore.title')}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(var(--ink-rgb),0.5)', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
            {t('explore.subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
          {categories.map(c => (
            <button key={c} onClick={() => { setLoading(true); setCategory(c) }} style={{
              padding: '8px 20px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              background: category === c ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(var(--ink-rgb),0.04)',
              color: category === c ? '#fff' : 'rgba(var(--ink-rgb),0.45)',
              border: category === c ? 'none' : '1px solid rgba(var(--ink-rgb),0.08)',
            }}>{c}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 28, marginBottom: 8 }}>🛍️</p>
            <p>{t('explore.empty')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 18 }}>
            {products.map(p => {
              const price = p.price || 0
              const netPrice = Math.round(price * (1 - (p.cashbackRate || 0) / 100))
              return (
                <div key={p._id} style={{
                  borderRadius: 18, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)',
                  overflow: 'hidden', display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ aspectRatio: '1.2', background: 'rgba(var(--ink-rgb),0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, position: 'relative' }}>
                    {p.image && (p.image.startsWith('http') || p.image.startsWith('/'))
                      ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      : <span>{p.image || '📦'}</span>}
                    <div style={{ position: 'absolute', top: 10, right: 10, padding: '4px 10px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                      {p.cashbackRate}% back
                    </div>
                  </div>
                  <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>{p.brand}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>{p.name}</p>
                      {p.reviews > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <StarRating value={p.rating} size={12} />
                          <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)' }}>{p.rating} ({p.reviews})</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', background: 'rgba(var(--ink-rgb),0.02)', padding: '8px 12px', borderRadius: 10 }}>
                      <div>
                        <span style={{ display: 'block', fontSize: 10, color: 'rgba(var(--ink-rgb),0.3)', textTransform: 'uppercase' }}>{t('explore.retail')}</span>
                        <span style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.4)', textDecoration: 'line-through' }}>৳{price.toLocaleString()}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: 10, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase' }}>{t('explore.yourCost')}</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#4ade80' }}>৳{netPrice.toLocaleString()}</span>
                      </div>
                    </div>
                    <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', padding: '10px 0', fontSize: 12 }}>
                      {t('explore.cta')}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 56, padding: 32, borderRadius: 24, background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.07))', border: '1px solid rgba(124,58,237,0.25)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>{t('explore.bottomTitle')}</h2>
          <p style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),0.5)', margin: '0 0 20px' }}>{t('explore.bottomSubtitle')}</p>
          <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '14px 34px', fontSize: 14 }}>
            {t('hero.cta')}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Explore
