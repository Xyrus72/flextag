import React, { useState, useEffect } from 'react'
import { getDisputes, resolveDispute, investigateDispute } from '../../services/admin'

const typeLabels = { product_damaged: 'Product Issue', wrong_rejection: 'Wrong Rejection', shipping_delay: 'Shipping Delay', other: 'Other' }
const typeIcon   = { product_damaged: '📦', wrong_rejection: '❌', shipping_delay: '🚚', other: '⚠' }
const statusConfig = { open: 'bg-red-500/10 text-red-400', investigating: 'bg-yellow-500/10 text-yellow-400', resolved: 'bg-emerald-500/10 text-emerald-400' }

const DisputePortal = () => {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('open')
  const [expandedId, setExpandedId] = useState(null)
  const [actioning, setActioning]   = useState({})
  const [resolutionText, setResolutionText] = useState({})

  const load = () => {
    setLoading(true)
    getDisputes({ status: 'all' })
      .then(d => setDisputes(d.disputes || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)

  const handleResolve = async (id) => {
    setActioning(a => ({ ...a, [id]: true }))
    try {
      await resolveDispute(id, resolutionText[id] || 'Resolved by admin')
      setDisputes(disputes.map(d => d._id === id ? { ...d, status: 'resolved', resolution: resolutionText[id] || 'Resolved by admin' } : d))
    } catch (err) {
      console.error(err)
    } finally {
      setActioning(a => ({ ...a, [id]: false }))
    }
  }

  const handleInvestigate = async (id) => {
    setActioning(a => ({ ...a, [id]: true }))
    try {
      await investigateDispute(id)
      setDisputes(disputes.map(d => d._id === id ? { ...d, status: 'investigating' } : d))
    } catch (err) {
      console.error(err)
    } finally {
      setActioning(a => ({ ...a, [id]: false }))
    }
  }

  return (
    <div className="page-root">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Dispute Resolution</h1>
      <p className="text-zinc-500 mb-6">Handle creator and brand conflicts</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['open', 'investigating', 'resolved', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
            {f} ({f === 'all' ? disputes.length : disputes.filter(d => d.status === f).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-lg text-zinc-400">No {filter !== 'all' ? filter : ''} disputes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(d => {
            const expanded = expandedId === d._id
            return (
              <div key={d._id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
                <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(expanded ? null : d._id)}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${d.status === 'open' ? 'bg-red-500/10' : d.status === 'investigating' ? 'bg-yellow-500/10' : 'bg-emerald-500/10'}`}>
                    <span className="text-lg">{typeIcon[d.type] || '⚠'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusConfig[d.status]}`}>{d.status}</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 text-[10px] font-medium">{typeLabels[d.type] || d.type}</span>
                    </div>
                    <p className="text-sm text-white">{d.creatorId?.name || 'Creator'} vs {d.brandId?.companyName || d.brandId?.name || 'Brand'}</p>
                    <p className="text-xs text-zinc-500">{new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-bold text-violet-400">৳{d.amount?.toLocaleString()}</span>
                </div>

                {expanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-white/5 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4 pt-4">
                      <div><p className="text-xs text-zinc-500 mb-1">Order</p><p className="text-sm text-blue-400 font-mono">{d.orderId?.orderId || '—'}</p></div>
                      <div><p className="text-xs text-zinc-500 mb-1">Product</p><p className="text-sm text-zinc-300">{d.orderId?.product || '—'}</p></div>
                    </div>
                    <div><p className="text-xs text-zinc-500 mb-1">Description</p><p className="text-sm text-zinc-300">{d.description}</p></div>
                    {d.resolution && (
                      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                        <p className="text-xs text-zinc-500 mb-1">Resolution</p>
                        <p className="text-sm text-emerald-400">{d.resolution}</p>
                      </div>
                    )}
                    {d.status !== 'resolved' && (
                      <div className="space-y-3">
                        <textarea value={resolutionText[d._id] || ''} onChange={e => setResolutionText(t => ({ ...t, [d._id]: e.target.value }))}
                          placeholder="Resolution notes..." rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none resize-none placeholder:text-zinc-600" />
                        <div className="flex gap-2">
                          <button onClick={() => handleResolve(d._id)} disabled={actioning[d._id]}
                            className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-40">
                            {actioning[d._id] ? '...' : '✓ Resolve'}
                          </button>
                          {d.status === 'open' && (
                            <button onClick={() => handleInvestigate(d._id)} disabled={actioning[d._id]}
                              className="px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs font-semibold border border-yellow-500/20 hover:bg-yellow-500/20 transition-all disabled:opacity-40">
                              Investigate
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DisputePortal
