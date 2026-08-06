import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../../services/products'

const Catalog = () => {
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [category, setCategory]     = useState('All')
  const [sortBy, setSortBy]         = useState('cashback')
  const [categories, setCategories] = useState(['All'])

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), search ? 400 : 0)
    return () => clearTimeout(timer)
  }, [search, category, sortBy])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = { sort: sortBy }
      if (category !== 'All') params.category = category
      if (search) params.q = search
      const data = await getProducts(params)
      const prods = data.products || []
      setProducts(prods)
      setCategories(['All', ...new Set(prods.map(p => p.category).filter(Boolean))])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Browse Products</span></div>
        <h1 className="page-title">Shop Catalog</h1>
        <p className="page-subtitle">Browse products and earn 30-70% cashback by promoting them</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div style={{ flex:1, minWidth:220 }}>
          <div style={{ position:'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or brands..."
              className="field-input" style={{ paddingLeft:42 }} />
          </div>
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="field-select" style={{ width:'auto', minWidth:180 }}>
          <option value="cashback" style={{ background:'#0d0d20' }}>Highest Cashback</option>
          <option value="price_low" style={{ background:'#0d0d20' }}>Price: Low → High</option>
          <option value="price_high" style={{ background:'#0d0d20' }}>Price: High → Low</option>
          <option value="rating" style={{ background:'#0d0d20' }}>Top Rated</option>
        </select>
      </div>

      {/* Category pills */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            padding:'8px 18px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s',
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
        <div style={{ display:'flex', justifyContent:'center', padding:'80px 0' }}><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <p>🔍</p>
          <p>No products found — try adjusting your filters</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
          {products.map(p => (
            <Link key={p._id} to={`/creator/product/${p._id}`} style={{ textDecoration:'none' }}>
              <div style={{
                borderRadius:18, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                overflow:'hidden', transition:'all 0.2s', cursor:'pointer',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(124,58,237,0.3)'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 16px 40px rgba(0,0,0,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none' }}
              >
                {/* Image */}
                <div style={{ aspectRatio:'1', background:'rgba(255,255,255,0.02)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48, position:'relative' }}>
                  <span>{p.image || '📦'}</span>
                  <div style={{ position:'absolute', top:10, right:10, padding:'4px 10px', borderRadius:8, background:'linear-gradient(135deg,#7c3aed,#06b6d4)', color:'#fff', fontSize:11, fontWeight:800 }}>
                    {p.cashbackRate}% back
                  </div>
                  {!p.inStock && (
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.5)' }}>Out of Stock</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding:'16px' }}>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:4 }}>{p.brand}</p>
                  <p style={{ fontSize:14, fontWeight:600, color:'#fff', marginBottom:8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</p>
                  {p.rating > 0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:10 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{p.rating} ({p.reviews})</span>
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                    <span style={{ fontSize:18, fontWeight:800, color:'#fff' }}>৳{p.price?.toLocaleString()}</span>
                    <span style={{ fontSize:11, color:'#4ade80' }}>Net: ৳{Math.round(p.price*(1-p.cashbackRate/100)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Catalog
