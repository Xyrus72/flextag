import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const products = [
  { id: 1, name: 'Matte Lipstick Set', brand: 'GlowUp Cosmetics', price: 1200, cashback: 50, category: 'Beauty', image: '💄', rating: 4.8, reviews: 124, inStock: true },
  { id: 2, name: 'Gym Tank Top', brand: 'UrbanFit BD', price: 800, cashback: 40, category: 'Fashion', image: '👕', rating: 4.5, reviews: 89, inStock: true },
  { id: 3, name: 'Wireless Earbuds Pro', brand: 'TechNova', price: 3500, cashback: 35, category: 'Tech', image: '🎧', rating: 4.9, reviews: 256, inStock: true },
  { id: 4, name: 'Vitamin C Serum', brand: 'SkinLab BD', price: 950, cashback: 65, category: 'Beauty', image: '🧴', rating: 4.7, reviews: 198, inStock: true },
  { id: 5, name: 'Cropped Hoodie', brand: 'StreetWear Co.', price: 1500, cashback: 45, category: 'Fashion', image: '🧥', rating: 4.3, reviews: 67, inStock: true },
  { id: 6, name: 'Face Wash Gel', brand: 'GlowUp Cosmetics', price: 450, cashback: 60, category: 'Beauty', image: '🫧', rating: 4.6, reviews: 145, inStock: false },
  { id: 7, name: 'Smart Watch Band', brand: 'TechNova', price: 2200, cashback: 30, category: 'Tech', image: '⌚', rating: 4.4, reviews: 76, inStock: true },
  { id: 8, name: 'Hair Styling Clay', brand: 'SkinLab BD', price: 650, cashback: 55, category: 'Beauty', image: '💇', rating: 4.2, reviews: 54, inStock: true },
  { id: 9, name: 'Canvas Tote Bag', brand: 'StreetWear Co.', price: 700, cashback: 50, category: 'Fashion', image: '👜', rating: 4.6, reviews: 112, inStock: true },
  { id: 10, name: 'Bluetooth Speaker Mini', brand: 'TechNova', price: 1800, cashback: 40, category: 'Tech', image: '🔊', rating: 4.7, reviews: 203, inStock: true },
  { id: 11, name: 'Sunscreen SPF50+', brand: 'SkinLab BD', price: 550, cashback: 70, category: 'Beauty', image: '☀️', rating: 4.8, reviews: 167, inStock: true },
  { id: 12, name: 'Denim Jacket', brand: 'UrbanFit BD', price: 2800, cashback: 35, category: 'Fashion', image: '🧥', rating: 4.5, reviews: 91, inStock: true },
]

const categories = ['All', 'Beauty', 'Fashion', 'Tech', 'Lifestyle']

const Catalog = () => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState('cashback')
  const [priceRange, setPriceRange] = useState([0, 5000])

  const filtered = products
    .filter(p => (category === 'All' || p.category === category))
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()))
    .filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])
    .sort((a, b) => sortBy === 'cashback' ? b.cashback - a.cashback : sortBy === 'price_low' ? a.price - b.price : sortBy === 'price_high' ? b.price - a.price : b.rating - a.rating)

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

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(p => (
          <Link key={p.id} to={`/creator/product/${p.id}`}
            className="group rounded-2xl bg-white/[0.03] border border-white/5 hover:border-orange-500/20 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/5 no-underline">
            <div className="aspect-square bg-white/[0.02] flex items-center justify-center text-5xl relative">
              <span>{p.image}</span>
              {/* Cashback badge */}
              <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-orange-500/90 text-white text-xs font-bold shadow-lg">
                {p.cashback}% back
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
              <div className="flex items-center gap-1 mt-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span className="text-xs text-zinc-400">{p.rating} ({p.reviews})</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <span className="text-lg font-bold text-white">৳{p.price.toLocaleString()}</span>
                  <span className="text-xs text-emerald-400 block">Net: ৳{Math.round(p.price * (1 - p.cashback / 100)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg text-zinc-400">No products found</p>
          <p className="text-sm text-zinc-600">Try adjusting your filters</p>
        </div>
      )}
    </div>
  )
}

export default Catalog
