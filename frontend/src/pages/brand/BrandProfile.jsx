import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { updateUser } from '../../services/users'
import { getProducts } from '../../services/products'

const BrandProfile = () => {
  const { user, setUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [form, setForm] = useState({
    companyName:     user?.companyName  || '',
    website:         user?.website      || '',
    productCategory: user?.productCategory || '',
  })

  useEffect(() => {
    getProducts({ brandId: user?._id })
      .then(d => setProducts(d.products || []))
      .catch(console.error)
      .finally(() => setLoadingProducts(false))
  }, [user?._id])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      const { user: updated } = await updateUser(user._id, {
        companyName:     form.companyName,
        website:         form.website,
        productCategory: form.productCategory,
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

  return (
    <div className="page-root">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-8">Brand Profile & Inventory</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Company info */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Company Info</h2>
            <button onClick={() => setEditing(!editing)} className="text-xs text-violet-400 hover:text-violet-300 font-medium">{editing ? 'Cancel' : 'Edit'}</button>
          </div>
          <div className="text-center mb-6 pb-6 border-b border-white/5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              {(user?.companyName || user?.name || 'B')[0]}
            </div>
            <p className="text-lg font-bold text-white">{user?.companyName || user?.name}</p>
            {user?.isVerified && <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">Verified ✓</span>}
            {!user?.isVerified && <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-bold border border-yellow-500/20">Pending Verification</span>}
          </div>

          {saveMsg && <p className={`text-xs mb-4 p-3 rounded-lg ${saveMsg.includes('saved') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>{saveMsg}</p>}

          <div className="space-y-4">
            {[
              { l: 'Company Name',     k: 'companyName' },
              { l: 'Website',         k: 'website' },
              { l: 'Product Category',k: 'productCategory' },
            ].map(f => (
              <div key={f.k}>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1">{f.l}</label>
                {editing
                  ? <input value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none" />
                  : <p className="text-sm text-zinc-300">{form[f.k] || <span className="text-zinc-600">Not set</span>}</p>}
              </div>
            ))}
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1">Email</label>
              <p className="text-sm text-zinc-300">{user?.email}</p>
            </div>
            {editing && (
              <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold disabled:opacity-40">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Product Inventory */}
        <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Product Inventory</h2>
          {loadingProducts ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /></div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 rounded-xl border border-dashed border-white/10">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-sm text-zinc-400">No products yet</p>
              <p className="text-xs text-zinc-600 mt-1">Create a campaign to add products to your inventory</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/5">
                  {['Product', 'Price', 'Cashback', 'Stock', 'Status'].map(h =>
                    <th key={h} className="text-left text-xs text-zinc-500 font-semibold uppercase tracking-wider px-3 py-3">{h}</th>
                  )}
                </tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p._id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-3"><div className="flex items-center gap-3"><span className="text-2xl">{p.image || '📦'}</span><span className="text-sm font-medium text-white">{p.name}</span></div></td>
                      <td className="px-3 py-3 text-sm text-zinc-300">৳{p.price?.toLocaleString()}</td>
                      <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold">{p.cashbackRate}%</span></td>
                      <td className="px-3 py-3 text-sm"><span className={p.stock === 0 ? 'text-red-400 font-semibold' : p.stock < 20 ? 'text-yellow-400' : 'text-white'}>{p.stock || 0}</span></td>
                      <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BrandProfile
