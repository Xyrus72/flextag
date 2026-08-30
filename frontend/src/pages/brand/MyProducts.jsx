import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { getMyProducts } from '../../services/products'

const STATUS = {
  pending:  { label: 'Pending review', badge: 'badge-warning' },
  approved: { label: 'Approved',       badge: 'badge-success' },
  rejected: { label: 'Rejected',       badge: 'badge-error' },
}

const MyProducts = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')

  useEffect(() => {
    getMyProducts()
      .then(d => setProducts(d.products || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? products : products.filter(p => p.status === filter)
  const counts = { all: products.length, pending: products.filter(p => p.status === 'pending').length, approved: products.filter(p => p.status === 'approved').length, rejected: products.filter(p => p.status === 'rejected').length }

  return (
    <div className="page-root">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div className="page-label"><span>Brand Portal</span></div>
          <h1 className="page-title">My Products</h1>
          <p className="page-subtitle">Track the approval status of your submitted products</p>
        </div>
        <Link to="/brand/post-product" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Post product
          </button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="mp-tab" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
            background: filter === f ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.04)',
            color: filter === f ? '#fff' : 'rgba(var(--ink-rgb),0.4)',
            border: filter === f ? 'none' : '1px solid rgba(var(--ink-rgb),0.07)',
          }}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={26} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 10 }} />
          <p>{filter === 'all' ? "You haven't posted any products yet" : `No ${filter} products`}</p>
          {filter === 'all' && (
            <Link to="/brand/post-product" style={{ textDecoration: 'none' }}>
              <button className="btn-primary" style={{ marginTop: 16 }}>
                Post your first product
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(p => {
            const s = STATUS[p.status] || STATUS.pending
            return (
              <div key={p._id} className="mp-row" style={{ background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.06)', borderRadius: 16, padding: '20px 22px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* Image */}
                <div style={{ width: 72, height: 72, borderRadius: 12, background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.07)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                  ) : <Package size={26} strokeWidth={1.5} style={{ color: 'rgba(var(--ink-rgb),0.3)' }} />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{p.name}</p>
                    <span className={`badge ${s.badge}`}>{s.label}</span>
                    <span className="badge badge-info">{p.cashbackRate}% cashback</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                    <span style={{ color: 'rgba(var(--ink-rgb),0.4)' }}>Category: <span style={{ color: 'rgba(var(--ink-rgb),0.65)' }}>{p.category}</span></span>
                    <span style={{ color: 'rgba(var(--ink-rgb),0.4)' }}>Price: <span className="tnum" style={{ color: 'var(--text)', fontWeight: 700 }}>৳{Number(p.price).toLocaleString()}</span></span>
                    <span style={{ color: 'rgba(var(--ink-rgb),0.4)' }}>Stock: <span className="tnum" style={{ color: 'rgba(var(--ink-rgb),0.65)' }}>{p.stock}</span></span>
                    <span style={{ color: 'rgba(var(--ink-rgb),0.4)' }}>Submitted: <span style={{ color: 'rgba(var(--ink-rgb),0.5)' }}>{new Date(p.createdAt).toLocaleDateString()}</span></span>
                  </div>

                  {p.status === 'rejected' && p.rejectionReason && (
                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                      <p className="field-label" style={{ color: 'rgba(248,113,113,0.7)', marginBottom: 3 }}>Rejection reason</p>
                      <p style={{ fontSize: 13, color: '#f87171' }}>{p.rejectionReason}</p>
                    </div>
                  )}

                  {p.status === 'approved' && (
                    <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(74,222,128,0.6)' }}>
                      Visible to creators in the shop catalog
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .mp-tab { transition-property: background-color, border-color, color; transition-duration: 150ms; transition-timing-function: cubic-bezier(0.2,0,0,1); }
        .mp-row { transition-property: border-color; transition-duration: 150ms; transition-timing-function: cubic-bezier(0.2,0,0,1); }
        .mp-row:hover, .mp-row:focus-within { border-color: rgba(124,58,237,0.2); }
      `}</style>
    </div>
  )
}

export default MyProducts
