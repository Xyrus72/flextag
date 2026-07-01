import React, { useState } from 'react'

const orders = [
  { id: 'ORD-3301', creator: 'Tasnim Rahman', product: 'Matte Lipstick Set', date: '2026-06-30', total: 1200, address: 'House 24, Road 7, Dhanmondi, Dhaka', status: 'pending', tracking: '' },
  { id: 'ORD-3302', creator: 'Priya Das', product: 'Vitamin C Serum', date: '2026-06-30', total: 950, address: 'Flat 12A, Green Tower, Gulshan-2, Dhaka', status: 'packed', tracking: '' },
  { id: 'ORD-3303', creator: 'Ayesha Karim', product: 'Face Wash Gel', date: '2026-06-29', total: 450, address: '78 College Road, Chittagong', status: 'shipped', tracking: 'PTH-223344' },
  { id: 'ORD-3304', creator: 'Nusrat Jahan', product: 'Matte Lipstick Set', date: '2026-06-29', total: 1200, address: '45 Station Rd, Sylhet', status: 'delivered', tracking: 'STD-445566' },
  { id: 'ORD-3305', creator: 'Rafiq Hossain', product: 'Sunscreen SPF50+', date: '2026-06-28', total: 550, address: '12 New Market, Rajshahi', status: 'pending', tracking: '' },
]

const statusFlow = ['pending', 'packed', 'shipped', 'delivered']
const statusConfig = {
  pending: { label: 'Pending', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  packed: { label: 'Packed', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  shipped: { label: 'Shipped', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
}

const OrderFulfillment = () => {
  const [items, setItems] = useState(orders)
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  const filtered = filter === 'all' ? items : items.filter(o => o.status === filter)

  const advanceStatus = (id) => {
    setItems(items.map(o => {
      if (o.id !== id) return o
      const idx = statusFlow.indexOf(o.status)
      if (idx < statusFlow.length - 1) return { ...o, status: statusFlow[idx + 1] }
      return o
    }))
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Order Fulfillment</h1>
      <p className="text-zinc-500 mb-6">Manage creator orders, shipping and tracking</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['all', ...statusFlow].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
            {f === 'all' ? `All (${items.length})` : `${f} (${items.filter(o => o.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(o => {
          const sc = statusConfig[o.status]
          const expanded = expandedId === o.id
          return (
            <div key={o.id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden transition-all hover:border-white/10">
              <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(expanded ? null : o.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-mono text-zinc-400">{o.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{o.product} → {o.creator}</p>
                  <p className="text-xs text-zinc-500">{o.date} · ৳{o.total.toLocaleString()}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
              </div>

              {expanded && (
                <div className="px-5 pb-5 pt-0 border-t border-white/5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4 pt-4">
                    <div><p className="text-xs text-zinc-500 mb-1">Shipping Address</p><p className="text-sm text-zinc-300">{o.address}</p></div>
                    <div><p className="text-xs text-zinc-500 mb-1">Tracking Number</p>
                      {o.tracking ? <p className="text-sm text-blue-400 font-mono">{o.tracking}</p> : <p className="text-sm text-zinc-600">Not assigned</p>}
                    </div>
                  </div>

                  {/* Status progress */}
                  <div className="flex items-center gap-1">
                    {statusFlow.map((s, i) => {
                      const currentIdx = statusFlow.indexOf(o.status)
                      return (
                        <React.Fragment key={s}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= currentIdx ? 'bg-emerald-500 text-white' : 'bg-white/5 text-zinc-600'}`}>
                            {i < currentIdx ? '✓' : i + 1}
                          </div>
                          {i < 3 && <div className={`flex-1 h-0.5 ${i < currentIdx ? 'bg-emerald-500' : 'bg-white/5'}`} />}
                        </React.Fragment>
                      )
                    })}
                  </div>

                  <div className="flex gap-2">
                    {o.status !== 'delivered' && (
                      <button onClick={() => advanceStatus(o.id)}
                        className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/20 hover:bg-orange-500/20 transition-all">
                        {o.status === 'pending' ? 'Mark as Packed' : o.status === 'packed' ? 'Mark as Shipped' : 'Mark as Delivered'}
                      </button>
                    )}
                    <button className="px-4 py-2 rounded-lg bg-white/5 text-zinc-400 text-xs font-semibold border border-white/5 hover:bg-white/10 transition-all">Print Slip</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OrderFulfillment
