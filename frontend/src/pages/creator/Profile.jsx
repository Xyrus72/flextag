import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const Profile = () => {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', instagram: user?.instagramHandle || '' })
  const [addresses, setAddresses] = useState([
    { id: 1, label: 'Home', street: 'House 24, Road 7, Dhanmondi', city: 'Dhaka', zip: '1205', isDefault: true },
    { id: 2, label: 'Office', street: 'Flat 5B, Green Tower, Gulshan-2', city: 'Dhaka', zip: '1212', isDefault: false },
  ])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: '', street: '', city: '', zip: '' })

  const addAddress = () => {
    if (newAddr.label && newAddr.street) {
      setAddresses([...addresses, { ...newAddr, id: Date.now(), isDefault: false }])
      setNewAddr({ label: '', street: '', city: '', zip: '' })
      setShowAddForm(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-8">Profile & Shipping</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Personal Info</h2>
            <button onClick={() => setEditing(!editing)} className="text-xs text-orange-400 hover:text-orange-300 font-medium">
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.[0] || 'C'}
            </div>
            <div>
              <p className="text-lg font-bold text-white">{user?.name}</p>
              <p className="text-sm text-zinc-500">{user?.instagramHandle} · {user?.followers?.toLocaleString()} followers</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-bold border border-yellow-500/20 uppercase">{user?.tier}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">Verified ✓</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {[{ label: 'Full Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Instagram', key: 'instagram' }].map(f => (
              <div key={f.key}>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">{f.label}</label>
                {editing ? (
                  <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all" />
                ) : (
                  <p className="text-sm text-zinc-300 py-3">{form[f.key]}</p>
                )}
              </div>
            ))}
            {editing && (
              <button onClick={() => setEditing(false)} className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all">
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Shipping Addresses */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Shipping Addresses</h2>
            <button onClick={() => setShowAddForm(!showAddForm)} className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/20 hover:bg-orange-500/20 transition-all">
              + Add New
            </button>
          </div>

          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className={`p-4 rounded-xl border transition-all ${addr.isDefault ? 'bg-orange-500/5 border-orange-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{addr.label}</span>
                  {addr.isDefault && <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-bold">Default</span>}
                </div>
                <p className="text-sm text-zinc-400">{addr.street}</p>
                <p className="text-xs text-zinc-500">{addr.city} — {addr.zip}</p>
                <div className="flex gap-2 mt-3">
                  {!addr.isDefault && (
                    <button onClick={() => setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === addr.id })))}
                      className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">Set Default</button>
                  )}
                  <button onClick={() => setAddresses(addresses.filter(a => a.id !== addr.id))}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors">Remove</button>
                </div>
              </div>
            ))}
          </div>

          {showAddForm && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <input placeholder="Label (e.g. Home)" value={newAddr.label} onChange={e => setNewAddr({ ...newAddr, label: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none" />
              <input placeholder="Street address" value={newAddr.street} onChange={e => setNewAddr({ ...newAddr, street: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="City" value={newAddr.city} onChange={e => setNewAddr({ ...newAddr, city: e.target.value })}
                  className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none" />
                <input placeholder="ZIP Code" value={newAddr.zip} onChange={e => setNewAddr({ ...newAddr, zip: e.target.value })}
                  className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none" />
              </div>
              <button onClick={addAddress} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-bold">Add Address</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
