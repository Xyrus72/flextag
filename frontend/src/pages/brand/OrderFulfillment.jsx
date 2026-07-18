import React, { useState, useEffect } from 'react'
import { getOrders, updateOrderStatus } from '../../services/orders'

const statusFlow   = ['processing', 'packed', 'shipped', 'delivered']
const statusConfig = {
  processing: { label: 'Processing', bg: 'bg-yellow-500/10',  text: 'text-yellow-400' },
  packed:     { label: 'Packed',     bg: 'bg-blue-500/10',    text: 'text-blue-400' },
  shipped:    { label: 'Shipped',    bg: 'bg-violet-500/10',  text: 'text-violet-400' },
  delivered:  { label: 'Delivered',  bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  cancelled:  { label: 'Cancelled',  bg: 'bg-red-500/10',     text: 'text-red-400' },
}

const OrderFulfillment = () => {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [trackingInputs, setTrackingInputs] = useState({})
  const [saving, setSaving]       = useState({})

  const load = () => {
    setLoading(true)
    getOrders({ status: 'all' })
      .then(d => setOrders(d.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const advanceStatus = async (id, currentStatus) => {
    const idx    = statusFlow.indexOf(currentStatus)
    if (idx >= statusFlow.length - 1) return
    const next   = statusFlow[idx + 1]
    setSaving(s => ({ ...s, [id]: true }))
    try {
      const tracking = trackingInputs[id] || ''
      await updateOrderStatus(id, { status: next, tracking: tracking || undefined })
      setOrders(orders.map(o => o._id === id ? { ...o, status: next, tracking: tracking || o.tracking } : o))
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(s => ({ ...s, [id]: false }))
    }
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Order Fulfillment</h1>
      <p className="text-zinc-500 mb-6">Manage creator orders, shipping and tracking</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['all', ...statusFlow].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
            {f === 'all' ? `All (${orders.length})` : `${f} (${orders.filter(o => o.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-lg text-zinc-400">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const sc       = statusConfig[o.status] || statusConfig.processing
            const expanded = expandedId === o.id || expandedId === o._id
            const oid      = o._id
            return (
              <div key={oid} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden transition-all hover:border-white/10">
                <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(expanded ? null : oid)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-mono text-zinc-400">{o.orderId}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{o.product} → {o.creatorId?.name || 'Creator'}</p>
                    <p className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleDateString()} · ৳{o.total?.toLocaleString()}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                </div>

                {expanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-white/5 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4 pt-4">
                      <div><p className="text-xs text-zinc-500 mb-1">Shipping Address</p><p className="text-sm text-zinc-300">{o.address || 'Not provided'}</p></div>
                      <div><p className="text-xs text-zinc-500 mb-1">Creator</p><p className="text-sm text-zinc-300">{o.creatorId?.name || '—'}</p></div>
                    </div>

                    {/* Tracking input */}
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Tracking Number</label>
                      <input value={trackingInputs[oid] !== undefined ? trackingInputs[oid] : (o.tracking || '')}
                        onChange={e => setTrackingInputs(t => ({ ...t, [oid]: e.target.value }))}
                        placeholder="Enter tracking number..."
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none placeholder:text-zinc-600" />
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
                      {o.status !== 'delivered' && o.status !== 'cancelled' && (
                        <button onClick={() => advanceStatus(oid, o.status)} disabled={saving[oid]}
                          className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/20 hover:bg-orange-500/20 transition-all disabled:opacity-40">
                          {saving[oid] ? 'Saving...' : o.status === 'processing' ? 'Mark as Packed' : o.status === 'packed' ? 'Mark as Shipped' : 'Mark as Delivered'}
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
      )}
    </div>
  )
}

export default OrderFulfillment
