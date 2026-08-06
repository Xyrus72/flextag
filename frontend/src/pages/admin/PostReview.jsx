import React, { useState, useEffect } from 'react'
import { getPosts, approvePost, rejectPost } from '../../services/posts'

const PostReview = () => {
  const [posts, setPosts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('pending')
  const [actioning, setActioning] = useState({})
  const [rejectReasons, setRejectReasons] = useState({})
  const [expandedId, setExpandedId] = useState(null)

  const load = () => {
    setLoading(true)
    getPosts({ status: filter === 'all' ? undefined : filter })
      .then(d => setPosts(d.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleApprove = async (id) => {
    setActioning(a => ({ ...a, [id]: 'approving' }))
    try {
      await approvePost(id)
      setPosts(posts.map(p => p._id === id ? { ...p, status: 'approved' } : p))
    } catch (err) {
      console.error(err)
    } finally {
      setActioning(a => ({ ...a, [id]: null }))
    }
  }

  const handleReject = async (id) => {
    setActioning(a => ({ ...a, [id]: 'rejecting' }))
    try {
      await rejectPost(id, rejectReasons[id] || 'Does not meet campaign requirements.')
      setPosts(posts.map(p => p._id === id ? { ...p, status: 'rejected' } : p))
    } catch (err) {
      console.error(err)
    } finally {
      setActioning(a => ({ ...a, [id]: null }))
    }
  }

  const statusConfig = {
    pending:  { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  label: 'Pending' },
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Approved' },
    rejected: { bg: 'bg-red-500/10',     text: 'text-red-400',     label: 'Rejected' },
  }

  const counts = {
    pending:  posts.filter(p => p.status === 'pending').length,
    approved: posts.filter(p => p.status === 'approved').length,
    rejected: posts.filter(p => p.status === 'rejected').length,
  }

  return (
    <div className="page-root">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Post Review</h1>
      <p className="text-zinc-500 mb-6">Approve or reject creator post submissions</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
            {f} {f !== 'all' && `(${counts[f] || 0})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-lg text-zinc-400">No {filter !== 'all' ? filter : ''} posts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(p => {
            const sc       = statusConfig[p.status] || statusConfig.pending
            const expanded = expandedId === p._id
            return (
              <div key={p._id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden hover:border-white/10 transition-all">
                <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(expanded ? null : p._id)}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {(p.creatorId?.name || 'C')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-white">{p.creatorId?.name || 'Creator'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 text-[10px] capitalize">{p.platform}</span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">
                      {p.campaignId?.title || 'Campaign'} · {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-zinc-500 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {expanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-white/5 space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4 pt-4">
                      <div><p className="text-xs text-zinc-500 mb-1">Creator</p><p className="text-sm text-zinc-300">{p.creatorId?.name}</p><p className="text-xs text-zinc-500">{p.creatorId?.instagramHandle || '—'}</p></div>
                      <div><p className="text-xs text-zinc-500 mb-1">Followers</p><p className="text-sm text-zinc-300">{(p.creatorId?.followersCount || 0).toLocaleString()}</p></div>
                      <div><p className="text-xs text-zinc-500 mb-1">Post URL</p>
                        <a href={p.postUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline break-all">{p.postUrl}</a>
                      </div>
                    </div>

                    {p.campaignId && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Campaign Requirements</p>
                        <div className="flex flex-wrap gap-3 text-xs text-zinc-300">
                          {p.campaignId.hashtags && <span>🏷 {p.campaignId.hashtags}</span>}
                          {p.campaignId.handles  && <span>@ {p.campaignId.handles}</span>}
                        </div>
                      </div>
                    )}

                    {p.status === 'rejected' && p.rejectionReason && (
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                        <p className="text-xs text-zinc-500 mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-400">{p.rejectionReason}</p>
                      </div>
                    )}

                    {p.status === 'pending' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-zinc-500 font-medium block mb-1.5">Rejection reason (if rejecting)</label>
                          <input value={rejectReasons[p._id] || ''} onChange={e => setRejectReasons(r => ({ ...r, [p._id]: e.target.value }))}
                            placeholder="e.g. Missing required hashtag..."
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none placeholder:text-zinc-600" />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => handleApprove(p._id)} disabled={!!actioning[p._id]}
                            className="px-5 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-40">
                            {actioning[p._id] === 'approving' ? '...' : '✓ Approve & Release Cashback'}
                          </button>
                          <button onClick={() => handleReject(p._id)} disabled={!!actioning[p._id]}
                            className="px-5 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-40">
                            {actioning[p._id] === 'rejecting' ? '...' : '✗ Reject'}
                          </button>
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

export default PostReview
