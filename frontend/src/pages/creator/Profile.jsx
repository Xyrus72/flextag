import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  updateUser,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../../services/users'
import { getNotificationPrefs, updateNotificationPrefs } from '../../services/notifications'

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

const TIER_SOLID = {
  diamond: '#22d3ee',
  gold:    '#f59e0b',
  silver:  '#9ca3af',
  bronze:  '#b45309',
}

const EMPTY_ADDR = { label: 'Home', fullName: '', phone: '', street: '', city: '', state: '', zip: '', country: 'Bangladesh' }

/* Defined at module scope: a component re-created on every render remounts its
 inputs, which is why typing in them used to feel laggy. */
const FieldInput = ({ label, fkey, form, setForm, editing, type = 'text', readOnly = false }) => (
  <div>
    <label style={{ display:'block', fontSize:12, fontWeight:500, letterSpacing:0, textTransform:'none', color:'rgba(var(--ink-rgb),0.45)', marginBottom:6 }}>
      {label}
    </label>
    {editing && !readOnly ? (
      <input type={type} value={form[fkey]}
        onChange={e => setForm({ ...form, [fkey]: e.target.value })}
        className="field-input"
      />
    ) : (
      <p style={{ fontSize:14, color: form[fkey] ? 'var(--text)' : 'var(--text-dim)', padding:'10px 0' }}>
        {form[fkey] || 'Not set'}
      </p>
    )}
  </div>
)

