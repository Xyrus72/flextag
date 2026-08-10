import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  updateUser,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../../services/users'

/* ── tiny icon helpers ─────────────────────────────────────────── */
const Icon = ({ d, size = 16, cls = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round"
    strokeLinejoin="round" className={cls}>
    <path d={d} />
  </svg>
)
const EditIcon   = () => <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
const SaveIcon   = () => <Icon d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />
const TrashIcon  = () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
const StarIcon   = () => <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
const PlusIcon   = () => <Icon d="M12 5v14M5 12h14" />
const HomeIcon   = () => <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
const XIcon      = () => <Icon d="M18 6L6 18M6 6l12 12" />

const TIER_GRADIENT = {
  diamond: 'from-cyan-300 to-blue-400',
  gold:    'from-yellow-400 to-amber-500',
  silver:  'from-gray-300 to-gray-500',
  bronze:  'from-orange-400 to-amber-600',
}

const EMPTY_ADDR = { label: 'Home', fullName: '', phone: '', street: '', city: '', state: '', zip: '', country: 'Bangladesh' }

export default function Profile() {
  const { user, setUser } = useAuth()

  /* ── profile form ──────────────────────────────────────────────── */
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')
  const [form, setForm] = useState({
    name:             user?.name              || '',
    email:            user?.email             || '',
    phone:            user?.phone             || '',
    instagramHandle:  user?.instagramHandle   || '',
    tiktokHandle:     user?.tiktokHandle      || '',
    followersCount:   user?.followersCount    || '',
    engagementRate:   user?.engagementRate    || '',
  })

  const handleSave = async () => {
    setSaving(true); setSaveMsg('')
    try {
      const { user: updated } = await updateUser(user._id, {
        name:            form.name,
        phone:           form.phone,
        instagramHandle: form.instagramHandle,
        tiktokHandle:    form.tiktokHandle,
        followersCount:  form.followersCount ? Number(form.followersCount) : undefined,
        engagementRate:  form.engagementRate  ? Number(form.engagementRate)  : undefined,
      })
      if (setUser) setUser(updated)
      setSaveMsg('Profile saved!')
      setEditing(false)
    } catch (err) {
      setSaveMsg(err.response?.data?.message || 'Failed to save.')
    } finally { setSaving(false) }
  }

  /* ── shipping addresses (MongoDB) ─────────────────────────────── */
  const [addresses, setAddresses]     = useState([])
  const [addrLoading, setAddrLoading] = useState(true)
  const [addrError, setAddrError]     = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAddr, setNewAddr]         = useState(EMPTY_ADDR)
  const [addrSaving, setAddrSaving]   = useState(false)
  const [editingAddr, setEditingAddr] = useState(null)   // address _id being edited
  const [editForm, setEditForm]       = useState(EMPTY_ADDR)

  useEffect(() => {
    if (!user?._id) return
    getAddresses(user._id)
      .then(d => setAddresses(d.addresses || []))
      .catch(() => setAddrError('Could not load addresses.'))
      .finally(() => setAddrLoading(false))
  }, [user?._id])

  const handleAddAddress = async () => {
    if (!newAddr.street) return
    setAddrSaving(true)
    try {
      const d = await addAddress(user._id, newAddr)
      setAddresses(d.addresses)
      if (setUser) setUser(prev => ({ ...prev, shippingAddresses: d.addresses }))
      setNewAddr(EMPTY_ADDR)
      setShowAddForm(false)
    } catch (err) {
      setAddrError(err.response?.data?.message || 'Failed to add address.')
    } finally { setAddrSaving(false) }
  }

  const handleDeleteAddress = async (addrId) => {
    try {
      const d = await deleteAddress(user._id, addrId)
      setAddresses(d.addresses)
      if (setUser) setUser(prev => ({ ...prev, shippingAddresses: d.addresses }))
    } catch { setAddrError('Failed to delete address.') }
  }

  const handleSetDefault = async (addrId) => {
    try {
      const d = await setDefaultAddress(user._id, addrId)
      setAddresses(d.addresses)
      if (setUser) setUser(prev => ({ ...prev, shippingAddresses: d.addresses }))
    } catch { setAddrError('Failed to update default.') }
  }

  const startEditAddr = (addr) => {
    setEditingAddr(addr._id)
    setEditForm({
      label: addr.label, fullName: addr.fullName, phone: addr.phone,
      street: addr.street, city: addr.city, state: addr.state,
      zip: addr.zip, country: addr.country,
    })
  }

  const handleUpdateAddr = async () => {
    setAddrSaving(true)
    try {
      const d = await updateAddress(user._id, editingAddr, editForm)
      setAddresses(d.addresses)
      if (setUser) setUser(prev => ({ ...prev, shippingAddresses: d.addresses }))
      setEditingAddr(null)
    } catch { setAddrError('Failed to update address.') }
    finally { setAddrSaving(false) }
  }

  /* ── render helpers ──────────────────────────────────────────── */
  const tierGrad = TIER_GRADIENT[user?.tier] || TIER_GRADIENT.bronze

  const FieldInput = ({ label, fkey, type = 'text', readOnly = false }) => (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:6 }}>
        {label}
      </label>
      {editing && !readOnly ? (
        <input type={type} value={form[fkey]}
          onChange={e => setForm({ ...form, [fkey]: e.target.value })}
          style={{ width:'100%', padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:14, outline:'none', transition:'border 0.2s' }}
          onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
          onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
      ) : (
        <p style={{ fontSize:14, color: form[fkey] ? '#e4e4e7' : 'rgba(255,255,255,0.2)', padding:'10px 0' }}>
          {form[fkey] || 'Not set'}
        </p>
      )}
    </div>
  )

  const AddrInput = ({ label, field, state, setter, type = 'text' }) => (
    <div>
      <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:4 }}>{label}</label>
      <input type={type} placeholder={label}
        value={state[field]} onChange={e => setter({ ...state, [field]: e.target.value })}
        style={{ width:'100%', padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:13, outline:'none' }}
        onFocus={e => e.target.style.borderColor='rgba(124,58,237,0.5)'}
        onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'}
      />
    </div>
  )

  return (
    <div className="page-root">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-label"><span>Account Settings</span></div>
        <h1 className="page-title">Profile &amp; Shipping</h1>
        <p className="page-subtitle">Manage your account details and delivery addresses</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:24 }}
        className="lg:grid-cols-2">

        {/* ── Profile Card ─────────────────────────────────────── */}
        <div style={{ borderRadius:20, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', padding:28, display:'flex', flexDirection:'column', gap:0 }}>
          {/* header row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <h2 style={{ fontSize:17, fontWeight:700, color:'#fff', margin:0 }}>Personal Info</h2>
            <button
              onClick={() => { setEditing(!editing); setSaveMsg('') }}
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color: editing ? 'rgba(255,255,255,0.5)' : '#a78bfa', background:'none', border:'none', cursor:'pointer', padding:'6px 12px', borderRadius:8, transition:'all 0.2s' }}
            >
              {editing ? <><XIcon /> Cancel</> : <><EditIcon /> Edit Profile</>}
            </button>
          </div>

          {/* avatar + tier */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24, paddingBottom:24, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:`linear-gradient(135deg, var(--tw-gradient-stops))`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:700, color:'#fff' }}
              className={`bg-gradient-to-br ${tierGrad}`}>
              {user?.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <p style={{ fontSize:16, fontWeight:700, color:'#fff', margin:0 }}>{user?.name}</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', margin:'2px 0 6px' }}>
                {user?.instagramHandle ? `@${user.instagramHandle} · ` : ''}
                {(user?.followersCount || 0).toLocaleString()} followers
              </p>
              <div style={{ display:'flex', gap:6 }}>
                <span style={{ padding:'2px 10px', borderRadius:999, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', background:'rgba(245,158,11,0.12)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.2)' }}>
                  {user?.tier || 'Bronze'}
                </span>
                {user?.igVerified && (
                  <span style={{ padding:'2px 10px', borderRadius:999, fontSize:10, fontWeight:700, background:'rgba(34,197,94,0.12)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.2)' }}>
                    IG Verified ✓
                  </span>
                )}
              </div>
            </div>
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
            <FieldInput label="Full Name"          fkey="name" />
            <FieldInput label="Email"              fkey="email" readOnly />
            <FieldInput label="Phone Number"       fkey="phone" type="tel" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <FieldInput label="Instagram Handle" fkey="instagramHandle" />
              <FieldInput label="TikTok Handle"    fkey="tiktokHandle" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <FieldInput label="Follower Count"      fkey="followersCount"  type="number" />
              <FieldInput label="Engagement Rate (%)" fkey="engagementRate"  type="number" />
            </div>

            {editing && (
              <button onClick={handleSave} disabled={saving}
                style={{ marginTop:8, padding:'13px 0', borderRadius:12, fontWeight:700, fontSize:14, color:'#fff', background:'linear-gradient(135deg,#7c3aed,#06b6d4)', border:'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'opacity 0.2s' }}>
                <SaveIcon />{saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* ── Shipping Addresses Card ───────────────────────────── */}
        <div style={{ borderRadius:20, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', padding:28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <div>
              <h2 style={{ fontSize:17, fontWeight:700, color:'#fff', margin:0 }}>Shipping Addresses</h2>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', margin:'3px 0 0' }}>Saved to your account</p>
            </div>
            <button onClick={() => { setShowAddForm(!showAddForm); setEditingAddr(null) }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight:600, color:'#a78bfa', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)', cursor:'pointer', transition:'all 0.2s' }}>
              <PlusIcon /> Add New
            </button>
          </div>

          {addrError && (
            <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:10, fontSize:13, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171' }}>
              {addrError}
            </div>
          )}

          {/* Add address form */}
          {showAddForm && (
            <div style={{ marginBottom:20, padding:18, borderRadius:14, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.15)' }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#a78bfa', marginBottom:14 }}>New Address</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <AddrInput label="Label (e.g. Home)" field="label"    state={newAddr} setter={setNewAddr} />
                  <AddrInput label="Full Name"          field="fullName" state={newAddr} setter={setNewAddr} />
                </div>
                <AddrInput label="Street Address *" field="street"  state={newAddr} setter={setNewAddr} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <AddrInput label="City"  field="city"  state={newAddr} setter={setNewAddr} />
                  <AddrInput label="State" field="state" state={newAddr} setter={setNewAddr} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <AddrInput label="ZIP Code" field="zip"     state={newAddr} setter={setNewAddr} />
                  <AddrInput label="Country"  field="country" state={newAddr} setter={setNewAddr} />
                </div>
                <AddrInput label="Phone" field="phone" state={newAddr} setter={setNewAddr} type="tel" />
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  <button onClick={handleAddAddress} disabled={addrSaving || !newAddr.street}
                    style={{ flex:1, padding:'11px 0', borderRadius:10, fontWeight:700, fontSize:13, color:'#fff', background:'linear-gradient(135deg,#7c3aed,#06b6d4)', border:'none', cursor: addrSaving ? 'not-allowed' : 'pointer', opacity: addrSaving ? 0.6 : 1 }}>
                    {addrSaving ? 'Saving…' : 'Add Address'}
                  </button>
                  <button onClick={() => setShowAddForm(false)}
                    style={{ padding:'11px 16px', borderRadius:10, fontSize:13, color:'rgba(255,255,255,0.5)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Address list */}
          {addrLoading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(124,58,237,0.3)', borderTopColor:'#7c3aed', animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : addresses.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', borderRadius:14, border:'1px dashed rgba(255,255,255,0.08)' }}>
              <HomeIcon />
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.3)', marginTop:12 }}>No addresses saved yet</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.15)', marginTop:4 }}>Add an address to speed up checkout</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {addresses.map(addr => (
                <div key={addr._id}>
                  {/* edit form for this address */}
                  {editingAddr === addr._id ? (
                    <div style={{ padding:18, borderRadius:14, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)' }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'#a78bfa', marginBottom:12 }}>Edit Address</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                          <AddrInput label="Label"     field="label"    state={editForm} setter={setEditForm} />
                          <AddrInput label="Full Name" field="fullName" state={editForm} setter={setEditForm} />
                        </div>
                        <AddrInput label="Street"  field="street"  state={editForm} setter={setEditForm} />
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                          <AddrInput label="City"  field="city"  state={editForm} setter={setEditForm} />
                          <AddrInput label="State" field="state" state={editForm} setter={setEditForm} />
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                          <AddrInput label="ZIP"     field="zip"     state={editForm} setter={setEditForm} />
                          <AddrInput label="Country" field="country" state={editForm} setter={setEditForm} />
                        </div>
                        <div style={{ display:'flex', gap:8, marginTop:4 }}>
                          <button onClick={handleUpdateAddr} disabled={addrSaving}
                            style={{ flex:1, padding:'10px 0', borderRadius:10, fontWeight:700, fontSize:13, color:'#fff', background:'linear-gradient(135deg,#7c3aed,#06b6d4)', border:'none', cursor:'pointer' }}>
                            {addrSaving ? 'Saving…' : 'Update'}
                          </button>
                          <button onClick={() => setEditingAddr(null)}
                            style={{ padding:'10px 14px', borderRadius:10, fontSize:13, color:'rgba(255,255,255,0.5)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding:'16px 18px', borderRadius:14, transition:'all 0.2s',
                      background: addr.isDefault ? 'rgba(124,58,237,0.07)' : 'rgba(255,255,255,0.02)',
                      border: addr.isDefault ? '1px solid rgba(124,58,237,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{addr.label || 'Address'}</span>
                            {addr.isDefault && (
                              <span style={{ padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, background:'rgba(124,58,237,0.18)', color:'#a78bfa', border:'1px solid rgba(124,58,237,0.3)' }}>
                                ★ Default
                              </span>
                            )}
                          </div>
                          {addr.fullName && <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:'0 0 2px' }}>{addr.fullName}</p>}
                          <p style={{ fontSize:13, color:'rgba(255,255,255,0.65)', margin:'0 0 2px' }}>{addr.street}</p>
                          <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', margin:0 }}>
                            {[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
                            {addr.country ? ` · ${addr.country}` : ''}
                          </p>
                          {addr.phone && <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:4 }}>{addr.phone}</p>}
                        </div>
                      </div>

                      <div style={{ display:'flex', gap:12, marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                        {!addr.isDefault && (
                          <button onClick={() => handleSetDefault(addr._id)}
                            style={{ fontSize:12, color:'rgba(124,58,237,0.8)', fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:0 }}>
                            <StarIcon /> Set as Default
                          </button>
                        )}
                        <button onClick={() => startEditAddr(addr)}
                          style={{ fontSize:12, color:'rgba(255,255,255,0.4)', fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:0 }}>
                          <EditIcon /> Edit
                        </button>
                        <button onClick={() => handleDeleteAddress(addr._id)}
                          style={{ fontSize:12, color:'rgba(239,68,68,0.6)', fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:0, marginLeft:'auto' }}>
                          <TrashIcon /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 1024px) {
          .lg\\:grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}
