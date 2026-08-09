import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../../services/products'

const Catalog = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [minCashback, setMinCashback] = useState(0)
  const [maxPrice, setMaxPrice] = useState(10000)
  const [brand, setBrand] = useState('All')
  const [sortBy, setSortBy] = useState('cashback')
  const [categories, setCategories] = useState(['All', 'Beauty', 'Skincare', 'Fashion', 'Tech', 'Lifestyle'])
  const [brands, setBrands] = useState(['All'])

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), search ? 350 : 0)
    return () => clearTimeout(timer)
  }, [search, category, minCashback, maxPrice, brand, sortBy])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = { sort: sortBy }
      if (category !== 'All') params.category = category
      if (brand !== 'All') params.brand = brand
      if (search) params.q = search
      if (minCashback > 0) params.minCashback = minCashback
      if (maxPrice < 10000) params.maxPrice = maxPrice

      const data = await getProducts(params)
      const prods = data.products || []
      setProducts(prods)

      const extractedBrands = ['All', ...new Set(prods.map(p => p.brand).filter(Boolean))]
      setBrands(extractedBrands)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setCategory('All')
    setMinCashback(0)
    setMaxPrice(10000)
    setBrand('All')
    setSortBy('cashback')
  }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Browse Products</span></div>
        <h1 className="page-title">Shop Catalog & Category Filter</h1>
        <p className="page-subtitle">Browse products and earn 30% to 70% verified cashback by sharing authentic content</p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Search</label>
            <div style={{ position: 'relative' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or brands..."
                className="field-input" style={{ paddingLeft: 42 }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Brand Partner</label>
            <select value={brand} onChange={e => setBrand(e.target.value)} className="field-select">
              {brands.map(b => (
                <option key={b} value={b} style={{ background: '#0d0d20' }}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Sort By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="field-select">
              <option value="cashback" style={{ background: '#0d0d20' }}>Highest Cashback</option>
              <option value="price_low" style={{ background: '#0d0d20' }}>Price: Low → High</option>
              <option value="price_high" style={{ background: '#0d0d20' }}>Price: High → Low</option>
              <option value="rating" style={{ background: '#0d0d20' }}>Top Rated</option>
              <option value="newest" style={{ background: '#0d0d20' }}>Newest</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Max Retail Price</label>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>৳{maxPrice.toLocaleString()}</span>
            </div>
            <input type="range" min="1000" max="10000" step="500" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Min Cashback %</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 40, 50, 60].map(val => (
                <button key={val} onClick={() => setMinCashback(val)} style={{
                  flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  background: minCashback === val ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.04)',
                  color: minCashback === val ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                  border: minCashback === val ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)'
                }}>
                  {val === 0 ? 'Any' : `${val}%+`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 14 }}>
            <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: '#67e8f9', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            background: category === c ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.04)',
            color: category === c ? '#fff' : 'rgba(255,255,255,0.45)',
            border: category === c ? 'none' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: category === c ? '0 0 20px rgba(124,58,237,0.3)' : 'none',
          }}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 28, marginBottom: 8 }}>🔍</p>
          <p>No products match your filter criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 18 }}>
          {products.map(p => {
            const price = p.price || 0
            const cashbackRate = p.cashbackRate || 0
            const netPrice = Math.round(price * (1 - cashbackRate / 100))

            return (
              <Link key={p._id} to={`/creator/product/${p._id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ aspectRatio: '1.2', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, position: 'relative' }}>
                    {p.image && (p.image.startsWith('http') || p.image.startsWith('/')) ? (
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{p.image || '📦'}</span>
                    )}
                    <div style={{ position: 'absolute', top: 10, right: 10, padding: '4px 10px', borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                      {cashbackRate}% back
                    </div>
                  </div>

                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>{p.brand}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>{p.name}</p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <span style={{ fontSize: 11, color: '#a78bfa', background: 'rgba(124,58,237,0.15)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                          {(p.creatorCriteria?.minFollowers || 1000).toLocaleString()}+ Followers
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Retail</span>
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through' }}>৳{price.toLocaleString()}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block', fontSize: 10, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase' }}>Net Cost</span>
                          <span style={{ fontSize: 16, fontWeight: 800, color: '#4ade80' }}>৳{netPrice.toLocaleString()}</span>
                        </div>
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

export default Catalog
