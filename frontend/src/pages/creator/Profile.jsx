import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { updateUser } from '../../services/users'

const Profile = () => {
  const { user, setUser } = useAuth()
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')
  const [form, setForm] = useState({
    name:             user?.name              || '',
    phone:            user?.phone             || '',
    instagramHandle:  user?.instagramHandle   || '',
    tiktokHandle:     user?.tiktokHandle      || '',
    followersCount:   user?.followersCount    || '',
    engagementRate:   user?.engagementRate    || '',
  })

  // Local-only shipping addresses (stored in localStorage since there's no dedicated model)
  const ADDR_KEY = `flextag_addresses_${user?._id}`
  const [addresses, setAddresses] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ADDR_KEY) || '[]') }
    catch { return [] }
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: '', street: '', city: '', zip: '' })

  const saveAddresses = (updated) => {
    setAddresses(updated)
    localStorage.setItem(ADDR_KEY, JSON.stringify(updated))
  }

  const addAddress = () => {
    if (newAddr.label && newAddr.street) {
      saveAddresses([...addresses, { ...newAddr, id: Date.now(), isDefault: addresses.length === 0 }])
      setNewAddr({ label: '', street: '', city: '', zip: '' })
      setShowAddForm(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
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
    } finally {
      setSaving(false)
    }
  }

  const tierBg = {
    diamond: 'from-cyan-300 to-blue-400',
    gold:    'from-yellow-400 to-amber-500',
    silver:  'from-gray-300 to-gray-500',
    bronze:  'from-cyan-600 to-blue-700',
  }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Account Settings</span></div>
        <h1 className="page-title">Profile &amp; Shipping</h1>
        <p className="page-subtitle">Manage your account information and delivery addresses</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Personal Info</h2>
            <button onClick={() => setEditing(!editing)} className="text-xs text-violet-400 hover:text-violet-300 font-medium">
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${tierBg[user?.tier] || tierBg.bronze} flex items-center justify-center text-white text-2xl font-bold`}>
              {user?.name?.[0] || 'C'}
            </div>
            <div>
              <p className="text-lg font-bold text-white">{user?.name}</p>
              <p className="text-sm text-zinc-500">{user?.instagramHandle && `${user.instagramHandle} · `}{(user?.followersCount || 0).toLocaleString()} followers</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-bold border border-yellow-500/20 uppercase">{user?.tier || 'Bronze'}</span>
              </div>
            </div>
          </div>

          {saveMsg && <p className={`text-xs mb-4 p-3 rounded-lg ${saveMsg.includes('saved') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>{saveMsg}</p>}

          <div className="space-y-4">
            {[
              { label: 'Full Name',         key: 'name',           type: 'text' },
              { label: 'Phone',             key: 'phone',          type: 'tel' },
              { label: 'Instagram Handle',  key: 'instagramHandle', type: 'text' },
              { label: 'TikTok Handle',     key: 'tiktokHandle',   type: 'text' },
              { label: 'Follower Count',    key: 'followersCount', type: 'number' },
              { label: 'Engagement Rate (%)', key: 'engagementRate', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">{f.label}</label>
                {editing ? (
                  <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="field-input" />
                ) : (
                  <p className="text-sm text-zinc-300 py-3">{form[f.key] || <span className="text-zinc-600">Not set</span>}</p>
                )}
              </div>
            ))}
            {editing && (
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ width:'100%', padding:14 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Shipping Addresses (localStorage) */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Shipping Addresses</h2>
            <button onClick={() => setShowAddForm(!showAddForm)} className="btn-ghost" style={{ padding:'6px 14px', fontSize:12 }}>
              + Add New
            </button>
          </div>

          {addresses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-white/10 mb-3">
              <p className="text-3xl mb-2">🏠</p>
              <p className="text-sm text-zinc-500">No addresses yet</p>
            </div>
          )}

          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} style={{ padding:'14px 16px', borderRadius:14, border: addr.isDefault ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.07)', background: addr.isDefault ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.03)', transition:'all 0.2s' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{addr.label}</span>
                  {addr.isDefault && <span className="badge badge-info">Default</span>}
                </div>
                <p className="text-sm text-zinc-400">{addr.street}</p>
                <p className="text-xs text-zinc-500">{addr.city}{addr.zip && ` — ${addr.zip}`}</p>
                <div className="flex gap-2 mt-3">
                  {!addr.isDefault && (
                    <button onClick={() => saveAddresses(addresses.map(a => ({ ...a, isDefault: a.id === addr.id })))}
                      className="text-xs text-zinc-500 hover:text-violet-400 transition-colors">Set Default</button>
                  )}
                  <button onClick={() => saveAddresses(addresses.filter(a => a.id !== addr.id))}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors">Remove</button>
                </div>
              </div>
            ))}
          </div>

          {showAddForm && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <input placeholder="Label (e.g. Home)" value={newAddr.label} onChange={e => setNewAddr({ ...newAddr, label: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none" />
              <input placeholder="Street address" value={newAddr.street} onChange={e => setNewAddr({ ...newAddr, street: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="City" value={newAddr.city} onChange={e => setNewAddr({ ...newAddr, city: e.target.value })}
                  className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none" />
                <input placeholder="ZIP Code" value={newAddr.zip} onChange={e => setNewAddr({ ...newAddr, zip: e.target.value })}
                  className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none" />
              </div>
              <button onClick={addAddress} className="btn-primary" style={{ width:'100%', padding:12 }}>Add Address</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
