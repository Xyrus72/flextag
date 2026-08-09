import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { initCheckout } from '../../services/checkout'
import { useAuth } from '../../context/AuthContext'

const CART_KEY = 'flextag_cart'

const Cart = () => {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [items, setItems]               = useState([])
  const [address, setAddress]           = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [placing, setPlacing]           = useState(false)
  const [error, setError]               = useState('')

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem(CART_KEY) || '[]'))
  }, [])

  const save = (updated) => { setItems(updated); localStorage.setItem(CART_KEY, JSON.stringify(updated)) }
  const updateQty  = (id, delta) => save(items.map(i => i._id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  const removeItem = (id) => save(items.filter(i => i._id !== id))

  const subtotal      = items.reduce((sum, i) => sum + (i.price * i.qty), 0)
  const totalCashback = items.reduce((sum, i) => sum + Math.round(i.price * i.qty * (i.cashbackRate || 0) / 100), 0)
  const netCost       = subtotal - totalCashback

  const handleCheckout = async () => {
    if (!address.trim()) { setError('Please enter your shipping address.'); return }
    setPlacing(true); setError('')
    try {
      const checkoutItems = items.map(item => ({
        campaignId: item.campaignId || item._id,
        qty: item.qty,
      }))

      const data = await initCheckout({ items: checkoutItems, address: address.trim() })

      if (data.url) {
        // Clear cart before redirecting to payment gateway
        localStorage.removeItem(CART_KEY)
        // Redirect to SSLCommerz payment page
        window.location.href = data.url
      } else {
        setError('Failed to initialize payment. Please try again.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.')
    } finally { setPlacing(false) }
  }

  const panel = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:24, backdropFilter:'blur(20px)' }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Shopping Cart</span></div>
        <h1 className="page-title">My Cart</h1>
        <p className="page-subtitle">{items.length} item{items.length !== 1 ? 's' : ''} ready to order</p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>🛒</p>
          <p>Your cart is empty</p>
          <Link to="/creator/catalog" className="btn-primary" style={{ marginTop:20, textDecoration:'none' }}>Browse Catalog →</Link>
        </div>
      ) : (
        <div style={{ display:'grid', gap:24 }} className="lg:grid-cols-3">
          {/* Items */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="lg:col-span-2">
            {items.map(item => (
              <div key={item._id} style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderRadius:18, ...panel }} >
                <div style={{ width:60, height:60, borderRadius:14, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>{item.image || '📦'}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:600, color:'#fff', margin:'0 0 4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</p>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', margin:0 }}>{item.brand}</p>
                  {item.cashbackRate > 0 && (
                    <p style={{ fontSize:12, color:'#4ade80', marginTop:4 }}>{item.cashbackRate}% cashback · Save ৳{Math.round(item.price * item.qty * item.cashbackRate / 100).toLocaleString()}</p>
                  )}
                </div>
                {/* Qty */}
                <div style={{ display:'flex', alignItems:'center', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
                  <button onClick={() => updateQty(item._id, -1)} style={{ padding:'8px 14px', color:'rgba(255,255,255,0.5)', cursor:'pointer', background:'none', border:'none', fontSize:16 }}>−</button>
                  <span style={{ padding:'8px 10px', color:'#fff', fontWeight:600, minWidth:32, textAlign:'center', fontSize:14 }}>{item.qty}</span>
                  <button onClick={() => updateQty(item._id, 1)} style={{ padding:'8px 14px', color:'rgba(255,255,255,0.5)', cursor:'pointer', background:'none', border:'none', fontSize:16 }}>+</button>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontSize:15, fontWeight:700, color:'#fff', margin:'0 0 4px' }}>৳{(item.price * item.qty).toLocaleString()}</p>
                  <button onClick={() => removeItem(item._id)} style={{ fontSize:11, color:'rgba(239,68,68,0.5)', cursor:'pointer', background:'none', border:'none', transition:'color 0.15s', padding:0 }}
                    onMouseEnter={e => e.target.style.color='#f87171'}
                    onMouseLeave={e => e.target.style.color='rgba(239,68,68,0.5)'}
                  >Remove</button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div style={{ ...panel, height:'fit-content', position:'sticky', top:32 }}>
            <h2 style={{ fontSize:17, fontWeight:700, color:'#fff', margin:'0 0 20px' }}>Order Summary</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20, fontSize:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'rgba(255,255,255,0.4)' }}>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span style={{ color:'#fff', fontWeight:600 }}>৳{subtotal.toLocaleString()}</span>
              </div>
              {totalCashback > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'rgba(255,255,255,0.4)' }}>Total Cashback</span>
                  <span style={{ color:'#4ade80', fontWeight:600 }}>-৳{totalCashback.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'rgba(255,255,255,0.4)' }}>Shipping</span>
                <span style={{ color:'#4ade80' }}>Free</span>
              </div>
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:600, color:'#fff', fontSize:13 }}>Net Cost After Cashback</span>
                <span style={{ fontSize:22, fontWeight:900, background:'linear-gradient(135deg,#7c3aed,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>৳{netCost.toLocaleString()}</span>
              </div>
            </div>

            {totalCashback > 0 && (
              <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.18)', marginBottom:16 }}>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:0 }}>
                  💡 You pay <strong style={{ color:'#fff' }}>৳{subtotal.toLocaleString()}</strong> now. Cashback of <strong style={{ color:'#4ade80' }}>৳{totalCashback.toLocaleString()}</strong> releases after post verification.
                </p>
              </div>
            )}

            {error && <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:14 }}><p style={{ fontSize:13, color:'#f87171', margin:0 }}>{error}</p></div>}

            {!showCheckout ? (
              <button onClick={() => setShowCheckout(true)} className="btn-primary" style={{ width:'100%', padding:14, fontSize:14 }}>
                Proceed to Checkout
              </button>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label className="field-label">Shipping Address</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
                    placeholder="House, Road, Area, City..."
                    className="field-input" style={{ resize:'none', fontFamily:'inherit' }} />
                </div>

                {/* Payment gateway info */}
                <div style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>Secure Payment via SSLCommerz</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
                    You'll be redirected to SSLCommerz's secure payment gateway where you can pay using bKash, Nagad, Rocket, Visa, Mastercard, and more.
                  </p>
                </div>

                <button onClick={handleCheckout} disabled={placing || !address.trim()} className="btn-primary" style={{ width:'100%', padding:14, fontSize:14 }}>
                  {placing ? (
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" style={{ display:'inline-block' }} />
                      Redirecting to Payment…
                    </span>
                  ) : `Pay ৳${subtotal.toLocaleString()} →`}
                </button>
                <button onClick={() => setShowCheckout(false)} className="btn-ghost" style={{ width:'100%', padding:'10px' }}>← Back</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Cart
