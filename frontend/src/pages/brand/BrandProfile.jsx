import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { updateUser } from '../../services/users'
import { getProducts } from '../../services/products'

/* ── tiny SVG icons ──────────────────────────────────────────────── */
const Icon = ({ d, size = 16, cls = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round"
    strokeLinejoin="round" className={cls}>
    <path d={d} />
  </svg>
)
const EditIcon   = () => <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
const SaveIcon   = () => <Icon d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />
const XIcon      = () => <Icon d="M18 6L6 18M6 6l12 12" />
const UploadIcon = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
const SearchIcon = () => <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
const PackageIcon= () => <Icon d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
const GlobeIcon  = () => <Icon d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
const MapPinIcon = () => <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />

const CATEGORIES = [
  'Fashion', 'Beauty & Skincare', 'Electronics', 'Food & Beverage',
  'Health & Wellness', 'Home & Living', 'Sports & Outdoors', 'Travel', 'Books', 'Other',
]

const StockBadge = ({ stock }) => {
  if (stock === 0)  return <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(239,68,68,0.12)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)' }}>Out of Stock</span>
  if (stock < 10)   return <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(245,158,11,0.12)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.2)' }}>Low: {stock}</span>
  if (stock < 50)   return <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(6,182,212,0.12)', color:'#22d3ee', border:'1px solid rgba(6,182,212,0.2)' }}>{stock} units</span>
  return                   <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(34,197,94,0.12)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.2)' }}>{stock} units</span>
}

const StatusBadge = ({ active, status }) => {
  if (status === 'pending')  return <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(245,158,11,0.12)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.2)' }}>Pending</span>
  if (status === 'rejected') return <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(239,68,68,0.12)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)' }}>Rejected</span>
  if (active) return                <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(34,197,94,0.12)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.2)' }}>Active</span>
  return                            <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(113,113,122,0.15)', color:'#71717a', border:'1px solid rgba(113,113,122,0.2)' }}>Inactive</span>
}

