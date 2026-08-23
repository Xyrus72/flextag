import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { placeOrder } from '../../services/orders'
import { getAddresses } from '../../services/users'
import { useAuth } from '../../context/AuthContext'

const CART_KEY = 'flextag_cart'

const Cart = () => {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [items, setItems]                   = useState([])
  const [paymentMethod, setPaymentMethod]   = useState('bkash')
  const [address, setAddress]               = useState('')
  const [savedAddresses, setSavedAddresses] = useState([])
  const [showCheckout, setShowCheckout]     = useState(false)
  const [placing, setPlacing]               = useState(false)
  const [error, setError]                   = useState('')

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem(CART_KEY) || '[]'))
  }, [])

  useEffect(() => {
    if (!user?._id) return
    const addrs = user.shippingAddresses || []
    if (addrs.length > 0) {
      setSavedAddresses(addrs)
      const def = addrs.find(a => a.isDefault) || addrs[0]
      if (def) {
        const formatted = `${def.fullName || user.name} (${def.phone || user.phone})\n${def.street}, ${def.city}${def.zip ? ', ' + def.zip : ''}, ${def.country}`
        setAddress(formatted)
      }
    } else {
      getAddresses(user._id)
        .then(d => {
          const list = d.addresses || []
          setSavedAddresses(list)
          if (list.length > 0) {
            const def = list.find(a => a.isDefault) || list[0]
            const formatted = `${def.fullName || user.name} (${def.phone || user.phone})\n${def.street}, ${def.city}${def.zip ? ', ' + def.zip : ''}, ${def.country}`
            setAddress(formatted)
          }
        })
        .catch(() => {})
    }
  }, [user?._id, user?.shippingAddresses])

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
      for (const item of items) {
        await placeOrder({ campaignId: item.campaignId || item._id, qty: item.qty, address: address.trim(), paymentMethod })
      }
      localStorage.removeItem(CART_KEY)
      navigate('/creator/orders')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.')
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
                <div style={{ width:60, height:60, borderRadius:14, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0, overflow: 'hidden' }}>
                  {item.image?.startsWith('http') ? <img src={item.image} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (item.image || '📦')}
                </div>
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
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <label className="field-label" style={{ margin:0 }}>Shipping Address</label>
                    <Link to="/creator/profile" style={{ fontSize:11, color:'#a78bfa', textDecoration:'none', fontWeight:600 }}>+ Manage Saved Addresses</Link>
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
                      className="field-select" style={{ marginBottom:8, background:'#0b0f24', color:'#fff' }}>
                      {savedAddresses.map(a => (
                        <option key={a._id} value={a._id} style={{ background:'#0b0f24', color:'#fff' }}>
                          {a.label} {a.isDefault ? '★ (Default)' : ''} — {a.street}, {a.city}
                        </option>
                      ))}
                    </select>
                  )}
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
                    placeholder="House, Road, Area, City..."
                    className="field-input" style={{ resize:'none', fontFamily:'inherit' }} />
                </div>
                <div>
                  <label className="field-label">Payment Method</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                    {[
                      { id:'bkash', label:'🔴 bKash', desc:'Mobile banking' },
                      { id:'ssl',   label:'🟢 SSLCommerz', desc:'Card / Bank' },
                    ].map(m => (
                      <button key={m.id} onClick={() => setPaymentMethod(m.id)} style={{
                        width:'100%', padding:'12px 14px', borderRadius:12, display:'flex', alignItems:'center', gap:12,
                        background: paymentMethod === m.id ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
                        border: paymentMethod === m.id ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.07)',
                        cursor:'pointer', transition:'all 0.2s', fontFamily:'inherit',
                      }}>
                        <span style={{ fontSize:20 }}>{m.label.split(' ')[0]}</span>
                        <div style={{ textAlign:'left' }}>
                          <p style={{ fontSize:13, fontWeight:600, color: paymentMethod === m.id ? '#fff' : 'rgba(255,255,255,0.5)', margin:0 }}>{m.label.split(' ').slice(1).join(' ')}</p>
                          <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', margin:0 }}>{m.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleCheckout} disabled={placing || !address.trim()} className="btn-primary" style={{ width:'100%', padding:14, fontSize:14 }}>
                  {placing ? 'Placing Order…' : `Pay ৳${subtotal.toLocaleString()} →`}
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
