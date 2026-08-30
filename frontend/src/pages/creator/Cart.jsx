import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { placeOrder } from '../../services/orders'
import { initCheckout } from '../../services/checkout'
import { getAddresses } from '../../services/users'
import { useAuth } from '../../context/AuthContext'
import { Package, ShoppingCart, Smartphone, CreditCard, Info } from 'lucide-react'

const CART_KEY = 'flextag_cart'

const Cart = () => {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  // The cart lives in localStorage — read it once, at first render, so there is
  // no frame where the page claims the cart is empty.
  const [items, setItems]                   = useState(() => JSON.parse(localStorage.getItem(CART_KEY) || '[]'))
  const [paymentMethod, setPaymentMethod]   = useState('bkash')
  const [typedAddress, setAddress]          = useState('')   // '' = still showing their default
  const [fetchedAddresses, setFetchedAddr]  = useState([])
  const [showCheckout, setShowCheckout]     = useState(false)
  const [placing, setPlacing]               = useState(false)
  const [error, setError]                   = useState('')

  // Addresses already on the user object need no round trip; the effect only
  // fetches when the session carries none.
  const profileAddresses = useMemo(() => user?.shippingAddresses || [], [user?.shippingAddresses])
  useEffect(() => {
    if (!user?._id || profileAddresses.length) return undefined
    let alive = true
    getAddresses(user._id)
      .then(d => { if (alive) setFetchedAddr(d.addresses || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [user?._id, profileAddresses.length])

  const savedAddresses = profileAddresses.length ? profileAddresses : fetchedAddresses

  const formatAddress = (a) => a
    ? `${a.fullName || user?.name || ''} (${a.phone || user?.phone || ''})
${a.street}, ${a.city}${a.zip ? ', ' + a.zip : ''}, ${a.country}`
    : ''
  // Their default address fills the box until they type something else —
  // derived rather than copied into state, so it cannot go stale behind an edit.
  const address = typedAddress || formatAddress(savedAddresses.find(a => a.isDefault) || savedAddresses[0])

  const save = (updated) => { setItems(updated); localStorage.setItem(CART_KEY, JSON.stringify(updated)) }
  const updateQty  = (id, delta) => save(items.map(i => i._id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  const removeItem = (id) => save(items.filter(i => i._id !== id))

  // Mirrors backend utils/reward.js: reward = price×rate%, split into an instant
  // discount off the bill and a bonus released after the post verifies.
  const rewardOf  = (i) => Math.round(i.price * i.qty * (i.cashbackRate || 0) / 100)
  const instantOf = (i) => Math.min(rewardOf(i), Math.round(rewardOf(i) * (i.instantSplitPct || 0) / 100))
  const subtotal      = items.reduce((sum, i) => sum + (i.price * i.qty), 0)
  const totalCashback = items.reduce((sum, i) => sum + rewardOf(i), 0)
  const totalInstant  = items.reduce((sum, i) => sum + instantOf(i), 0)
  const totalBonus    = totalCashback - totalInstant
  const payNow        = subtotal - totalInstant
  const netCost       = subtotal - totalCashback

  const handleCheckout = async () => {
    if (!address.trim()) { setError('Please enter your shipping address.'); return }
    setPlacing(true); setError('')
    try {
      if (paymentMethod === 'ssl') {
        // Online payment → SSLCommerz gateway (cart cleared on the success page)
        const { url } = await initCheckout({
          items: items.map(i => ({ campaignId: i.campaignId || i._id, qty: i.qty })),
          address: address.trim(),
        })
        if (!url) throw new Error('Payment gateway did not return a URL.')
        window.location.href = url
        return
      }
      // Cash / mobile-banking on delivery → create orders directly. Each placed
      // item leaves the cart immediately, so a mid-cart rejection (e.g. the
      // unverified reward cap) keeps only the items that were NOT ordered.
      let remaining = items
      for (const item of items) {
        await placeOrder({ campaignId: item.campaignId || item._id, qty: item.qty, address: address.trim(), paymentMethod })
        remaining = remaining.filter(i => i._id !== item._id)
        save(remaining)
      }
      localStorage.removeItem(CART_KEY)
      navigate('/creator/orders')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to place order. Please try again.')
    } finally { setPlacing(false) }
  }

  const panel = { background:'rgba(var(--ink-rgb),0.04)', border:'1px solid rgba(var(--ink-rgb),0.08)', borderRadius:16, padding:24, backdropFilter:'blur(20px)' }

  return (
    <div className="page-root">
      <style>{`
        .cart-remove { transition: color 150ms cubic-bezier(0.2,0,0,1); }
        .cart-remove:hover, .cart-remove:focus-visible { color: #f87171; }
      `}</style>

      <div className="page-header">
        <div className="page-label"><span>Shopping Cart</span></div>
        <h1 className="page-title">My cart</h1>
        <p className="page-subtitle">{items.length} item{items.length !== 1 ? 's' : ''} ready to order</p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={28} strokeWidth={1.5} style={{ color:'var(--text-dim)', marginBottom:10 }} />
          <p>Your cart is empty</p>
          <Link to="/creator/catalog" className="btn-primary" style={{ marginTop:20, textDecoration:'none' }}>Browse catalog</Link>
        </div>
      ) : (
        <div style={{ display:'grid', gap:24 }} className="lg:grid-cols-3">
          {/* Items */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="lg:col-span-2">
            {items.map(item => (
              <div key={item._id} style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderRadius:14, ...panel }} >
                <div style={{ width:60, height:60, borderRadius:14, background:'rgba(var(--ink-rgb),0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow: 'hidden' }}>
                  {item.image?.startsWith('http') ? <img src={item.image} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Package size={22} strokeWidth={1.5} style={{ color: 'rgba(var(--ink-rgb),0.25)' }} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:600, color: 'var(--text)', margin:'0 0 4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</p>
                  <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>{item.brand}</p>
                  {item.cashbackRate > 0 && (
                    <p className="tnum" style={{ fontSize:12, color:'var(--green-ink)', marginTop:4 }}>
                      {instantOf(item) > 0
                        ? `৳${instantOf(item).toLocaleString()} off now + ৳${(rewardOf(item) - instantOf(item)).toLocaleString()} after your post`
                        : `${item.cashbackRate}% cashback · Save ৳${rewardOf(item).toLocaleString()}`}
                    </p>
                  )}
                </div>
                {/* Qty */}
                <div style={{ display:'flex', alignItems:'center', borderRadius:10, background:'rgba(var(--ink-rgb),0.05)', border:'1px solid rgba(var(--ink-rgb),0.1)' }}>
                  <button onClick={() => updateQty(item._id, -1)} style={{ padding:'8px 14px', color:'rgba(var(--ink-rgb),0.5)', cursor:'pointer', background:'none', border:'none', fontSize:16 }}>−</button>
                  <span className="tnum" style={{ padding:'8px 10px', color: 'var(--text)', fontWeight:600, minWidth:32, textAlign:'center', fontSize:14 }}>{item.qty}</span>
                  <button onClick={() => updateQty(item._id, 1)} style={{ padding:'8px 14px', color:'rgba(var(--ink-rgb),0.5)', cursor:'pointer', background:'none', border:'none', fontSize:16 }}>+</button>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p className="tnum" style={{ fontSize:15, fontWeight:700, color: 'var(--text)', margin:'0 0 4px' }}>৳{(item.price * item.qty).toLocaleString()}</p>
                  <button onClick={() => removeItem(item._id)} className="cart-remove" style={{ fontSize:11, color:'rgba(239,68,68,0.5)', cursor:'pointer', background:'none', border:'none', padding:0 }}
                  >Remove</button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div style={{ ...panel, height:'fit-content', position:'sticky', top:32 }}>
            <h2 style={{ fontSize:17, fontWeight:700, color: 'var(--text)', margin:'0 0 20px' }}>Order summary</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20, fontSize:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'rgba(var(--ink-rgb),0.4)' }}>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span className="tnum" style={{ color: 'var(--text)', fontWeight:600 }}>৳{subtotal.toLocaleString()}</span>
              </div>
              {totalInstant > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'rgba(var(--ink-rgb),0.4)' }}>Instant discount</span>
                  <span className="tnum" style={{ color:'var(--green-ink)', fontWeight:600 }}>-৳{totalInstant.toLocaleString()}</span>
                </div>
              )}
              {totalBonus > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'rgba(var(--ink-rgb),0.4)' }}>{totalInstant > 0 ? 'Bonus after verified post' : 'Total cashback'}</span>
                  <span className="tnum" style={{ color:'var(--green-ink)', fontWeight:600 }}>-৳{totalBonus.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'rgba(var(--ink-rgb),0.4)' }}>Shipping</span>
                <span style={{ color:'var(--green-ink)' }}>Free</span>
              </div>
              <div style={{ borderTop:'1px solid rgba(var(--ink-rgb),0.08)', paddingTop:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:600, color: 'var(--text)', fontSize:13 }}>Net cost after cashback</span>
                <span className="tnum" style={{ fontSize:22, fontWeight:800, color: 'var(--text)' }}>৳{netCost.toLocaleString()}</span>
              </div>
            </div>

            {totalCashback > 0 && (
              <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:16, display:'flex', gap:8, alignItems:'flex-start' }}>
                <Info size={14} strokeWidth={1.75} style={{ color:'rgba(var(--ink-rgb),0.5)', flexShrink:0, marginTop:2 }} />
                <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.5)', margin:0 }}>
                  You pay <strong className="tnum" style={{ color: 'var(--text)' }}>৳{payNow.toLocaleString()}</strong> today{totalInstant > 0 && <> (৳{totalInstant.toLocaleString()} discount applied)</>}.{' '}
                  {totalBonus > 0 && <>A <strong className="tnum" style={{ color:'var(--green-ink)' }}>৳{totalBonus.toLocaleString()}</strong> bonus lands in your wallet after post verification.</>}
                </p>
              </div>
            )}

            {error && <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:14 }}><p style={{ fontSize:13, color:'#f87171', margin:0 }}>{error}</p></div>}

            {!showCheckout ? (
              <button onClick={() => setShowCheckout(true)} className="btn-primary" style={{ width:'100%', padding:14, fontSize:14 }}>
                Proceed to checkout
              </button>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <label className="field-label" style={{ margin:0 }}>Shipping address</label>
                    <Link to="/creator/profile" style={{ fontSize:11, color:'var(--violet-ink)', textDecoration:'none', fontWeight:600 }}>Manage saved addresses</Link>
                  </div>
                  {savedAddresses.length > 0 && (
                    <select
                      onChange={e => {
                        const selected = savedAddresses.find(a => a._id === e.target.value)
                        if (selected) {
                          const formatted = `${selected.fullName || user.name} (${selected.phone || user.phone})\n${selected.street}, ${selected.city}${selected.zip ? ', ' + selected.zip : ''}, ${selected.country}`
                          setAddress(formatted)
                        }
                      }}
                      className="field-select" style={{ marginBottom:8, background:'var(--bg-2)', color:'var(--text)' }}>
                      {savedAddresses.map(a => (
                        <option key={a._id} value={a._id} style={{ background:'var(--bg-2)', color:'var(--text)' }}>
                          {a.label} {a.isDefault ? '(Default)' : ''} — {a.street}, {a.city}
                        </option>
                      ))}
                    </select>
                  )}
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
                    placeholder="House, Road, Area, City..."
                    className="field-input" style={{ resize:'none', fontFamily:'inherit' }} />
                </div>
                <div>
                  <label className="field-label">Payment method</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                    {[
                      { id:'bkash', label:'bKash', desc:'Mobile banking', Icon: Smartphone },
                      { id:'ssl',   label:'SSLCommerz', desc:'Card / bank', Icon: CreditCard },
                    ].map(m => (
                      <button key={m.id} onClick={() => setPaymentMethod(m.id)} style={{
                        width:'100%', padding:'12px 14px', borderRadius:12, display:'flex', alignItems:'center', gap:12,
                        background: paymentMethod === m.id ? 'rgba(124,58,237,0.08)' : 'rgba(var(--ink-rgb),0.03)',
                        border: paymentMethod === m.id ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(var(--ink-rgb),0.07)',
                        cursor:'pointer', transition:'all 0.2s', fontFamily:'inherit',
                      }}>
                        <m.Icon size={20} strokeWidth={1.75} style={{ color: paymentMethod === m.id ? 'var(--violet-ink)' : 'rgba(var(--ink-rgb),0.4)', flexShrink:0 }} />
                        <div style={{ textAlign:'left' }}>
                          <p style={{ fontSize:13, fontWeight:600, color: paymentMethod === m.id ? 'var(--text)' : 'rgba(var(--ink-rgb),0.5)', margin:0 }}>{m.label}</p>
                          <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>{m.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleCheckout} disabled={placing || !address.trim()} className="btn-primary tnum" style={{ width:'100%', padding:14, fontSize:14 }}>
                  {placing ? 'Placing order…' : `Pay ৳${payNow.toLocaleString()}`}
                </button>
                <button onClick={() => setShowCheckout(false)} className="btn-ghost" style={{ width:'100%', padding:'10px' }}>Back</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Cart
