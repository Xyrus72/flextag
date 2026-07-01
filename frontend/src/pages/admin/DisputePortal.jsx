import React, { useState } from 'react'

const disputes = [
  { id: 'D-101', creator: 'Tasnim Rahman', brand: 'GlowUp Cosmetics', type: 'product_damaged', order: 'ORD-2234', amount: 1200, description: 'Product arrived with broken packaging and damaged lipstick tubes.', status: 'open', date: '2026-06-28' },
  { id: 'D-102', creator: 'Rafiq Hossain', brand: 'TechNova', type: 'wrong_rejection', order: 'ORD-2230', amount: 3500, description: 'Post was rejected but all hashtags and tags were present. Requesting re-review.', status: 'open', date: '2026-06-29' },
  { id: 'D-103', creator: 'Ayesha Karim', brand: 'SkinLab BD', type: 'shipping_delay', order: 'ORD-2228', amount: 950, description: 'Order not received after 10 days. Tracking shows stuck at sorting facility.', status: 'investigating', date: '2026-06-25' },
  { id: 'D-104', creator: 'Priya Das', brand: 'UrbanFit BD', type: 'product_damaged', order: 'ORD-2220', amount: 800, description: 'Tank top received in wrong size (ordered M, received XL).', status: 'resolved', date: '2026-06-20', resolution: 'Replacement shipped' },
]

const typeLabels = { product_damaged: 'Product Issue', wrong_rejection: 'Wrong Rejection', shipping_delay: 'Shipping Delay' }
const statusConfig = { open: 'bg-red-500/10 text-red-400', investigating: 'bg-yellow-500/10 text-yellow-400', resolved: 'bg-emerald-500/10 text-emerald-400' }

const DisputePortal = () => {
  const [items, setItems] = useState(disputes)
  const [filter, setFilter] = useState('open')
  const [expandedId, setExpandedId] = useState(null)

  const resolve = (id) => setItems(items.map(i => i.id === id ? { ...i, status: 'resolved', resolution: 'Manually resolved by admin' } : i))
  const filtered = filter === 'all' ? items : items.filter(d => d.status === filter)

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Dispute Resolution</h1>
      <p className="text-zinc-500 mb-6">Handle creator and brand conflicts</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['open', 'investigating', 'resolved', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
            {f} ({f === 'all' ? items.length : items.filter(d => d.status === f).length})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map(d => {
          const expanded = expandedId === d.id
          return (
            <div key={d.id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
              <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(expanded ? null : d.id)}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${d.status === 'open' ? 'bg-red-500/10' : d.status === 'investigating' ? 'bg-yellow-500/10' : 'bg-emerald-500/10'}`}>
                  <span className="text-lg">{d.type === 'product_damaged' ? '📦' : d.type === 'wrong_rejection' ? '❌' : '🚚'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-zinc-400">{d.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusConfig[d.status]}`}>{d.status}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 text-[10px] font-medium">{typeLabels[d.type]}</span>
                  </div>
                  <p className="text-sm text-white">{d.creator} vs {d.brand}</p>
                </div>
                <span className="text-sm font-bold text-orange-400">৳{d.amount.toLocaleString()}</span>
              </div>

              {expanded && (
                <div className="px-5 pb-5 pt-0 border-t border-white/5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4 pt-4">
                    <div><p className="text-xs text-zinc-500 mb-1">Order</p><p className="text-sm text-blue-400 font-mono">{d.order}</p></div>
                    <div><p className="text-xs text-zinc-500 mb-1">Date Filed</p><p className="text-sm text-zinc-300">{d.date}</p></div>
                  </div>
                  <div><p className="text-xs text-zinc-500 mb-1">Description</p><p className="text-sm text-zinc-300">{d.description}</p></div>
                  {d.resolution && <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15"><p className="text-xs text-zinc-500 mb-1">Resolution</p><p className="text-sm text-emerald-400">{d.resolution}</p></div>}
                  {d.status !== 'resolved' && (
                    <div className="flex gap-2">
                      <button onClick={() => resolve(d.id)} className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">✓ Resolve</button>
                      <button className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/20 hover:bg-orange-500/20 transition-all">Issue Refund</button>
                      <button className="px-4 py-2 rounded-lg bg-white/5 text-zinc-400 text-xs font-semibold border border-white/5 hover:bg-white/10 transition-all">Escalate</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DisputePortal