export default function BrandProfile() {
  const { user, setUser } = useAuth()
  const fileRef = useRef(null)

  /* ── profile form ─────────────────────────────────────────────── */
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [logoPreview, setLogoPreview] = useState(user?.logoUrl || '')
  const [form, setForm] = useState({
    companyName:     user?.companyName     || '',
    website:         user?.website         || '',
    productCategory: user?.productCategory || '',
    address:         user?.address         || '',
    logoUrl:         user?.logoUrl         || '',
  })

  const handleLogoFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setLogoPreview(ev.target.result)
      setForm(f => ({ ...f, logoUrl: ev.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true); setSaveMsg('')
    try {
      const { user: updated } = await updateUser(user._id, {
        companyName:     form.companyName,
        website:         form.website,
        productCategory: form.productCategory,
        address:         form.address,
        logoUrl:         form.logoUrl,
      })
      if (setUser) setUser(updated)
      setSaveMsg('Profile saved successfully!')
      setEditing(false)
    } catch (err) {
      setSaveMsg(err.response?.data?.message || 'Failed to save.')
    } finally { setSaving(false) }
  }

  /* ── products ─────────────────────────────────────────────────── */
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    getProducts({ brandId: user?._id })
      .then(d => setProducts(d.products || []))
      .catch(console.error)
      .finally(() => setLoadingProducts(false))
  }, [user?._id])

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    const matchS = filterStatus === 'all'
      || (filterStatus === 'active'   && p.isActive && p.status === 'approved')
      || (filterStatus === 'pending'  && p.status === 'pending')
      || (filterStatus === 'inactive' && !p.isActive)
      || (filterStatus === 'low'      && p.stock < 10)
    return matchQ && matchS
  })

  const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0)
  const activeCount = products.filter(p => p.isActive && p.status === 'approved').length
  const pendingCount = products.filter(p => p.status === 'pending').length
  const lowStockCount = products.filter(p => p.stock < 10 && p.stock > 0).length

  const FieldInput = ({ label, fkey, type = 'text', placeholder = '' }) => (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:5 }}>
        {label}
      </label>
      {editing ? (
        <input type={type} value={form[fkey]} placeholder={placeholder}
          onChange={e => setForm({ ...form, [fkey]: e.target.value })}
          style={{ width:'100%', padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:14, outline:'none', transition:'border 0.2s' }}
          onFocus={e => e.target.style.borderColor='rgba(16,185,129,0.5)'}
          onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}
        />
      ) : (
        <p style={{ fontSize:14, color: form[fkey] ? '#e4e4e7' : 'rgba(255,255,255,0.2)', padding:'10px 0', margin:0 }}>
          {form[fkey] || 'Not set'}
        </p>
      )}
    </div>
  )

  return (
    <div className="page-root">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-label"><span>Brand Settings</span></div>
        <h1 className="page-title">Brand Profile &amp; Inventory</h1>
        <p className="page-subtitle">Manage your brand identity and monitor product stock levels</p>
      </div>

      <div style={{ display:'grid', gap:24 }} className="brand-grid">

        {/* ── Company Profile Card ─────────────────────────────── */}
        <div style={{ borderRadius:20, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', padding:28 }}>

          {/* card header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <h2 style={{ fontSize:17, fontWeight:700, color:'#fff', margin:0 }}>Company Info</h2>
            <button
              onClick={() => { setEditing(!editing); setSaveMsg('') }}
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color: editing ? 'rgba(255,255,255,0.4)' : '#6ee7b7', background:'none', border:'none', cursor:'pointer', padding:'6px 12px', borderRadius:8 }}>
              {editing ? <><XIcon /> Cancel</> : <><EditIcon /> Edit Profile</>}
            </button>
          </div>

          {/* logo + identity */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:24, paddingBottom:24, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ position:'relative', marginBottom:12 }}>
              <div style={{ width:80, height:80, borderRadius:18, overflow:'hidden', background:'linear-gradient(135deg,#10b981,#0d9488)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, fontWeight:800, color:'#fff', boxShadow:'0 8px 32px rgba(16,185,129,0.2)', border:'2px solid rgba(16,185,129,0.2)' }}>
                {logoPreview
                  ? <img src={logoPreview} alt="logo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : (user?.companyName || user?.name || 'B')[0].toUpperCase()
                }
              </div>
              {editing && (
                <button onClick={() => fileRef.current?.click()}
                  style={{ position:'absolute', bottom:-6, right:-6, width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#0d9488)', border:'2px solid #050816', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
                  <UploadIcon />
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoFile} />
                </button>
              )}
            </div>
            <p style={{ fontSize:17, fontWeight:700, color:'#fff', margin:0 }}>{user?.companyName || user?.name}</p>
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              {user?.isVerified
                ? <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(16,185,129,0.12)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }}>✓ Verified Brand</span>
                : <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(245,158,11,0.1)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.2)' }}>⏳ Pending Verification</span>
              }
            </div>
            {editing && (
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:8, textAlign:'center' }}>
                Click the camera icon to upload a new logo
              </p>
            )}
          </div>

          {/* save message */}
          {saveMsg && (
            <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:10, fontSize:13,
              ...(saveMsg.includes('saved')
                ? { background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', color:'#4ade80' }
                : { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171' })
            }}>{saveMsg}</div>
          )}

          {/* fields */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <FieldInput label="Company Name"     fkey="companyName" />
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:5 }}>Email</label>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', padding:'10px 0', margin:0 }}>{user?.email}</p>
            </div>
            <FieldInput label="Website"          fkey="website"         placeholder="https://example.com" />
            <FieldInput label="Company Address"  fkey="address"         placeholder="Street, City, Country" />

            {editing ? (
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:5 }}>Product Category</label>
                <select value={form.productCategory}
                  onChange={e => setForm({ ...form, productCategory: e.target.value })}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color: form.productCategory ? '#fff' : 'rgba(255,255,255,0.3)', fontSize:14, outline:'none', appearance:'none' }}>
                  <option value="" style={{ background:'#1a1a2e' }}>Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c} style={{ background:'#1a1a2e' }}>{c}</option>)}
                </select>
              </div>
            ) : (
              <FieldInput label="Product Category" fkey="productCategory" />
            )}

            {editing && (
              <button onClick={handleSave} disabled={saving}
                style={{ marginTop:8, padding:'13px 0', borderRadius:12, fontWeight:700, fontSize:14, color:'#fff', background:'linear-gradient(135deg,#10b981,#0d9488)', border:'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'opacity 0.2s' }}>
                <SaveIcon />{saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* ── Inventory Section ─────────────────────────────────── */}
        <div style={{ borderRadius:20, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', padding:28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
            <div>
              <h2 style={{ fontSize:17, fontWeight:700, color:'#fff', margin:0 }}>Product Inventory</h2>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', margin:'3px 0 0' }}>{products.length} products total</p>
            </div>
          </div>

          {/* summary stats */}
          {products.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
              {[
                { label:'Total Stock', value: totalStock.toLocaleString(), color:'#a78bfa' },
                { label:'Active',      value: activeCount,                 color:'#4ade80' },
                { label:'Pending',     value: pendingCount,                color:'#fbbf24' },
                { label:'Low Stock',   value: lowStockCount,               color:'#f87171' },
              ].map(s => (
                <div key={s.label} style={{ padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', textAlign:'center' }}>
                  <p style={{ fontSize:18, fontWeight:800, color: s.color, margin:0 }}>{s.value}</p>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', margin:'3px 0 0', textTransform:'uppercase', letterSpacing:'0.08em' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* search + filter */}
          {products.length > 0 && (
            <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:180, display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                <SearchIcon />
                <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ background:'none', border:'none', outline:'none', color:'#fff', fontSize:13, flex:1 }} />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding:'9px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', fontSize:13, outline:'none', appearance:'none', cursor:'pointer' }}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="low">Low Stock</option>
              </select>
            </div>
          )}

          {/* table */}
          {loadingProducts ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid rgba(16,185,129,0.3)', borderTopColor:'#10b981', animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : products.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', borderRadius:14, border:'1px dashed rgba(255,255,255,0.08)' }}>
              <PackageIcon />
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.3)', marginTop:14 }}>No products yet</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.15)', marginTop:4 }}>Post a product to see your inventory here</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,0.25)', fontSize:14 }}>
              No products match your filters
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    {['Product', 'Category', 'Price', 'Cashback', 'Stock', 'Status'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p._id} style={{ borderBottom:'1px solid rgba(255,255,255,0.03)', transition:'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                      <td style={{ padding:'12px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:36, height:36, borderRadius:8, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)' }}>
                            {p.image && p.image.startsWith('http')
                              ? <img src={p.image} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              : p.image || '📦'
                            }
                          </div>
                          <div>
                            <p style={{ fontSize:13, fontWeight:600, color:'#e4e4e7', margin:0, whiteSpace:'nowrap', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</p>
                            <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', margin:0 }}>#{p._id?.slice(-6)}</p>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding:'12px 12px' }}>
                        <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }}>{p.category}</span>
                      </td>

                      <td style={{ padding:'12px 12px', fontSize:13, fontWeight:600, color:'#e4e4e7', whiteSpace:'nowrap' }}>
                        ৳{p.price?.toLocaleString()}
                      </td>

                      <td style={{ padding:'12px 12px' }}>
                        <span style={{ padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700, background:'rgba(124,58,237,0.12)', color:'#a78bfa', border:'1px solid rgba(124,58,237,0.2)' }}>
                          {p.cashbackRate}%
                        </span>
                      </td>

                      <td style={{ padding:'12px 12px' }}>
                        <StockBadge stock={p.stock ?? 0} />
                      </td>

                      <td style={{ padding:'12px 12px' }}>
                        <StatusBadge active={p.isActive} status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .brand-grid { grid-template-columns: 1fr; }
        @media (min-width: 1024px) {
          .brand-grid { grid-template-columns: 320px 1fr; }
        }
      `}</style>
    </div>
  )
}
