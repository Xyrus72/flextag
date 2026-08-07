import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyProducts } from '../../services/products'

const STATUS = {
  pending:  { label: 'Pending Review', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.2)',  icon: '⏳' },
  approved: { label: 'Approved',       color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.2)',  icon: '✅' },
  rejected: { label: 'Rejected',       color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', icon: '❌' },
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
          <button style={{ padding: '11px 22px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.3)', whiteSpace: 'nowrap' }}>
            + Post Product
          </button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', textTransform: 'capitalize',
            background: filter === f ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.04)',
            color: filter === f ? '#fff' : 'rgba(255,255,255,0.4)',
            border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.07)',
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
          <p>📦</p>
          <p>{filter === 'all' ? "You haven't posted any products yet" : `No ${filter} products`}</p>
          {filter === 'all' && (
            <Link to="/brand/post-product" style={{ textDecoration: 'none' }}>
              <button style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Post Your First Product
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(p => {
            const s = STATUS[p.status] || STATUS.pending
            return (
              <div key={p._id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '20px 22px', display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                {/* Image */}
                <div style={{ width: 72, height: 72, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; e.target.parentNode.textContent = '📦' }} />
                  ) : '📦'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{p.name}</p>
                    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                      {s.icon} {s.label}
                    </span>
                    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}>
                      {p.cashbackRate}% cashback
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Category: <span style={{ color: 'rgba(255,255,255,0.65)' }}>{p.category}</span></span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Price: <span style={{ color: '#fff', fontWeight: 700 }}>৳{Number(p.price).toLocaleString()}</span></span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Stock: <span style={{ color: 'rgba(255,255,255,0.65)' }}>{p.stock}</span></span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Submitted: <span style={{ color: 'rgba(255,255,255,0.5)' }}>{new Date(p.createdAt).toLocaleDateString()}</span></span>
                  </div>

                  {p.status === 'rejected' && p.rejectionReason && (
                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                      <p style={{ fontSize: 11, color: 'rgba(248,113,113,0.6)', marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rejection Reason</p>
                      <p style={{ fontSize: 13, color: '#f87171' }}>{p.rejectionReason}</p>
                    </div>
                  )}

                  {p.status === 'approved' && (
                    <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(74,222,128,0.6)' }}>
                      ✓ Visible to creators in the Shop Catalog
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyProducts
