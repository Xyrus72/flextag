import React, { useState, useEffect } from 'react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../services/admin'

const Categories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState({ name: '', icon: '📦' })
  const [adding, setAdding]     = useState(false)
  const [toggling, setToggling] = useState({})

  const load = () => {
    setLoading(true)
    getCategories()
      .then(d => setCategories(d.categories || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const addCat = async () => {
    if (!form.name.trim()) return
    setAdding(true)
    try {
      const d = await createCategory({ name: form.name.trim(), icon: form.icon })
      setCategories(prev => [...prev, d.category])
      setForm({ name: '', icon: '📦' })
      setShowAdd(false)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add category.')
    } finally {
      setAdding(false)
    }
  }

  const toggleActive = async (id, currentActive) => {
    setToggling(t => ({ ...t, [id]: true }))
    try {
      const d = await updateCategory(id, { active: !currentActive })
      setCategories(categories.map(c => c._id === id ? d.category : c))
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(t => ({ ...t, [id]: false }))
    }
  }

  const deleteCat = async (id) => {
    if (!confirm('Delete this category?')) return
    try {
      await deleteCategory(id)
      setCategories(categories.filter(c => c._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete.')
    }
  }

  return (
    <div className="page-root">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Category Manager</h1>
          <p className="text-zinc-500 mt-1">Manage product categories for the catalog</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all">
          + Add Category
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Category name"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none placeholder:text-zinc-600" />
          </div>
          <div className="w-24">
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Icon</label>
            <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm text-center focus:border-violet-500 outline-none" />
          </div>
          <button onClick={addCat} disabled={adding || !form.name.trim()}
            className="px-6 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/25 hover:bg-emerald-500/25 transition-all disabled:opacity-40">
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-lg text-zinc-400">No categories yet</p>
          <p className="text-sm text-zinc-600">Click "Add Category" to create one</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(c => (
            <div key={c._id} className={`p-5 rounded-2xl border transition-all hover:-translate-y-1 ${c.active ? 'bg-white/[0.03] border-white/5' : 'bg-white/[0.01] border-white/[0.03] opacity-60'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{c.icon}</span>
                <button onClick={() => toggleActive(c._id, c.active)} disabled={toggling[c._id]}
                  className={`w-10 h-5 rounded-full transition-all ${c.active ? 'bg-emerald-500' : 'bg-zinc-700'} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${c.active ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <p className="text-lg font-bold text-white">{c.name}</p>
              <p className="text-xs text-zinc-500 mt-1">{c.products || 0} products · {c.active ? 'Active' : 'Inactive'}</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => deleteCat(c._id)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Categories
