import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { placeOrder } from '../../services/orders'
import { useAuth } from '../../context/AuthContext'

const CART_KEY = 'flextag_cart'

const Cart = () => {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [items, setItems]         = useState([])
  const [paymentMethod, setPaymentMethod] = useState('bkash')
  const [address, setAddress]     = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [placing, setPlacing]     = useState(false)
  const [error, setError]         = useState('')

  // Load from localStorage
  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    setItems(cart)
  }, [])

  const save = (updated) => {
    setItems(updated)
    localStorage.setItem(CART_KEY, JSON.stringify(updated))
  }

  const updateQty = (id, delta) => save(items.map(i => i._id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  const removeItem = (id) => save(items.filter(i => i._id !== id))

  const subtotal      = items.reduce((sum, i) => sum + (i.price * i.qty), 0)
  const totalCashback = items.reduce((sum, i) => sum + Math.round(i.price * i.qty * (i.cashbackRate || 0) / 100), 0)
  const netCost       = subtotal - totalCashback

  const handleCheckout = async () => {
    if (!address.trim()) { setError('Please enter your shipping address.'); return }
    setPlacing(true)
    setError('')
    try {
      // Place orders one at a time (each item in cart = one order)
      for (const item of items) {
        await placeOrder({
          campaignId:    item.campaignId || item._id,
          qty:           item.qty,
          address:       address.trim(),
          paymentMethod,
        })
      }
      localStorage.removeItem(CART_KEY)
      navigate('/creator/orders')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-8">My Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-lg text-zinc-400 mb-2">Your cart is empty</p>
          <Link to="/creator/catalog" className="text-orange-400 hover:text-orange-300 font-medium text-sm">Browse Catalog →</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(item => (
              <div key={item._id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-3xl flex-shrink-0">{item.image || '📦'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                  <p className="text-xs text-zinc-500">{item.brand}</p>
                  {item.cashbackRate > 0 && (
                    <p className="text-xs text-emerald-400 mt-1">{item.cashbackRate}% cashback · Save ৳{Math.round(item.price * item.qty * item.cashbackRate / 100).toLocaleString()}</p>
                  )}
                </div>
                <div className="flex items-center rounded-lg bg-white/5 border border-white/10">
                  <button onClick={() => updateQty(item._id, -1)} className="px-3 py-2 text-zinc-400 hover:text-white text-sm">−</button>
                  <span className="px-2 py-2 text-white font-semibold text-sm min-w-[28px] text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item._id, 1)} className="px-3 py-2 text-zinc-400 hover:text-white text-sm">+</button>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">৳{(item.price * item.qty).toLocaleString()}</p>
                  <button onClick={() => removeItem(item._id)} className="text-xs text-red-400/60 hover:text-red-400 mt-1 transition-colors">Remove</button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 h-fit sticky top-24">
            <h2 className="text-lg font-bold text-white mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between text-zinc-400"><span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items)</span><span className="text-white">৳{subtotal.toLocaleString()}</span></div>
              {totalCashback > 0 && <div className="flex justify-between text-zinc-400"><span>Total Cashback</span><span className="text-emerald-400 font-semibold">-৳{totalCashback.toLocaleString()}</span></div>}
              <div className="flex justify-between text-zinc-400"><span>Shipping</span><span className="text-emerald-400">Free</span></div>
              <div className="border-t border-white/5 pt-3 flex justify-between">
                <span className="font-semibold text-white">Net Cost After Cashback</span>
                <span className="text-xl font-extrabold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">৳{netCost.toLocaleString()}</span>
              </div>
            </div>

            {totalCashback > 0 && (
              <p className="text-xs text-zinc-500 mb-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                💡 You pay <strong className="text-white">৳{subtotal.toLocaleString()}</strong> now. Cashback of <strong className="text-emerald-400">৳{totalCashback.toLocaleString()}</strong> will be released after post verification.
              </p>
            )}

            {error && <p className="text-xs text-red-400 mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{error}</p>}

            {!showCheckout ? (
              <button onClick={() => setShowCheckout(true)} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all">
                Proceed to Checkout
              </button>
            ) : (
              <div className="space-y-3">
                {/* Shipping Address */}
                <div>
                  <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Shipping Address</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
                    placeholder="House, Road, Area, City..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none resize-none placeholder:text-zinc-600" />
                </div>

                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block">Payment Method</label>
                <div className="space-y-2">
                  {[{ id: 'bkash', label: '🔴 bKash', desc: 'Mobile banking' }, { id: 'ssl', label: '🟢 SSLCommerz', desc: 'Card / Bank' }].map(m => (
                    <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${paymentMethod === m.id ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-white/[0.02] border border-white/5 hover:border-white/10'}`}>
                      <span className="text-lg">{m.label.split(' ')[0]}</span>
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${paymentMethod === m.id ? 'text-white' : 'text-zinc-400'}`}>{m.label.split(' ').slice(1).join(' ')}</p>
                        <p className="text-xs text-zinc-600">{m.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={handleCheckout} disabled={placing || !address.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-40">
                  {placing ? 'Placing Order...' : `Pay ৳${subtotal.toLocaleString()} →`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Cart
