import React, { useEffect, useState } from 'react'
import { Check, ChevronDown, ClipboardList, Package, Printer, RotateCcw, Save, Truck, X } from 'lucide-react'
import { getOrders, updateOrder, rateCreator } from '../../services/orders'
import StarRating from '../../components/StarRating'

const shippingStatuses = ['processing', 'packed', 'shipped', 'delivered']
const filterStatuses = ['all', ...shippingStatuses, 'return_requested', 'returned', 'cancelled']
const statusConfig = {
  processing: { label: 'Processing', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  packed: { label: 'Packed', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  shipped: { label: 'Shipped', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400' },
  return_requested: { label: 'Return requested', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  returned: { label: 'Returned', bg: 'bg-pink-500/10', text: 'text-pink-400' },
}

const OrderFulfillment = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [trackingInputs, setTrackingInputs] = useState({})
  const [returnReasons, setReturnReasons] = useState({})
  const [saving, setSaving] = useState({})
  const [errors, setErrors] = useState({})
  const [creatorStars, setCreatorStars] = useState({})   // orderId -> { professionalism, contentQuality, comment }

  const starsFor = order => creatorStars[order._id] || {
    professionalism: order.brandRating?.professionalism || 0,
    contentQuality: order.brandRating?.contentQuality || 0,
    comment: order.brandRating?.comment || '',
  }
  const setStarsFor = (id, patch) => setCreatorStars(state => ({ ...state, [id]: { ...(state[id] || {}), ...patch } }))

  const submitCreatorRating = async order => {
    const stars = starsFor(order)
    if (!stars.professionalism || !stars.contentQuality) return
    setSaving(state => ({ ...state, [order._id]: true }))
    setErrors(state => ({ ...state, [order._id]: '' }))
    try {
      const { order: updated } = await rateCreator(order._id, stars)
      setOrders(current => current.map(item => item._id === order._id ? { ...item, brandRating: updated.brandRating } : item))
    } catch (error) {
      setErrors(state => ({ ...state, [order._id]: error.response?.data?.message || 'Save failed — try again' }))
    } finally {
      setSaving(state => ({ ...state, [order._id]: false }))
    }
  }

  // `loading` starts true; the Refresh button turns the spinner back on itself.
  const load = () => {
    getOrders({ status: 'all' }).then(data => setOrders(data.orders || [])).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? orders : orders.filter(order => order.status === filter)
  const count = status => orders.filter(order => order.status === status).length

  const saveOrder = async (order, changes) => {
    const id = order._id
    setSaving(state => ({ ...state, [id]: true }))
    setErrors(state => ({ ...state, [id]: '' }))
    try {
      const { order: updated } = await updateOrder(id, changes)
      setOrders(current => current.map(item => item._id === id ? { ...item, ...updated } : item))
    } catch (error) {
      setErrors(state => ({ ...state, [id]: error.response?.data?.message || 'Save failed — try again' }))
    } finally {
      setSaving(state => ({ ...state, [id]: false }))
    }
  }

  const updateStatus = (order, status) => {
    if (status === 'cancelled' && !window.confirm(`Cancel order ${order.orderId}?`)) return
    const returnReason = returnReasons[order._id] || order.returnReason || ''
    saveOrder(order, { status, ...(status === 'return_requested' ? { returnReason } : {}) })
  }

  const printSlip = order => {
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    const printWindow = window.open('', '_blank', 'width=720,height=720')
    if (!printWindow) return
    printWindow.document.write(`<!doctype html><title>FlexTag packaging slip</title><style>body{font:14px Arial;color:#111;padding:40px;max-width:620px}h1{font-size:24px}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}.address{white-space:pre-wrap}</style><h1>FlexTag packaging slip</h1><div class="row"><b>Order</b><span>${esc(order.orderId)}</span></div><div class="row"><b>Product</b><span>${esc(order.product)}</span></div><div class="row"><b>Quantity</b><span>${esc(order.qty || 1)}</span></div><div class="row"><b>Creator</b><span>${esc(order.creatorId?.name || 'Creator')}</span></div><p><b>Ship to</b></p><p class="address">${esc(order.address || 'No shipping address provided')}</p><script>window.onload=()=>window.print()</script>`)
    printWindow.document.close()
  }

  return (
    <div className="page-root">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div><p className="page-label"><span>Brand operations</span></p><h1 className="page-title">Order Fulfillment</h1><p className="page-subtitle">Pack, ship, and resolve creator orders from one workspace.</p></div>
        <button className="btn-ghost" onClick={() => { setLoading(true); load() }} disabled={loading}><RotateCcw size={15} /> Refresh</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {[['To pack', ['processing', 'packed'], Package], ['In transit', ['shipped'], Truck], ['Returns', ['return_requested', 'returned'], RotateCcw], ['Cancelled', ['cancelled'], X]].map(([label, statuses, Icon]) => <div className="stat-card !p-4" key={label}><Icon size={17} className="text-cyan-300 mb-3" /><p className="tnum text-2xl font-bold text-white">{statuses.reduce((total, status) => total + count(status), 0)}</p><p className="text-xs text-zinc-500">{label}</p></div>)}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {filterStatuses.map(status => <button key={status} onClick={() => setFilter(status)} className="px-4 py-2 rounded-full text-sm font-medium"
          style={filter === status ? { background: 'var(--purple)', color: '#fff' } : { background: 'rgba(var(--ink-rgb),0.05)', color: 'rgba(var(--ink-rgb),0.55)', border: '1px solid rgba(var(--ink-rgb),0.07)' }}>
          {status === 'all' ? `All (${orders.length})` : `${statusConfig[status].label} (${count(status)})`}
        </button>)}
      </div>
      {loading ? <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div> : filtered.length === 0 ? <div className="data-table text-center py-20"><ClipboardList size={32} className="mx-auto mb-3 text-zinc-600" /><p className="text-lg text-zinc-400">No orders in this queue</p></div> : <div className="space-y-3">{filtered.map(order => {
        const id = order._id
        const expanded = expandedId === id
        const status = statusConfig[order.status] || statusConfig.processing
        const statusIndex = shippingStatuses.indexOf(order.status)
        const nextStatus = statusIndex >= 0 ? shippingStatuses[statusIndex + 1] : null
        return <div key={id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden transition-all hover:border-white/10">
          <button className="w-full flex items-center gap-4 p-5 text-left" onClick={() => setExpandedId(expanded ? null : id)}><div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400"><Package size={18} /></div><div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-3 mb-1"><span className="text-sm font-mono text-zinc-400">{order.orderId}</span><span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${status.bg} ${status.text}`}>{status.label}</span></div><p className="text-sm font-semibold text-white truncate">{order.product} <span className="text-zinc-500 font-normal">for {order.creatorId?.name || 'Creator'}</span></p><p className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleDateString()} · <span className="tnum">৳{order.total?.toLocaleString()}</span></p></div><ChevronDown size={18} className={`text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>
          {expanded && <div className="px-5 pb-5 pt-4 border-t border-white/5 space-y-5"><div className="grid sm:grid-cols-3 gap-4"><div><p className="field-label">Ship to</p><p className="text-sm text-zinc-300">{order.address || 'Not provided'}</p></div><div><p className="field-label">Creator</p><p className="text-sm text-zinc-300">{order.creatorId?.name || 'Not provided'}</p></div><div><p className="field-label">Payment</p><p className="text-sm text-zinc-300 capitalize">{order.paymentMethod || 'Not provided'}</p></div></div>
            <div><label className="field-label" htmlFor={`tracking-${id}`}>Tracking number</label><div className="flex gap-2"><input id={`tracking-${id}`} value={trackingInputs[id] !== undefined ? trackingInputs[id] : (order.tracking || '')} onChange={event => setTrackingInputs(state => ({ ...state, [id]: event.target.value }))} placeholder="Enter carrier tracking number" className="field-input" /><button className="btn-primary" onClick={() => saveOrder(order, { tracking: trackingInputs[id] || '' })} disabled={saving[id]}><Save size={15} /> Save</button></div></div>
            {(order.status === 'return_requested' || order.status === 'returned') && <div><label className="field-label" htmlFor={`reason-${id}`}>Return reason</label><input id={`reason-${id}`} value={returnReasons[id] !== undefined ? returnReasons[id] : (order.returnReason || '')} onChange={event => setReturnReasons(state => ({ ...state, [id]: event.target.value }))} placeholder="Add a reason for the return record" className="field-input" /></div>}
            <div className="flex items-center gap-1">{shippingStatuses.map((item, index) => <React.Fragment key={item}><div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${index <= shippingStatuses.indexOf(order.status) ? 'bg-emerald-500 text-white' : 'bg-white/5 text-zinc-600'}`}>{index < shippingStatuses.indexOf(order.status) ? <Check size={13} /> : index + 1}</div>{index < 3 && <div className={`flex-1 h-0.5 ${index < shippingStatuses.indexOf(order.status) ? 'bg-emerald-500' : 'bg-white/5'}`} />}</React.Fragment>)}</div>
            <div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={() => printSlip(order)}><Printer size={15} /> Print slip</button>{nextStatus && <button className="btn-primary" onClick={() => saveOrder(order, { status: nextStatus, tracking: trackingInputs[id] || order.tracking || undefined })} disabled={saving[id]}>{saving[id] ? 'Saving...' : `Mark as ${statusConfig[nextStatus].label}`}</button>}{!['cancelled', 'returned', 'return_requested'].includes(order.status) && <><button className="btn-danger" onClick={() => updateStatus(order, 'cancelled')} disabled={saving[id]}><X size={15} /> Cancel</button><button className="btn-ghost" onClick={() => updateStatus(order, 'return_requested')} disabled={saving[id]}><RotateCcw size={15} /> Request return</button></>}</div>
            {errors[id] && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{errors[id]}</p>}
            {order.status === 'return_requested' && <button className="btn-primary" onClick={() => updateStatus(order, 'returned')} disabled={saving[id]}><Check size={15} /> Approve return</button>}
            {/* Two-way reputation: rate the creator once the order landed. */}
            {(order.status === 'delivered' || order.cashbackReleased) && (
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                <p className="field-label">Rate {order.creatorId?.name || 'this creator'}</p>
                {order.brandRating?.professionalism && !creatorStars[id] ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <StarRating value={(order.brandRating.professionalism + order.brandRating.contentQuality) / 2} />
                    <span className="text-xs text-zinc-500">You rated this collab</span>
                    <button className="text-xs font-semibold text-cyan-400" onClick={() => setStarsFor(id, {})}>Edit</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <StarRating label="Professional" size={19} value={starsFor(order).professionalism} onChange={v => setStarsFor(id, { professionalism: v })} />
                    <StarRating label="Content" size={19} value={starsFor(order).contentQuality} onChange={v => setStarsFor(id, { contentQuality: v })} />
                    <input className="field-input" placeholder="Optional note for your own records" value={starsFor(order).comment} onChange={event => setStarsFor(id, { comment: event.target.value })} />
                    <button className="btn-primary" disabled={saving[id] || !starsFor(order).professionalism || !starsFor(order).contentQuality} onClick={() => submitCreatorRating(order)}>
                      {saving[id] ? 'Saving...' : 'Save rating'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>}
        </div>
      })}</div>}
    </div>
  )
}

export default OrderFulfillment
