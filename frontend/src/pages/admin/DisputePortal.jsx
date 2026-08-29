import React, { useState, useEffect } from 'react'
import { getDisputes, resolveDispute, rejectDispute } from '../../services/disputes'

const categoryLabels = {
  damaged_product: 'Damaged Product',
  wrongful_post_rejection: 'Wrongful Post Rejection',
  shipping_delay: 'Shipping Delay',
  cashback_error: 'Cashback Payout Error',
  other: 'Other Inquiry'
}

const statusConfig = {
  open: { label: 'Open Conflict', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  under_review: { label: 'Under Review', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  resolved_refunded: { label: 'Resolved & Refunded', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  rejected: { label: 'Dismissed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' }
}

const DisputePortal = () => {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const [selectedDispute, setSelectedDispute] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [refundInput, setRefundInput] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [actionNotice, setActionNotice] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = () => {
    getDisputes()
      .then(d => setDisputes(d.disputes || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const openInspection = (d) => {
    setSelectedDispute(d)
    setRefundInput(d.refundAmount || d.orderId?.total || 1000)
    setResolutionNotes('')
    setActionNotice('')
  }

  const handleResolveRefund = async () => {
    if (!selectedDispute) return
    setProcessing(true)
    try {
      await resolveDispute(selectedDispute._id, {
        resolutionNotes,
        refundAmount: Number(refundInput)
      })
      setActionNotice(`Dispute ${selectedDispute.disputeId} resolved! Manual refund of ৳${refundInput} credited.`)
      setSelectedDispute(null)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectDispute = async () => {
    if (!selectedDispute) return
    setProcessing(true)
    try {
      await rejectDispute(selectedDispute._id, { resolutionNotes })
      setActionNotice(`Dispute ${selectedDispute.disputeId} dismissed.`)
      setSelectedDispute(null)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>System Administration</span></div>
        <h1 className="page-title">Admin Dispute Resolution Portal</h1>
        <p className="page-subtitle">Inspect order conflicts, review proof evidence, inspect transaction history, and issue manual refunds</p>
      </div>

      {actionNotice && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: 13, marginBottom: 20 }}>
          ✅ {actionNotice}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {['all', 'open', 'under_review', 'resolved_refunded', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            textTransform: 'capitalize', transition: 'all 0.2s', border: 'none',
            background: filter === f ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.04)',
            color: filter === f ? '#fff' : 'rgba(255,255,255,0.45)',
            boxShadow: filter === f ? '0 0 16px rgba(124,58,237,0.3)' : 'none',
          }}>
            {f === 'all' ? `All Cases (${disputes.length})` : `${statusConfig[f]?.label || f} (${disputes.filter(d => d.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>🛡️</p><p>No active dispute cases in this status category.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(d => {
            const st = statusConfig[d.status] || statusConfig.open
            return (
              <div key={d._id} style={{ padding: '20px', borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyBetween: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#a78bfa', fontFamily: 'monospace' }}>{d.disputeId}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontWeight: 700 }}>
                        {st.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>
                        {categoryLabels[d.category] || d.category}
                      </span>
                    </div>

                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{d.reason}</p>

                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.4)', flexWrap: 'wrap' }}>
                      <span>Creator: <strong style={{ color: '#fff' }}>{d.creatorId?.name || 'Ayesha Rahman'}</strong> ({d.creatorId?.instagramHandle || '@creator'})</span>
                      <span>Brand: <strong style={{ color: '#fff' }}>{d.brandId?.name || 'AuraGlow Beauty'}</strong></span>
                      <span>Order: <strong style={{ color: '#67e8f9' }}>{d.orderId?.orderId || 'ORD-9910'}</strong></span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#34d399' }}>৳{d.refundAmount?.toLocaleString()}</span>
                    <button onClick={() => openInspection(d)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                      Inspect & Resolve →
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedDispute && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0d0d20', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 24, maxWidth: 540, width: '100%', padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#a78bfa', fontFamily: 'monospace' }}>{selectedDispute.disputeId}</span>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>Dispute Resolution Case</h2>
              </div>
              <button onClick={() => setSelectedDispute(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#67e8f9', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Conflict Description</p>
              <p style={{ fontSize: 13, color: '#fff', margin: 0, lineHeight: 1.5 }}>{selectedDispute.reason}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}>Creator Profile</span>
                <strong style={{ color: '#fff' }}>{selectedDispute.creatorId?.name}</strong>
                <p style={{ color: '#a78bfa', margin: '2px 0 0' }}>{selectedDispute.creatorId?.instagramHandle}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}>Order Transaction</span>
                <strong style={{ color: '#fff' }}>{selectedDispute.orderId?.product || 'AuraGlow Serum'}</strong>
                <p style={{ color: '#34d399', margin: '2px 0 0' }}>Paid: ৳{selectedDispute.orderId?.total || selectedDispute.refundAmount}</p>
              </div>
            </div>

            {selectedDispute.evidenceUrl && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Proof Evidence Screenshot</p>
                <img src={selectedDispute.evidenceUrl} alt="Evidence" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#34d399', fontWeight: 700, display: 'block', marginBottom: 6 }}>Manual Refund Amount (৳ BDT)</label>
                <input type="number" value={refundInput} onChange={e => setRefundInput(e.target.value)} className="field-input" />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Admin Resolution Notes</label>
                <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} placeholder="State reason for manual refund approval or dismissal..." className="field-input" rows="3" />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={handleRejectDispute} disabled={processing} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700, cursor: 'pointer' }}>
                  Dismiss Dispute
                </button>
                <button onClick={handleResolveRefund} disabled={processing} className="btn-primary" style={{ flex: 1, padding: 12 }}>
                  {processing ? 'Processing...' : `Issue ৳${refundInput} Refund`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DisputePortal
