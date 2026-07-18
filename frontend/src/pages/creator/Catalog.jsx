import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../../services/products'

const Catalog = () => {
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('All')
  const [sortBy, setSortBy]       = useState('cashback')
  const [categories, setCategories] = useState(['All'])

  // Load products on filter change (debounced search)
  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), search ? 400 : 0)
    return () => clearTimeout(timer)
  }, [search, category, sortBy])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = { sort: sortBy }
      if (category !== 'All') params.category = category
      if (search)             params.q = search
      const data = await getProducts(params)
      const prods = data.products || []
      setProducts(prods)

      // Derive unique categories
      const cats = ['All', ...new Set(prods.map(p => p.category).filter(Boolean))]
      setCategories(cats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Shop Catalog</h1>
        <p className="text-zinc-500 mt-1">Browse products and earn cashback by promoting them</p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px]">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or brands..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all placeholder:text-zinc-600" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm focus:border-orange-500 outline-none cursor-pointer">
          <option value="cashback">Highest Cashback</option>
          <option value="price_low">Price: Low → High</option>
          <option value="price_high">Price: High → Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${category === c ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/5'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Product Grid */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <Link key={p._id} to={`/creator/product/${p._id}`}
              className="group rounded-2xl bg-white/[0.03] border border-white/5 hover:border-orange-500/20 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/5 no-underline">
              <div className="aspect-square bg-white/[0.02] flex items-center justify-center text-5xl relative">
                <span>{p.image || '📦'}</span>
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-orange-500/90 text-white text-xs font-bold shadow-lg">
                  {p.cashbackRate}% back
                </div>
                {!p.inStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-sm font-bold text-zinc-400">Out of Stock</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-zinc-500 mb-1">{p.brand}</p>
                <p className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors truncate">{p.name}</p>
                {p.rating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span className="text-xs text-zinc-400">{p.rating} ({p.reviews})</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="text-lg font-bold text-white">৳{p.price?.toLocaleString()}</span>
                    <span className="text-xs text-emerald-400 block">Net: ৳{Math.round(p.price * (1 - p.cashbackRate / 100)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg text-zinc-400">No products found</p>
          <p className="text-sm text-zinc-600">Try adjusting your filters or check back later</p>
        </div>
      )}
    </div>
  )
}

export default Catalog