const AddrInput = ({ label, field, state, setter, type = 'text' }) => (
  <div>
    <label style={{ display:'block', fontSize:11, color:'rgba(var(--ink-rgb),0.35)', marginBottom:4 }}>{label}</label>
    <input type={type} placeholder={label}
      value={state[field]} onChange={e => setter({ ...state, [field]: e.target.value })}
      className="field-input"
      style={{ padding:'9px 12px', fontSize:13 }}
    />
  </div>
)


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
  const tierColor = TIER_SOLID[user?.tier] || TIER_SOLID.bronze

  // ── Email preferences ─────────────────────────────────────────
  // Money and dispute emails are opt-out; the daily digest is everything else.
  const [emailPrefs, setEmailPrefs] = useState({ transactional: true, digest: true })
  const [prefsMsg, setPrefsMsg] = useState('')

  useEffect(() => {
    let alive = true
    getNotificationPrefs()
      .then(d => { if (alive && d.prefs) setEmailPrefs(d.prefs) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const togglePref = async (key) => {
    const next = { ...emailPrefs, [key]: !emailPrefs[key] }
    setEmailPrefs(next)
    setPrefsMsg('')
    try {
      const d = await updateNotificationPrefs({ [key]: next[key] })
      setEmailPrefs(d.prefs || next)
      setPrefsMsg(d.message || 'Saved.')
    } catch {
      setEmailPrefs(emailPrefs)   // server refused — put the switch back
      setPrefsMsg('Could not save that.')
    }
  }

  return (
    <div className="page-root">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-label"><span>Account settings</span></div>
        <h1 className="page-title">Profile &amp; shipping</h1>
        <p className="page-subtitle">Manage your account details and delivery addresses</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:24 }}
        className="lg:grid-cols-2">

        {/* ── Profile Card ─────────────────────────────────────── */}
        <div style={{ borderRadius:16, background:'rgba(var(--ink-rgb),0.03)', border:'1px solid rgba(var(--ink-rgb),0.06)', padding:28, display:'flex', flexDirection:'column', gap:0 }}>
          {/* header row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <h2 style={{ fontSize:17, fontWeight:700, color: 'var(--text)', margin:0 }}>Personal info</h2>
            <button
              onClick={() => { setEditing(!editing); setSaveMsg('') }}
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color: editing ? 'rgba(var(--ink-rgb),0.5)' : 'var(--violet-ink)', background:'none', border:'none', cursor:'pointer', padding:'6px 12px', borderRadius:8, transition:'all 0.2s' }}
            >
              {editing ? <><XIcon /> Cancel</> : <><EditIcon /> Edit profile</>}
            </button>
          </div>

          {/* avatar + tier */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24, paddingBottom:24, borderBottom:'1px solid rgba(var(--ink-rgb),0.06)' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background: tierColor, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:700, color:'#fff' }}>
              {user?.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <p style={{ fontSize:16, fontWeight:700, color: 'var(--text)', margin:0 }}>{user?.name}</p>
              <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.4)', margin:'2px 0 6px' }}>
                {user?.instagramHandle ? `@${user.instagramHandle} · ` : ''}
                {(user?.followersCount || 0).toLocaleString()} followers
              </p>
              <div style={{ display:'flex', gap:6 }}>
                <span className="badge badge-warning">
                  {user?.tier || 'Bronze'}
                </span>
                {user?.igVerified && (
                  <span style={{ padding:'2px 10px', borderRadius:999, fontSize:10, fontWeight:700, background:'rgba(34,197,94,0.12)', color:'var(--green-ink)', border:'1px solid rgba(34,197,94,0.2)' }}>
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
                ? { background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', color:'var(--green-ink)' }
                : { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171' })
            }}>{saveMsg}</div>
          )}

          {/* fields */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <FieldInput label="Full name"          fkey="name" form={form} setForm={setForm} editing={editing} />
            <FieldInput label="Email"              fkey="email" readOnly form={form} setForm={setForm} editing={editing} />
            <FieldInput label="Phone number"       fkey="phone" type="tel" form={form} setForm={setForm} editing={editing} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <FieldInput label="Instagram handle" fkey="instagramHandle" form={form} setForm={setForm} editing={editing} />
              <FieldInput label="TikTok handle"    fkey="tiktokHandle" form={form} setForm={setForm} editing={editing} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <FieldInput label="Follower count"      fkey="followersCount"  type="number" form={form} setForm={setForm} editing={editing} />
              <FieldInput label="Engagement rate (%)" fkey="engagementRate"  type="number" form={form} setForm={setForm} editing={editing} />
            </div>

            {editing && (
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ marginTop:8, width:'100%', padding:'13px 0' }}>
                <SaveIcon />{saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </div>
        </div>

        {/* ── Shipping Addresses Card ───────────────────────────── */}
        <div style={{ borderRadius:16, background:'rgba(var(--ink-rgb),0.03)', border:'1px solid rgba(var(--ink-rgb),0.06)', padding:28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <div>
              <h2 style={{ fontSize:17, fontWeight:700, color: 'var(--text)', margin:0 }}>Shipping addresses</h2>
              <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.3)', margin:'3px 0 0' }}>Saved to your account</p>
            </div>
            <button onClick={() => { setShowAddForm(!showAddForm); setEditingAddr(null) }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, fontSize:13, fontWeight:600, color:'var(--violet-ink)', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)', cursor:'pointer', transition:'all 0.2s' }}>
              <PlusIcon /> Add new
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
              <p style={{ fontSize:13, fontWeight:600, color:'var(--violet-ink)', marginBottom:14 }}>New address</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <AddrInput label="Label (e.g. Home)" field="label"    state={newAddr} setter={setNewAddr} />
                  <AddrInput label="Full name"          field="fullName" state={newAddr} setter={setNewAddr} />
                </div>
                <AddrInput label="Street address *" field="street"  state={newAddr} setter={setNewAddr} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <AddrInput label="City"  field="city"  state={newAddr} setter={setNewAddr} />
                  <AddrInput label="State" field="state" state={newAddr} setter={setNewAddr} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <AddrInput label="ZIP code" field="zip"     state={newAddr} setter={setNewAddr} />
                  <AddrInput label="Country"  field="country" state={newAddr} setter={setNewAddr} />
                </div>
                <AddrInput label="Phone" field="phone" state={newAddr} setter={setNewAddr} type="tel" />
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  <button onClick={handleAddAddress} disabled={addrSaving || !newAddr.street}
                    className="btn-primary" style={{ flex:1, padding:'11px 0' }}>
                    {addrSaving ? 'Saving…' : 'Add address'}
                  </button>
                  <button onClick={() => setShowAddForm(false)}
                    style={{ padding:'11px 16px', borderRadius:10, fontSize:13, color:'rgba(var(--ink-rgb),0.5)', background:'rgba(var(--ink-rgb),0.05)', border:'1px solid rgba(var(--ink-rgb),0.08)', cursor:'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Address list */}
          {addrLoading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}>
              <div className="spinner" />
            </div>
          ) : addresses.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', borderRadius:14, border:'1px dashed rgba(var(--ink-rgb),0.08)' }}>
              <HomeIcon />
              <p style={{ fontSize:14, color:'rgba(var(--ink-rgb),0.3)', marginTop:12 }}>No addresses saved yet</p>
              <p style={{ fontSize:12, color:'var(--text-dim)', marginTop:4 }}>Add an address to speed up checkout</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {addresses.map(addr => (
                <div key={addr._id}>
                  {/* edit form for this address */}
                  {editingAddr === addr._id ? (
                    <div style={{ padding:18, borderRadius:14, background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)' }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--violet-ink)', marginBottom:12 }}>Edit address</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                          <AddrInput label="Label"     field="label"    state={editForm} setter={setEditForm} />
                          <AddrInput label="Full name" field="fullName" state={editForm} setter={setEditForm} />
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
                            className="btn-primary" style={{ flex:1, padding:'10px 0' }}>
                            {addrSaving ? 'Saving…' : 'Update'}
                          </button>
                          <button onClick={() => setEditingAddr(null)}
                            style={{ padding:'10px 14px', borderRadius:10, fontSize:13, color:'rgba(var(--ink-rgb),0.5)', background:'rgba(var(--ink-rgb),0.05)', border:'1px solid rgba(var(--ink-rgb),0.08)', cursor:'pointer' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding:'16px 18px', borderRadius:14, transition:'all 0.2s',
                      background: addr.isDefault ? 'rgba(124,58,237,0.07)' : 'rgba(var(--ink-rgb),0.02)',
                      border: addr.isDefault ? '1px solid rgba(124,58,237,0.25)' : '1px solid rgba(var(--ink-rgb),0.06)',
                    }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                            <span style={{ fontSize:13, fontWeight:700, color: 'var(--text)' }}>{addr.label || 'Address'}</span>
                            {addr.isDefault && (
                              <span style={{ padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, background:'rgba(124,58,237,0.18)', color:'var(--violet-ink)', border:'1px solid rgba(124,58,237,0.3)' }}>
                                Default
                              </span>
                            )}
                          </div>
                          {addr.fullName && <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.5)', margin:'0 0 2px' }}>{addr.fullName}</p>}
                          <p style={{ fontSize:13, color:'rgba(var(--ink-rgb),0.65)', margin:'0 0 2px' }}>{addr.street}</p>
                          <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.4)', margin:0 }}>
                            {[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
                            {addr.country ? ` · ${addr.country}` : ''}
                          </p>
                          {addr.phone && <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.35)', marginTop:4 }}>{addr.phone}</p>}
                        </div>
                      </div>

                      <div style={{ display:'flex', gap:12, marginTop:12, paddingTop:12, borderTop:'1px solid rgba(var(--ink-rgb),0.05)' }}>
                        {!addr.isDefault && (
                          <button onClick={() => handleSetDefault(addr._id)}
                            style={{ fontSize:12, color:'rgba(124,58,237,0.8)', fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:0 }}>
                            <StarIcon /> Set as default
                          </button>
                        )}
                        <button onClick={() => startEditAddr(addr)}
                          style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.4)', fontWeight:600, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:0 }}>
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

      {/* ── Email notifications ───────────────────────────────── */}
      <div style={{ borderRadius:16, background:'rgba(var(--ink-rgb),0.03)', border:'1px solid rgba(var(--ink-rgb),0.06)', padding:28, marginTop:24 }}>
        <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>Email notifications</h2>
        <p style={{ fontSize:13, color:'rgba(var(--ink-rgb),0.4)', margin:'0 0 18px' }}>
          The bell only reaches you while you are on the site. These reach you when it matters.
        </p>
        {[
          { key:'transactional', title:'Money & disputes', desc:'Cashback released, payout sent, dispute replies.' },
          { key:'digest',        title:'Daily digest',     desc:'One evening email with everything else you missed.' },
        ].map(row => (
          <div key={row.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'14px 0', borderTop:'1px solid rgba(var(--ink-rgb),0.05)' }}>
            <div>
              <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', margin:0 }}>{row.title}</p>
              <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.4)', margin:'3px 0 0' }}>{row.desc}</p>
            </div>
            <button onClick={() => togglePref(row.key)} role="switch" aria-checked={emailPrefs[row.key]} aria-label={row.title}
              style={{
                width:46, height:26, borderRadius:100, flexShrink:0, cursor:'pointer', position:'relative',
                background: emailPrefs[row.key] ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.12)',
                border:'none', transition:'background 0.2s',
              }}>
              <span style={{
                position:'absolute', top:3, left: emailPrefs[row.key] ? 23 : 3, width:20, height:20, borderRadius:'50%',
                background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </button>
          </div>
        ))}
        {prefsMsg && <p style={{ fontSize:12, color:'var(--green-ink)', margin:'12px 0 0' }}>{prefsMsg}</p>}
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .lg\\:grid-cols-2 { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}
