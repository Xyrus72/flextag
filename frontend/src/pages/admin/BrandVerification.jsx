import React, { useState } from 'react'

const applications = [
  { id: 1, name: 'FreshKart BD', email: 'info@freshkart.com.bd', website: 'freshkart.com.bd', category: 'Food & Grocery', applied: '2026-06-28', status: 'pending', docs: 'Trade License, TIN' },
  { id: 2, name: 'StyleHub', email: 'hello@stylehub.com', website: 'stylehub.com', category: 'Fashion', applied: '2026-06-29', status: 'pending', docs: 'Trade License' },
  { id: 3, name: 'GadgetWorld BD', email: 'contact@gadgetworld.bd', website: 'gadgetworld.bd', category: 'Tech', applied: '2026-06-30', status: 'pending', docs: 'Trade License, VAT Cert' },
  { id: 4, name: 'PureGlow Skincare', email: 'admin@pureglow.com', website: 'pureglow.com', category: 'Beauty', applied: '2026-06-25', status: 'approved', docs: 'Trade License, TIN' },
  { id: 5, name: 'UrbanCraft', email: 'info@urbancraft.bd', website: 'urbancraft.bd', category: 'Lifestyle', applied: '2026-06-22', status: 'rejected', docs: 'Incomplete' },
]

const statusConfig = { pending: 'bg-yellow-500/10 text-yellow-400', approved: 'bg-emerald-500/10 text-emerald-400', rejected: 'bg-red-500/10 text-red-400' }

const BrandVerification = () => {
  const [items, setItems] = useState(applications)
  const [filter, setFilter] = useState('pending')

  const updateStatus = (id, status) => setItems(items.map(i => i.id === id ? { ...i, status } : i))
  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Brand Verification</h1>
      <p className="text-zinc-500 mb-6">Review and approve brand partner applications</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
            {f} ({f === 'all' ? items.length : items.filter(i => i.status === f).length})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map(app => (
          <div key={app.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 hover:border-white/10 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center text-2xl font-bold text-emerald-400 flex-shrink-0">
                {app.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-base font-semibold text-white">{app.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusConfig[app.status]}`}>{app.status}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span>📧 {app.email}</span>
                  <span>🌐 {app.website}</span>
                  <span>📁 {app.category}</span>
                  <span>📅 {app.applied}</span>
                </div>
                <p className="text-xs text-zinc-600 mt-1">Documents: {app.docs}</p>
              </div>
              {app.status === 'pending' && (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => updateStatus(app.id, 'approved')}
                    className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">✓ Approve</button>
                  <button onClick={() => updateStatus(app.id, 'rejected')}
                    className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20 hover:bg-red-500/20 transition-all">✗ Reject</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BrandVerification
