import { useState, useEffect } from 'react'
import { CheckCircle2, Package } from 'lucide-react'
import { getAdminProducts, approveProduct, rejectProduct } from '../../services/admin'

const STATUS_CFG = {
  pending:  { label: 'Pending',  badge: 'warning' },
  approved: { label: 'Approved', badge: 'success' },
  rejected: { label: 'Rejected', badge: 'error' },
}

const ProductApproval = () => {
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('pending')
  const [actioning, setActioning]   = useState({})
  const [reasons, setReasons]       = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [imgFailed, setImgFailed]   = useState({})

  // `loading` starts true; changing the filter turns the spinner on from the
  // button (see changeFilter) rather than from inside the effect.
  const load = () => {
    getAdminProducts(filter !== 'all' ? { status: filter } : {})
      .then(d => setProducts(d.products || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const changeFilter = (f) => { setLoading(true); setFilter(f) }

  const handleApprove = async (id) => {
    setActioning(a => ({ ...a, [id]: 'approving' }))
    try {
      await approveProduct(id)
      setProducts(ps => ps.map(p => p._id === id ? { ...p, status: 'approved', rejectionReason: '' } : p))
    } catch (err) { console.error(err) }
    finally { setActioning(a => ({ ...a, [id]: null })) }
  }

  const handleReject = async (id) => {
    setActioning(a => ({ ...a, [id]: 'rejecting' }))
    try {
      await rejectProduct(id, reasons[id] || 'Does not meet listing requirements.')
      setProducts(ps => ps.map(p => p._id === id ? { ...p, status: 'rejected', rejectionReason: reasons[id] || 'Does not meet listing requirements.' } : p))
    } catch (err) { console.error(err) }
    finally { setActioning(a => ({ ...a, [id]: null })) }
  }

  const counts = {
    all:      products.length,
    pending:  products.filter(p => p.status === 'pending').length,
    approved: products.filter(p => p.status === 'approved').length,
    rejected: products.filter(p => p.status === 'rejected').length,
  }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Catalog</span></div>
        <h1 className="page-title">Product Approval</h1>
        <p className="page-subtitle">Review and approve brand product submissions before they appear in the creator catalog</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => changeFilter(f)} style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', textTransform: 'capitalize',
            background: filter === f ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.04)',
            color: filter === f ? '#fff' : 'rgba(var(--ink-rgb),0.4)',
            border: filter === f ? 'none' : '1px solid rgba(var(--ink-rgb),0.07)',
          }}>
            {f} {f !== 'all' ? `(${counts[f]})` : `(${products.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={28} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 10 }} />
          <p>No {filter !== 'all' ? filter : ''} products to review</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {products.map(p => {
            const s = STATUS_CFG[p.status] || STATUS_CFG.pending
            const expanded = expandedId === p._id
            const brandName = p.brandId?.companyName || p.brandId?.name || p.brand || 'Unknown Brand'
            const brandEmail = p.brandId?.email || ''

            return (
              <div key={p._id} style={{ background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.06)', borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb),0.06)'}>

                {/* Header row — clickable to expand */}
                <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', cursor: 'pointer', width: '100%', textAlign: 'left', background: 'none', border: 'none', font: 'inherit' }}
                  onClick={() => setExpandedId(expanded ? null : p._id)}>
                  {/* Product image */}
                  <div style={{ width: 60, height: 60, borderRadius: 10, background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.07)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {p.image && !imgFailed[p._id] ? (
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setImgFailed(f => ({ ...f, [p._id]: true }))} />
                    ) : <Package size={22} strokeWidth={1.5} style={{ opacity: 0.4 }} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{p.name}</p>
                      <span className={`badge badge-${s.badge}`}>{s.label}</span>
                      <span className="badge badge-info">{p.cashbackRate}% cashback</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)' }}>
                      by <span style={{ color: 'rgba(var(--ink-rgb),0.6)', fontWeight: 600 }}>{brandName}</span>
                      &nbsp;·&nbsp;{p.category}
                      &nbsp;·&nbsp;৳{Number(p.price).toLocaleString()}
                      &nbsp;·&nbsp;{new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--ink-rgb),0.3)" strokeWidth="2"
                    style={{ flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(var(--ink-rgb),0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, paddingTop: 16, marginBottom: 16 }}>
                      <div>
                        <p className="field-label" style={{ marginBottom: 4 }}>Brand</p>
                        <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{brandName}</p>
                        {brandEmail && <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)' }}>{brandEmail}</p>}
                      </div>
                      <div>
                        <p className="field-label" style={{ marginBottom: 4 }}>Price</p>
                        <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}>৳{Number(p.price).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="field-label" style={{ marginBottom: 4 }}>Stock</p>
                        <p style={{ fontSize: 13, color: 'var(--text)' }}>{p.stock} units</p>
                      </div>
                      <div>
                        <p className="field-label" style={{ marginBottom: 4 }}>Category</p>
                        <p style={{ fontSize: 13, color: 'var(--text)' }}>{p.category}</p>
                      </div>
                    </div>

                    {p.description && (
                      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.05)', marginBottom: 16 }}>
                        <p className="field-label" style={{ marginBottom: 6 }}>Description</p>
                        <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.55)', lineHeight: 1.6 }}>{p.description}</p>
                      </div>
                    )}

                    {p.image && (
                      <div style={{ marginBottom: 16 }}>
                        <p className="field-label" style={{ marginBottom: 8 }}>Product Image</p>
                        <img src={p.image} alt={p.name} style={{ maxHeight: 200, maxWidth: 200, borderRadius: 12, border: '1px solid rgba(var(--ink-rgb),0.07)', objectFit: 'cover' }}
                          onError={e => e.target.style.display = 'none'} />
                      </div>
                    )}

                    {p.status === 'rejected' && p.rejectionReason && (
                      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', marginBottom: 16 }}>
                        <p className="field-label" style={{ marginBottom: 4 }}>Rejection Reason</p>
                        <p style={{ fontSize: 13, color: '#f87171' }}>{p.rejectionReason}</p>
                      </div>
                    )}

                    {/* Action buttons for pending */}
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', display: 'block', marginBottom: 6 }}>Rejection reason (if rejecting)</label>
                          <input value={reasons[p._id] || ''} onChange={e => setReasons(r => ({ ...r, [p._id]: e.target.value }))}
                            placeholder="e.g. Image quality too low, missing product details..."
                            className="field-input" />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => handleApprove(p._id)} disabled={!!actioning[p._id]}
                            style={{ flex: 1, padding: '11px', borderRadius: 11, border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.1)', color: 'var(--green-ink)', fontSize: 13, fontWeight: 700, cursor: actioning[p._id] ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: actioning[p._id] ? 0.5 : 1, transition: 'all 0.15s' }}
                            onMouseEnter={e => { if (!actioning[p._id]) e.currentTarget.style.background = 'rgba(74,222,128,0.18)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,222,128,0.1)' }}>
                            {actioning[p._id] === 'approving' ? 'Approving...' : '✓ Approve — go live'}
                          </button>
                          <button onClick={() => handleReject(p._id)} disabled={!!actioning[p._id]}
                            style={{ flex: 1, padding: '11px', borderRadius: 11, border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: actioning[p._id] ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: actioning[p._id] ? 0.5 : 1, transition: 'all 0.15s' }}
                            onMouseEnter={e => { if (!actioning[p._id]) e.currentTarget.style.background = 'rgba(248,113,113,0.15)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}>
                            {actioning[p._id] === 'rejecting' ? 'Rejecting...' : '✗ Reject'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Re-approve a rejected product */}
                    {p.status === 'rejected' && (
                      <button onClick={() => handleApprove(p._id)} disabled={!!actioning[p._id]}
                        style={{ padding: '10px 20px', borderRadius: 11, border: '1px solid rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.08)', color: 'var(--green-ink)', fontSize: 13, fontWeight: 700, cursor: actioning[p._id] ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: actioning[p._id] ? 0.5 : 1 }}>
                        {actioning[p._id] === 'approving' ? 'Approving...' : '↩ Re-approve this product'}
                      </button>
                    )}
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

export default ProductApproval
