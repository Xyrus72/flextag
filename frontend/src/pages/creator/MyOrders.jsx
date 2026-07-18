import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders } from '../../services/orders'

const statusConfig = {
  processing: { label: 'Processing', bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  packed:     { label: 'Packed',     bg: 'bg-blue-500/10',   text: 'text-blue-400',   dot: 'bg-blue-400' },
  shipped:    { label: 'Shipped',    bg: 'bg-violet-500/10', text: 'text-violet-400',  dot: 'bg-violet-400' },
  delivered:  { label: 'Delivered',  bg: 'bg-emerald-500/10',text: 'text-emerald-400', dot: 'bg-emerald-400' },
  cancelled:  { label: 'Cancelled',  bg: 'bg-red-500/10',    text: 'text-red-400',     dot: 'bg-red-400' },
}

const MyOrders = () => {
  const navigate = useNavigate()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    getOrders({ status: 'all' })
      .then(d => setOrders(d.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">My Orders</h1>
      <p className="text-zinc-500 mb-6">Track your orders and post content to earn cashback</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'processing', 'packed', 'shipped', 'delivered'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
            {f === 'all' ? `All Orders (${orders.length})` : `${f} (${orders.filter(o => o.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-lg text-zinc-400 mb-2">No orders yet</p>
          <p className="text-sm text-zinc-600">Browse the catalog and place your first order</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(o => {
            const sc = statusConfig[o.status] || statusConfig.processing
            return (
              <div key={o._id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-3xl flex-shrink-0">{o.image || '📦'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-white truncate">{o.product}</p>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-3">
                      {o.brand} · {o.orderId} · {new Date(o.createdAt).toLocaleDateString()}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div><span className="text-zinc-500">Paid: </span><span className="text-white font-semibold">৳{o.total?.toLocaleString()}</span></div>
                      <div><span className="text-zinc-500">Cashback: </span><span className="text-emerald-400 font-semibold">৳{o.cashbackAmount?.toLocaleString()}</span></div>
                      {o.tracking && <div><span className="text-zinc-500">Tracking: </span><span className="text-blue-400 font-mono text-xs">{o.tracking}</span></div>}
                    </div>

                    {o.status === 'delivered' && !o.cashbackReleased && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => navigate('/creator/submit-post', { state: { orderId: o._id, campaignId: o.campaignId, product: o.product } })}
                          className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/20 hover:bg-orange-500/20 transition-all">
                          Submit Post →
                        </button>
                      </div>
                    )}
                    {o.cashbackReleased && (
                      <div className="mt-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ✓ Cashback Released
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyOrders
