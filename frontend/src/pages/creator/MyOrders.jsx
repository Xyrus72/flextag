import React, { useState } from 'react'

const orders = [
  { id: 'ORD-2234', product: 'Matte Lipstick Set', brand: 'GlowUp Cosmetics', date: '2026-06-28', total: 1200, cashback: 600, status: 'delivered', tracking: 'PTH-889921', image: '💄' },
  { id: 'ORD-2235', product: 'Wireless Earbuds Pro', brand: 'TechNova', date: '2026-06-29', total: 3500, cashback: 1225, status: 'shipped', tracking: 'STD-112233', image: '🎧' },
  { id: 'ORD-2236', product: 'Vitamin C Serum (x2)', brand: 'SkinLab BD', date: '2026-06-30', total: 1900, cashback: 1235, status: 'processing', tracking: null, image: '🧴' },
  { id: 'ORD-2237', product: 'Gym Tank Top', brand: 'UrbanFit BD', date: '2026-06-25', total: 800, cashback: 320, status: 'delivered', tracking: 'PTH-667788', image: '👕' },
]

const statusConfig = {
  processing: { label: 'Processing', bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  shipped: { label: 'Shipped', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
}

const MyOrders = () => {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">My Orders</h1>
      <p className="text-zinc-500 mb-6">Track your orders and post content to earn cashback</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'processing', 'shipped', 'delivered'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
            {f === 'all' ? 'All Orders' : f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map(o => {
          const sc = statusConfig[o.status]
          return (
            <div key={o.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-3xl flex-shrink-0">{o.image}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-white truncate">{o.product}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{o.brand} · {o.id} · {o.date}</p>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div><span className="text-zinc-500">Paid: </span><span className="text-white font-semibold">৳{o.total.toLocaleString()}</span></div>
                    <div><span className="text-zinc-500">Cashback: </span><span className="text-emerald-400 font-semibold">৳{o.cashback.toLocaleString()}</span></div>
                    {o.tracking && <div><span className="text-zinc-500">Tracking: </span><span className="text-blue-400 font-mono text-xs">{o.tracking}</span></div>}
                  </div>

                  {o.status === 'delivered' && (
                    <div className="mt-3 flex gap-2">
                      <button className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/20 hover:bg-orange-500/20 transition-all">
                        Submit Post →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MyOrders
