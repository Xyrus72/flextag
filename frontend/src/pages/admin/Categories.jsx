import React, { useState } from 'react'

const initialCategories = [
  { id: 1, name: 'Beauty', products: 124, icon: '💄', active: true },
  { id: 2, name: 'Fashion', products: 89, icon: '👗', active: true },
  { id: 3, name: 'Tech', products: 56, icon: '🎧', active: true },
  { id: 4, name: 'Lifestyle', products: 34, icon: '🏡', active: true },
  { id: 5, name: 'Food & Grocery', products: 12, icon: '🍕', active: true },
  { id: 6, name: 'Health & Wellness', products: 23, icon: '💪', active: false },
]

const Categories = () => {
  const [categories, setCategories] = useState(initialCategories)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', icon: '📦' })

  const addCategory = () => {
    if (form.name) {
      setCategories([...categories, { id: Date.now(), name: form.name, products: 0, icon: form.icon, active: true }])
      setForm({ name: '', icon: '📦' })
      setShowAdd(false)
    }
  }

  const deleteCategory = (id) => setCategories(categories.filter(c => c.id !== id))
  const toggleActive = (id) => setCategories(categories.map(c => c.id === id ? { ...c, active: !c.active } : c))

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Category Manager</h1>
          <p className="text-zinc-500 mt-1">Manage product categories for the catalog</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all">
          + Add Category
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Category name"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none placeholder:text-zinc-600" />
          </div>
          <div className="w-24">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Icon</label>
            <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm text-center focus:border-orange-500 outline-none" />
          </div>
          <button onClick={addCategory} className="px-6 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/25 hover:bg-emerald-500/25 transition-all">Add</button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(c => (
          <div key={c.id} className={`p-5 rounded-2xl border transition-all hover:-translate-y-1 ${c.active ? 'bg-white/[0.03] border-white/5' : 'bg-white/[0.01] border-white/[0.03] opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">{c.icon}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(c.id)} className={`w-10 h-5 rounded-full transition-all ${c.active ? 'bg-emerald-500' : 'bg-zinc-700'} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${c.active ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            <p className="text-lg font-bold text-white">{c.name}</p>
            <p className="text-xs text-zinc-500 mt-1">{c.products} products</p>
            <div className="flex gap-2 mt-4">
              <button className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">Edit</button>
              <button onClick={() => deleteCategory(c.id)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Categories
