import { useState, useEffect } from 'react'
import { getPosts, approvePost, rejectPost } from '../../services/posts'
import { verifyInstagramPost } from '../../services/instagram'

/* ── Constants ─────────────────────────────────────────────────────────────── */

const STATUS_CONFIG = {
  pending:  { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  label: 'Pending' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Approved' },
  rejected: { bg: 'bg-red-500/10',     text: 'text-red-400',     label: 'Rejected' },
  deleted:  { bg: 'bg-zinc-500/10',    text: 'text-zinc-400',    label: 'Deleted' },
}

const VERIFY_BADGE = {
  passed:  { cls: 'badge-success', label: 'Verified' },
  failed:  { cls: 'badge-error',   label: 'Failed' },
  error:   { cls: 'badge-warning', label: "Couldn't verify" },
  pending: { cls: 'badge-neutral', label: 'Not verified yet' },
}

const RETENTION_BADGE = {
  alive:   { cls: 'badge-success', label: 'Still live' },
  removed: { cls: 'badge-error',   label: 'Removed' },
  pending: { cls: 'badge-neutral', label: 'Retention check pending' },
  skipped: { cls: 'badge-neutral', label: 'Retention check skipped' },
}

const MEDIA_LABEL = { reel: 'Reel', video: 'Video', carousel: 'Carousel', image: 'Image' }

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const isNum = (n) => n != null && n !== '' && !Number.isNaN(Number(n))
const fmtNum = (n) => (isNum(n) ? Number(n).toLocaleString() : '—')

const fmtDate = (d) => {
  if (!d) return '—'
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return '—'
  return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const fmtDateTime = (d) => {
  if (!d) return '—'
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return '—'
  return t.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const errMsg = (err, fallback) => err?.response?.data?.message || err?.message || fallback

/** Campaign hashtags/handles are comma-separated strings (may include '#'/'@'). */
const splitTags = (value, prefix) => {
  if (value == null) return []
  const raw = Array.isArray(value) ? value : String(value).split(/[\s,]+/)
  return raw
    .map((t) => String(t || '').trim().replace(/^[#@]+/, ''))
    .filter(Boolean)
    .map((t) => `${prefix}${t}`)
}

/** Merge a verify-post response into the post row, keeping the populated refs we already have. */
const mergeVerified = (p, res) => {
  const next = res?.post && typeof res.post === 'object' ? res.post : {}
  return {
    ...p,
    ...next,
    _id: p._id,
    creatorId: p.creatorId,
    campaignId: p.campaignId,
    orderId: p.orderId,
    verification: next.verification || res?.verification || p.verification,
    autoApproved: Boolean(next.autoApproved ?? res?.autoApproved ?? p.autoApproved),
  }
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

const Chip = ({ children, tone = 'neutral' }) => {
  const cls = tone === 'cyan' ? 'badge-cyan' : tone === 'info' ? 'badge-info' : 'badge-neutral'
  return <span className={`badge ${cls}`} style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>{children}</span>
}

const CampaignRequirements = ({ campaign }) => {
  const hashtags = splitTags(campaign.hashtags, '#')
  const handles = splitTags(campaign.handles, '@')
  const contentType = campaign.contentType && campaign.contentType !== 'any' ? campaign.contentType : null
  const empty = !hashtags.length && !handles.length && !contentType
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Campaign Requirements</p>
      {empty ? (
        <p className="text-xs text-zinc-500">No specific requirements set for this campaign.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((t) => <Chip key={t} tone="info">{t}</Chip>)}
          {handles.map((t) => <Chip key={t} tone="cyan">{t}</Chip>)}
          {contentType && <Chip>Type: {MEDIA_LABEL[contentType] || contentType}</Chip>}
        </div>
      )}
    </div>
  )
}

const CheckIcon = ({ passed }) => {
  if (passed === true) return <span className="text-emerald-400 font-bold w-4 text-center flex-shrink-0">✓</span>
  if (passed === false) return <span className="text-red-400 font-bold w-4 text-center flex-shrink-0">✗</span>
  return <span className="text-zinc-500 font-bold w-4 text-center flex-shrink-0">?</span>
}

const SnapshotThumb = ({ src, href }) => {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  const img = (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', display: 'block', flexShrink: 0, border: '1px solid rgba(var(--ink-rgb),0.08)' }}
    />
  )
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">{img}</a>
    : img
}

const RetentionRow = ({ retention }) => {
  // Every post carries a default { status:'pending', checkAt:null }; only show once a check is actually scheduled/done.
  if (!retention?.status || (retention.status === 'pending' && !retention.checkAt)) return null
  const b = RETENTION_BADGE[retention.status] || RETENTION_BADGE.pending
  let detail = null
  if (retention.status === 'removed') detail = <span className="text-red-400">Post was removed before the retention deadline</span>
  else if (retention.status === 'pending' && retention.checkAt) detail = <>Checking on {fmtDateTime(retention.checkAt)}</>
  else if (retention.status === 'alive' && retention.checkedAt) detail = <>Confirmed live {fmtDateTime(retention.checkedAt)}</>
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
      <span className="text-zinc-500">Retention:</span>
      <span className={`badge ${b.cls}`}>{b.label}</span>
      {detail && <span>{detail}</span>}
    </div>
  )
}

const VerificationBlock = ({ post, reverifying, error, onReverify }) => {
  const v = post.verification || {}
  const status = v.status || 'pending'
  const badge = VERIFY_BADGE[status] || VERIFY_BADGE.pending
  const checks = Array.isArray(v.checks) ? v.checks : []
  const snap = v.snapshot && typeof v.snapshot === 'object' ? v.snapshot : null
  const permalink = snap?.permalink || post.postUrl

  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Instagram verification</p>
          <span className={`badge ${badge.cls}`}>{badge.label}</span>
          {post.autoApproved && <span className="badge badge-info">Auto-verified</span>}
        </div>
        <div className="flex items-center gap-3">
          {v.checkedAt && <span className="text-[11px] text-zinc-500">Checked {fmtDateTime(v.checkedAt)}</span>}
          <button
            type="button"
            className="btn-ghost"
            disabled={reverifying}
            onClick={(e) => { e.stopPropagation(); onReverify() }}
            style={{ padding: '6px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {reverifying
              ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Verifying…</>
              : 'Re-verify'}
          </button>
        </div>
      </div>

      {v.error && <p className="text-xs text-amber-400">{v.error}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {checks.length > 0 ? (
        <ul className="space-y-1.5">
          {checks.map((c, i) => (
            <li key={c.key || `${i}-${c.label}`} className="flex items-start gap-2 text-xs">
              <CheckIcon passed={c.passed} />
              <div className="min-w-0">
                <span className={c.required ? 'font-bold text-zinc-200' : 'text-zinc-300'}>{c.label || c.key}</span>
                {c.required && <span className="ml-1 text-[10px] text-zinc-500 uppercase tracking-wider">required</span>}
                {c.detail && <p className="text-zinc-500 mt-0.5 leading-snug">{c.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-zinc-500">
          {status === 'pending' ? 'This post has not been checked against the campaign rules yet.' : 'No check details were recorded.'}
        </p>
      )}

      {snap && (
        <div className="flex items-center gap-3 pt-2 border-t border-white/5">
          <SnapshotThumb src={snap.thumbnail} href={permalink} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 min-w-0">
            <span><span className="text-zinc-500">Likes</span> <span className="text-white font-semibold">{snap.likes == null ? 'hidden' : fmtNum(snap.likes)}</span></span>
            <span><span className="text-zinc-500">Comments</span> <span className="text-white font-semibold">{fmtNum(snap.comments)}</span></span>
            {snap.views != null && <span><span className="text-zinc-500">Views</span> <span className="text-white font-semibold">{fmtNum(snap.views)}</span></span>}
            {snap.mediaType && <span><span className="text-zinc-500">Type</span> <span className="text-white font-semibold">{MEDIA_LABEL[snap.mediaType] || snap.mediaType}</span></span>}
            {snap.takenAt && <span><span className="text-zinc-500">Posted</span> <span className="text-white font-semibold">{fmtDate(snap.takenAt)}</span></span>}
            {snap.owner && <span><span className="text-zinc-500">Owner</span> <span className="text-white font-semibold">@{String(snap.owner).replace(/^@/, '')}</span></span>}
            {permalink && (
              <a href={permalink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-400 hover:text-blue-300 underline break-all">
                Open on Instagram
              </a>
            )}
          </div>
        </div>
      )}

      <RetentionRow retention={post.retention} />
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

const PostReview = () => {
  const [posts, setPosts]                 = useState([])
  const [loadedFilter, setLoadedFilter]   = useState(null)   // which filter `posts` belongs to; loading is derived
  const [loadError, setLoadError]         = useState('')
  const [filter, setFilter]               = useState('pending')
  const [actioning, setActioning]         = useState({})
  const [errors, setErrors]               = useState({})
  const [rejectReasons, setRejectReasons] = useState({})
  const [expandedId, setExpandedId]       = useState(null)

  const loading = loadedFilter !== filter

  useEffect(() => {
    let cancelled = false
    getPosts({ status: filter === 'all' ? undefined : filter })
      .then((d) => { if (!cancelled) { setPosts(d.posts || []); setLoadError('') } })
      .catch((err) => { if (!cancelled) { setPosts([]); setLoadError(errMsg(err, 'Could not load posts.')) } })
      .finally(() => { if (!cancelled) setLoadedFilter(filter) })
    return () => { cancelled = true }
  }, [filter])

  // errors[id] = { kind: 'action' | 'verify', msg } so each block shows only its own failure
  const setError = (id, kind, msg) => setErrors((e) => ({ ...e, [id]: msg ? { kind, msg } : null }))
  const setBusy = (id, state) => setActioning((a) => ({ ...a, [id]: state }))

  const handleApprove = async (id) => {
    setBusy(id, 'approving')
    setError(id, 'action', '')
    try {
      const res = await approvePost(id)
      // Use the server's post: it carries approvedAt, autoApproved, cashbackReleased and retention.checkAt.
      setPosts((prev) => prev.map((p) => (p._id === id ? mergeVerified(p, res) : p)))
    } catch (err) {
      setError(id, 'action', errMsg(err, 'Could not approve this post.'))
    } finally {
      setBusy(id, null)
    }
  }

  const handleReject = async (id) => {
    const reason = rejectReasons[id] || 'Does not meet campaign requirements.'
    setBusy(id, 'rejecting')
    setError(id, 'action', '')
    try {
      const res = await rejectPost(id, reason)
      setPosts((prev) => prev.map((p) => (p._id === id ? { ...mergeVerified(p, res), status: 'rejected', rejectionReason: res?.post?.rejectionReason || reason } : p)))
    } catch (err) {
      setError(id, 'action', errMsg(err, 'Could not reject this post.'))
    } finally {
      setBusy(id, null)
    }
  }

  const handleReverify = async (id) => {
    setBusy(id, 'verifying')
    setError(id, 'verify', '')
    try {
      const res = await verifyInstagramPost(id)
      setPosts((prev) => prev.map((p) => (p._id === id ? mergeVerified(p, res) : p)))
    } catch (err) {
      setError(id, 'verify', errMsg(err, 'Could not verify this post.'))
    } finally {
      setBusy(id, null)
    }
  }

  return (
    <div className="page-root">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Post Review</h1>
      <p className="text-zinc-500 mb-6">Approve or reject creator post submissions</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
            {/* the list is already filtered server-side, so only the active tab has a meaningful count */}
            {f}{f === filter && f !== 'all' && !loading ? ` (${posts.length})` : ''}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/15 text-sm text-red-400">{loadError}</div>
      )}

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
          {posts.map((p) => {
            const sc       = STATUS_CONFIG[p.status] || { bg: 'bg-white/5', text: 'text-zinc-400', label: p.status || 'Unknown' }
            const expanded = expandedId === p._id
            const busy     = actioning[p._id]
            const rowError = errors[p._id]
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
                      {p.autoApproved && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25 text-[10px] font-bold">Auto-verified</span>
                      )}
                      {p.creatorId?.igVerified && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">IG ✓</span>
                      )}
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
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Creator</p>
                        <p className="text-sm text-zinc-300">{p.creatorId?.name || '—'}</p>
                        <p className="text-xs text-zinc-500">{p.creatorId?.instagramHandle ? `@${String(p.creatorId.instagramHandle).replace(/^@/, '')}` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Followers</p>
                        <p className="text-sm text-zinc-300">{fmtNum(p.creatorId?.followersCount ?? 0)}</p>
                        {isNum(p.creatorId?.igHealthScore) && <p className="text-xs text-zinc-500">Health score {Math.round(Number(p.creatorId.igHealthScore))}</p>}
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Post URL</p>
                        <a href={p.postUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline break-all">{p.postUrl}</a>
                      </div>
                    </div>

                    {p.campaignId && <CampaignRequirements campaign={p.campaignId} />}

                    <VerificationBlock
                      post={p}
                      reverifying={busy === 'verifying'}
                      error={rowError?.kind === 'verify' ? rowError.msg : ''}
                      onReverify={() => handleReverify(p._id)}
                    />

                    {p.status === 'rejected' && p.rejectionReason && (
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                        <p className="text-xs text-zinc-500 mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-400">{p.rejectionReason}</p>
                      </div>
                    )}

                    {rowError?.kind === 'action' && (
                      <p className="text-xs text-red-400">{rowError.msg}</p>
                    )}

                    {p.status === 'pending' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-zinc-500 font-medium block mb-1.5">Rejection reason (if rejecting)</label>
                          <input value={rejectReasons[p._id] || ''} onChange={(e) => setRejectReasons((r) => ({ ...r, [p._id]: e.target.value }))}
                            placeholder="e.g. Missing required hashtag..."
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none placeholder:text-zinc-600" />
                        </div>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => handleApprove(p._id)} disabled={!!busy}
                            className="px-5 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-40">
                            {busy === 'approving' ? '...' : '✓ Approve & Release Cashback'}
                          </button>
                          <button type="button" onClick={() => handleReject(p._id)} disabled={!!busy}
                            className="px-5 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-40">
                            {busy === 'rejecting' ? '...' : '✗ Reject'}
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
