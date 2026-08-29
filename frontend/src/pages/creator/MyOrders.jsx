import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders, rateOrder } from '../../services/orders'
import StarRating from '../../components/StarRating'

const statusConfig = {
  processing: { label: 'Processing', bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  packed:     { label: 'Packed',     bg: 'bg-blue-500/10',   text: 'text-blue-400',   dot: 'bg-blue-400' },
  shipped:    { label: 'Shipped',    bg: 'bg-violet-500/10', text: 'text-violet-400',  dot: 'bg-violet-400' },
  delivered:  { label: 'Delivered',  bg: 'bg-emerald-500/10',text: 'text-emerald-400', dot: 'bg-emerald-400' },
  cancelled:  { label: 'Cancelled',  bg: 'bg-red-500/10',    text: 'text-red-400',     dot: 'bg-red-400' },
  // fulfillment module return flow — these orders can no longer earn cashback
  return_requested: { label: 'Return requested', bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  returned:         { label: 'Returned',         bg: 'bg-red-500/10',    text: 'text-red-400',    dot: 'bg-red-400' },
}

const MyOrders = () => {
  const navigate = useNavigate()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [ratingFor, setRatingFor] = useState(null)   // order id whose form is open
  const [stars, setStars]     = useState({ quality: 0, shipping: 0, support: 0, comment: '' })
  const [savingRating, setSavingRating] = useState(false)
  const [rateError, setRateError] = useState('')

  const openRating = (order) => {
    setRatingFor(order._id)
    setRateError('')
    setStars({
      quality:  order.creatorRating?.quality  || 0,
      shipping: order.creatorRating?.shipping || 0,
      support:  order.creatorRating?.support  || 0,
      comment:  order.creatorRating?.comment  || '',
    })
  }

  const submitRating = async (orderId) => {
    if (!stars.quality || !stars.shipping || !stars.support) {
      setRateError('Give all three a score first.')
      return
    }
    setSavingRating(true); setRateError('')
    try {
      const d = await rateOrder(orderId, stars)
      setOrders(prev => prev.map(o => (o._id === orderId ? { ...o, creatorRating: d.order.creatorRating } : o)))
      setRatingFor(null)
    } catch (err) {
      setRateError(err.response?.data?.message || 'Could not save your review.')
    } finally {
      setSavingRating(false)
    }
  }

  useEffect(() => {
    getOrders({ status: 'all' })
      .then(d => setOrders(d.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Order History</span></div>
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">Track your orders and post content to earn cashback</p>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
        {['all', 'processing', 'packed', 'shipped', 'delivered', 'returned', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'8px 18px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
            textTransform:'capitalize', transition:'all 0.2s', border:'none',
            background: filter === f ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(var(--ink-rgb),0.04)',
            color: filter === f ? '#fff' : 'rgba(var(--ink-rgb),0.45)',
            boxShadow: filter === f ? '0 0 16px rgba(124,58,237,0.3)' : 'none',
          }}>
            {f === 'all' ? `All Orders (${orders.length})` : `${f} (${orders.filter(o => o.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'80px 0' }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>📦</p><p>No orders — browse the catalog and place your first order</p></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {filtered.map(o => {
            const sc = statusConfig[o.status] || statusConfig.processing
            return (
              <div key={o._id} style={{ padding:'20px', borderRadius:18, background:'rgba(var(--ink-rgb),0.03)', border:'1px solid rgba(var(--ink-rgb),0.07)', transition:'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(124,58,237,0.25)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(var(--ink-rgb),0.07)'}
              >
                <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:'rgba(var(--ink-rgb),0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{o.image || '📦'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <p style={{ fontSize:14, fontWeight:600, color: 'var(--text)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{o.product}</p>
                      <span className={`badge ${sc.text === 'text-emerald-400' ? 'badge-success' : sc.text === 'text-red-400' ? 'badge-error' : sc.text === 'text-yellow-400' ? 'badge-warning' : 'badge-cyan'}`} style={{ marginLeft:12, flexShrink:0 }}>{sc.label}</span>
                    </div>
                    <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.3)', marginBottom:12 }}>{o.brand} · {o.orderId} · {new Date(o.createdAt).toLocaleDateString()}</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:16, fontSize:13 }}>
                      <div><span style={{ color:'rgba(var(--ink-rgb),0.35)' }}>Paid: </span><span style={{ color: 'var(--text)', fontWeight:600 }}>৳{o.total?.toLocaleString()}</span></div>
                      <div><span style={{ color:'rgba(var(--ink-rgb),0.35)' }}>Cashback: </span><span style={{ color:'#4ade80', fontWeight:600 }}>৳{o.cashbackAmount?.toLocaleString()}</span></div>
                      {o.tracking && <div><span style={{ color:'rgba(var(--ink-rgb),0.35)' }}>Tracking: </span><span style={{ color:'#67e8f9', fontFamily:'monospace', fontSize:11 }}>{o.tracking}</span></div>}
                    </div>
                    {o.status === 'delivered' && !o.cashbackReleased && (
                      <div style={{ marginTop:14 }}>
                        <button onClick={() => navigate('/creator/submit-post', { state: { orderId: o._id, campaignId: o.campaignId, product: o.product } })} className="btn-primary" style={{ padding:'8px 18px', fontSize:12 }}>
                          Submit Post →
                        </button>
                      </div>
                    )}
                    {o.cashbackReleased && (
                      <div style={{ marginTop:12 }}><span className="badge badge-success">✓ Cashback Released</span></div>
                    )}
                    {['delivered', 'return_requested', 'returned'].includes(o.status) && (
                      o.creatorRating?.quality && ratingFor !== o._id ? (
                        <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                          <StarRating value={o.creatorRating.quality} />
                          <span style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.35)' }}>You reviewed this order</span>
                          <button onClick={() => openRating(o)} style={{ background:'none', border:'none', padding:0, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, color:'#67e8f9' }}>Edit</button>
                        </div>
                      ) : ratingFor === o._id ? (
                        <div style={{ marginTop:14, padding:16, borderRadius:14, background:'rgba(var(--ink-rgb),0.02)', border:'1px solid rgba(var(--ink-rgb),0.06)' }}>
                          <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 12px' }}>How was it?</p>
                          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                            <StarRating label="Product" value={stars.quality} onChange={v => setStars(s2 => ({ ...s2, quality: v }))} size={20} />
                            <StarRating label="Shipping" value={stars.shipping} onChange={v => setStars(s2 => ({ ...s2, shipping: v }))} size={20} />
                            <StarRating label="Support" value={stars.support} onChange={v => setStars(s2 => ({ ...s2, support: v }))} size={20} />
                          </div>
                          <textarea value={stars.comment} onChange={e => setStars(s2 => ({ ...s2, comment: e.target.value }))}
                            rows={2} className="field-input" placeholder="Anything the next creator should know? (optional)" />
                          {rateError && <p style={{ fontSize:12, color:'#f87171', margin:'8px 0 0' }}>{rateError}</p>}
                          <div style={{ display:'flex', gap:8, marginTop:12 }}>
                            <button onClick={() => submitRating(o._id)} disabled={savingRating} className="btn-primary" style={{ padding:'8px 18px', fontSize:12 }}>
                              {savingRating ? 'Saving…' : 'Post review'}
                            </button>
                            <button onClick={() => setRatingFor(null)} style={{ padding:'8px 18px', fontSize:12, fontWeight:700, borderRadius:10, cursor:'pointer', fontFamily:'inherit', background:'rgba(var(--ink-rgb),0.05)', color:'rgba(var(--ink-rgb),0.6)', border:'1px solid rgba(var(--ink-rgb),0.1)' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => openRating(o)} className="btn-primary" style={{ marginTop:12, padding:'8px 18px', fontSize:12, background:'rgba(251,191,36,0.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.3)', boxShadow:'none' }}>
                          ⭐ Rate this order
                        </button>
                      )
                    )}
                    {o.status !== 'cancelled' && (
                      <button onClick={() => navigate('/creator/disputes', { state: { orderId: o._id } })} style={{
                        marginTop:12, background:'none', border:'none', padding:0, cursor:'pointer', fontFamily:'inherit',
                        fontSize:12, fontWeight:600, color:'rgba(var(--ink-rgb),0.35)',
                      }}>Something wrong? Report a problem →</button>
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
