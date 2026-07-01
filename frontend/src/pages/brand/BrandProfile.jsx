import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const inventory = [
  { id: 1, name: 'Matte Lipstick Set', price: 1200, cashback: 50, stock: 45, sold: 124, image: '💄', active: true },
  { id: 2, name: 'Vitamin C Serum', price: 950, cashback: 65, stock: 12, sold: 198, image: '🧴', active: true },
  { id: 3, name: 'Face Wash Gel', price: 450, cashback: 60, stock: 0, sold: 145, image: '🫧', active: false },
  { id: 4, name: 'Sunscreen SPF50+', price: 550, cashback: 70, stock: 78, sold: 167, image: '☀️', active: true },
  { id: 5, name: 'Hair Styling Clay', price: 650, cashback: 55, stock: 34, sold: 54, image: '💇', active: true },
]

const BrandProfile = () => {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ companyName: user?.companyName || 'GlowUp Cosmetics Ltd.', website: user?.website || 'https://glowup.com.bd', email: user?.email || 'hello@glowup.com.bd', phone: '+880 1900-111222', address: '12 Gulshan Avenue, Dhaka 1212' })

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-8">Brand Profile & Inventory</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Company Info</h2>
            <button onClick={() => setEditing(!editing)} className="text-xs text-orange-400 hover:text-orange-300 font-medium">{editing ? 'Cancel' : 'Edit'}</button>
          </div>
          <div className="text-center mb-6 pb-6 border-b border-white/5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3 shadow-lg shadow-emerald-500/20">G</div>
            <p className="text-lg font-bold text-white">{form.companyName}</p>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">Verified ✓</span>
          </div>
          <div className="space-y-4">
            {[{ l: 'Company', k: 'companyName' }, { l: 'Website', k: 'website' }, { l: 'Email', k: 'email' }, { l: 'Phone', k: 'phone' }, { l: 'Address', k: 'address' }].map(f => (
              <div key={f.k}>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1">{f.l}</label>
                {editing ? <input value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none" />
                  : <p className="text-sm text-zinc-300">{form[f.k]}</p>}
              </div>
            ))}
            {editing && <button onClick={() => setEditing(false)} className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold">Save Changes</button>}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Product Inventory</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/5">
                {['Product', 'Price', 'Cashback', 'Stock', 'Sold', 'Status'].map(h => <th key={h} className="text-left text-xs text-zinc-500 font-semibold uppercase tracking-wider px-3 py-3">{h}</th>)}
              </tr></thead>
              <tbody>
                {inventory.map(p => (
                  <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3"><div className="flex items-center gap-3"><span className="text-2xl">{p.image}</span><span className="text-sm font-medium text-white">{p.name}</span></div></td>
                    <td className="px-3 py-3 text-sm text-zinc-300">৳{p.price.toLocaleString()}</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold">{p.cashback}%</span></td>
                    <td className="px-3 py-3 text-sm"><span className={p.stock === 0 ? 'text-red-400 font-semibold' : p.stock < 20 ? 'text-yellow-400' : 'text-white'}>{p.stock}</span></td>
                    <td className="px-3 py-3 text-sm text-zinc-400">{p.sold}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>{p.active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrandProfile
