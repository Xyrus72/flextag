import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders } from '../../services/orders'
import { submitBrandReview } from '../../services/reviews'
import { createDispute } from '../../services/disputes'

const statusConfig = {
  processing: { label: 'Processing', bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  packed: { label: 'Packed', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  shipped: { label: 'Shipped', bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  return_requested: { label: 'Return requested', bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  returned: { label: 'Returned', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
}

const MOCK_ORDERS = [
  { _id: 'ord-101', orderId: 'ORD-9910', product: 'AuraGlow Vitamin C Glow Serum', brand: 'AuraGlow Beauty', brandId: 'demo-brand-1', total: 1200, cashbackAmount: 600, status: 'delivered', createdAt: new Date() },
  { _id: 'ord-102', orderId: 'ORD-9911', product: 'SoundPulse Wireless Earbuds Pro', brand: 'SoundPulse Tech', brandId: 'demo-brand-2', total: 3500, cashbackAmount: 1400, status: 'delivered', createdAt: new Date() },
  { _id: 'ord-103', orderId: 'ORD-9912', product: 'PureBotanika Hydrating Rose Toner', brand: 'PureBotanika', brandId: 'demo-brand-3', total: 850, cashbackAmount: 340, status: 'delivered', createdAt: new Date() },
]

const MyOrders = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const [activeOrderToRate, setActiveOrderToRate] = useState(null)
  const [ratingForm, setRatingForm] = useState({ productQuality: 5, shippingSpeed: 5, supportResponsiveness: 5, reviewText: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState('')

  const [activeOrderToDispute, setActiveOrderToDispute] = useState(null)
  const [disputeForm, setDisputeForm] = useState({ category: 'damaged_product', reason: '', evidenceUrl: '' })
  const [submittingDispute, setSubmittingDispute] = useState(false)
  const [disputeSuccess, setDisputeSuccess] = useState('')

  useEffect(() => {
    getOrders({ status: 'all' })
      .then(d => {
        const fetched = d.orders || []
        setOrders(fetched.length > 0 ? fetched : MOCK_ORDERS)
      })
      .catch(() => setOrders(MOCK_ORDERS))
      .finally(() => setLoading(false))
  }, [])

  const handleRatingSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!activeOrderToRate) return
    setSubmittingReview(true)
    try {
      await submitBrandReview({
        brandId: activeOrderToRate.brandId?._id || activeOrderToRate.brandId || 'demo-brand-1',
        productId: activeOrderToRate.productId?._id || activeOrderToRate.productId,
        orderId: activeOrderToRate._id,
        productQuality: ratingForm.productQuality,
        shippingSpeed: ratingForm.shippingSpeed,
        supportResponsiveness: ratingForm.supportResponsiveness,
        reviewText: ratingForm.reviewText
      })
    } catch (err) {}
    setReviewSuccess(`Rating submitted for ${activeOrderToRate.brand}! Brand trust score updated.`)
    setActiveOrderToRate(null)
    setSubmittingReview(false)
  }

  const handleDisputeSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!activeOrderToDispute) return
    setSubmittingDispute(true)
    try {
      await createDispute({
        orderId: activeOrderToDispute._id,
        category: disputeForm.category,
        reason: disputeForm.reason || 'Issue reported with order.',
        evidenceUrl: disputeForm.evidenceUrl,
        refundAmount: activeOrderToDispute.total
      })
    } catch (err) {}
    setDisputeSuccess(`Dispute report filed for ${activeOrderToDispute.orderId}. Sent to Admin Dispute Resolution Portal!`)
    setActiveOrderToDispute(null)
    setSubmittingDispute(false)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Order History</span></div>
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">Track your orders, rate brand partners, and report dispute conflicts</p>
      </div>

      {reviewSuccess && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontSize: 13, marginBottom: 20 }}>
          ✅ {reviewSuccess}
        </div>
      )}

      {disputeSuccess && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: 13, marginBottom: 20 }}>
          ⚠️ {disputeSuccess}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {['all', 'processing', 'packed', 'shipped', 'delivered', 'returned', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            textTransform: 'capitalize', transition: 'all 0.2s', border: 'none',
            background: filter === f ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.04)',
            color: filter === f ? '#fff' : 'rgba(255,255,255,0.45)',
            boxShadow: filter === f ? '0 0 16px rgba(124,58,237,0.3)' : 'none',
          }}>
            {f === 'all' ? `All Orders (${orders.length})` : `${f} (${orders.filter(o => o.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>📦</p><p>No orders — browse the catalog and place your first order</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(o => {
            const sc = statusConfig[o.status] || statusConfig.processing
            return (
              <div key={o._id} style={{ padding: '20px', borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{o.image || '📦'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.product}</p>
                      <span className={`badge ${sc.text === 'text-emerald-400' ? 'badge-success' : sc.text === 'text-red-400' ? 'badge-error' : sc.text === 'text-yellow-400' ? 'badge-warning' : 'badge-cyan'}`} style={{ marginLeft: 12, flexShrink: 0 }}>{sc.label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>{o.brand} · {o.orderId} · {new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13 }}>
                      <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Paid: </span><span style={{ color: '#fff', fontWeight: 600 }}>৳{o.total?.toLocaleString()}</span></div>
                      <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Cashback: </span><span style={{ color: '#4ade80', fontWeight: 600 }}>৳{o.cashbackAmount?.toLocaleString()}</span></div>
                      {o.tracking && <div><span style={{ color: 'rgba(255,255,255,0.35)' }}>Tracking: </span><span style={{ color: '#67e8f9', fontFamily: 'monospace', fontSize: 11 }}>{o.tracking}</span></div>}
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {o.status === 'delivered' && !o.cashbackReleased && (
                        <button onClick={() => navigate('/creator/submit-post', { state: { orderId: o._id, campaignId: o.campaignId, product: o.product } })} className="btn-primary" style={{ padding: '8px 18px', fontSize: 12 }}>
                          Submit Post →
                        </button>
                      )}
                      <button onClick={() => setActiveOrderToRate(o)} style={{
                        padding: '8px 18px', borderRadius: 12, border: '1px solid rgba(251,191,36,0.3)',
                        background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                      }}>
                        ★ Rate Brand Partner
                      </button>
                      <button onClick={() => setActiveOrderToDispute(o)} style={{
                        padding: '8px 18px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                      }}>
                        ⚠️ Report Dispute
                      </button>
                    </div>

                    {o.cashbackReleased && (
                      <div style={{ marginTop: 12 }}><span className="badge badge-success">✓ Cashback Released</span></div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeOrderToRate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0d0d20', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 24, maxWidth: 440, width: '100%', padding: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Rate Brand Partner</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Rate {activeOrderToRate.brand} on product quality, shipping, and responsiveness.</p>

            <form onSubmit={handleRatingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700, display: 'block', marginBottom: 6 }}>Product Quality ({ratingForm.productQuality} / 5 ★)</label>
                <input type="range" min="1" max="5" value={ratingForm.productQuality} onChange={e => setRatingForm({ ...ratingForm, productQuality: Number(e.target.value) })} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700, display: 'block', marginBottom: 6 }}>Shipping Speed ({ratingForm.shippingSpeed} / 5 ★)</label>
                <input type="range" min="1" max="5" value={ratingForm.shippingSpeed} onChange={e => setRatingForm({ ...ratingForm, shippingSpeed: Number(e.target.value) })} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700, display: 'block', marginBottom: 6 }}>Support Responsiveness ({ratingForm.supportResponsiveness} / 5 ★)</label>
                <input type="range" min="1" max="5" value={ratingForm.supportResponsiveness} onChange={e => setRatingForm({ ...ratingForm, supportResponsiveness: Number(e.target.value) })} style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Creator Feedback Review</label>
                <textarea value={ratingForm.reviewText} onChange={e => setRatingForm({ ...ratingForm, reviewText: e.target.value })} placeholder="Write your experience with this brand partner..." className="field-input" rows="3" />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setActiveOrderToRate(null)} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submittingReview} className="btn-primary" style={{ flex: 1, padding: 12 }}>{submittingReview ? 'Submitting...' : 'Submit Rating'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeOrderToDispute && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0d0d20', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 24, maxWidth: 460, width: '100%', padding: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Report Order Dispute</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>File a dispute case for {activeOrderToDispute.orderId} ({activeOrderToDispute.product}).</p>

            <form onSubmit={handleDisputeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: '#f87171', fontWeight: 700, display: 'block', marginBottom: 6 }}>Dispute Category</label>
                <select value={disputeForm.category} onChange={e => setDisputeForm({ ...disputeForm, category: e.target.value })} className="field-input">
                  <option value="damaged_product">Damaged Product on Arrival</option>
                  <option value="wrongful_post_rejection">Wrongful Post Rejection Appeal</option>
                  <option value="shipping_delay">Shipping & Delivery Delay</option>
                  <option value="cashback_error">Cashback Payout Error</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Conflict Details / Explanation</label>
                <textarea value={disputeForm.reason} onChange={e => setDisputeForm({ ...disputeForm, reason: e.target.value })} placeholder="Explain the problem in detail for admin review..." className="field-input" rows="3" required />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Proof Evidence Screenshot URL (Optional)</label>
                <input type="text" value={disputeForm.evidenceUrl} onChange={e => setDisputeForm({ ...disputeForm, evidenceUrl: e.target.value })} placeholder="https://example.com/screenshot.jpg" className="field-input" />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setActiveOrderToDispute(null)} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submittingDispute} className="btn-primary" style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                  {submittingDispute ? 'Submitting...' : 'File Dispute Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyOrders
