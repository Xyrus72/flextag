import { useState, useEffect } from 'react'
import { getUsers, verifyUser } from '../../services/users'

const statusConfig = {
  pending:  'bg-yellow-500/10 text-yellow-400',
  approved: 'bg-emerald-500/10 text-emerald-400',
  rejected: 'bg-red-500/10 text-red-400',
}

const BrandVerification = () => {
  const [brands, setBrands]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('pending')
  const [actioning, setActioning] = useState({})

  // Every setState here lands in a promise callback: `loading` starts true, and
  // a manual refresh flips it back on from the handler that asked for one.
  const load = () => {
    getUsers({ role: 'brand' })
      .then(d => setBrands(d.users || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Map isVerified → status label
  const getStatus = (b) => {
    if (b.isVerified === true)  return 'approved'
    if (b.isVerified === false && b.updatedAt !== b.createdAt) return 'rejected'
    return 'pending'
  }

  const filteredBrands = filter === 'all' ? brands : brands.filter(b => getStatus(b) === filter)

  const handleAction = async (id, approve) => {
    setActioning(a => ({ ...a, [id]: true }))
    try {
      await verifyUser(id, approve)
      setBrands(brands.map(b => b._id === id ? { ...b, isVerified: approve } : b))
    } catch (err) {
      console.error(err)
    } finally {
      setActioning(a => ({ ...a, [id]: false }))
    }
  }

  return (
    <div className="page-root">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Brand Verification</h1>
      <p className="text-zinc-500 mb-6">Review and approve brand partner applications</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
            {f} ({f === 'all' ? brands.length : brands.filter(b => getStatus(b) === f).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-lg text-zinc-400">No {filter !== 'all' ? filter : ''} brands found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBrands.map(app => {
            const status = getStatus(app)
            return (
              <div key={app._id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 hover:border-white/10 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center text-2xl font-bold text-emerald-400 flex-shrink-0">
                    {(app.companyName || app.name)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-semibold text-white">{app.companyName || app.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusConfig[status]}`}>{status}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span>📧 {app.email}</span>
                      {app.website    && <span>🌐 {app.website}</span>}
                      {app.productCategory && <span>📁 {app.productCategory}</span>}
                      <span>📅 Joined {new Date(app.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleAction(app._id, true)} disabled={actioning[app._id]}
                        className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-40">
                        {actioning[app._id] ? '...' : '✓ Approve'}
                      </button>
                      <button onClick={() => handleAction(app._id, false)} disabled={actioning[app._id]}
                        className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-40">
                        {actioning[app._id] ? '...' : '✗ Reject'}
                      </button>
                    </div>
                  )}
                  {status === 'approved' && (
                    <button onClick={() => handleAction(app._id, false)}
                      className="px-4 py-2 rounded-lg bg-white/5 text-zinc-400 text-xs font-semibold border border-white/10 hover:bg-white/10 transition-all">
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BrandVerification
