import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getOrders } from '../../services/orders'
import { submitPost } from '../../services/posts'
import { verifyInstagramPost } from '../../services/instagram'

// instagram.com/p/…, /reel/…, /reels/…, /tv/… — optionally prefixed by a username segment
const IG_POST_RE = /instagram\.com\/(?:[a-z0-9._]+\/)?(?:p|reel|reels|tv)\/[A-Za-z0-9_-]{5,}/i
const IG_URL_HINT = 'Paste the link of the Instagram post or reel (instagram.com/p/… or /reel/…)'

const TONES = {
  success: { text: '#4ade80', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
  warning: { text: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  error:   { text: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' },
  info:    { text: '#a78bfa', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.3)' },
}

const STATUS_LABELS = {
  approved: { label: 'Approved',  cls: 'badge-success' },
  pending:  { label: 'In Review', cls: 'badge-warning' },
  rejected: { label: 'Rejected',  cls: 'badge-error' },
  flagged:  { label: 'Flagged',   cls: 'badge-error' },
}

const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1)

const statusOf = (post) =>
  STATUS_LABELS[post?.status] || (post?.status ? { label: capitalize(post.status), cls: 'badge-neutral' } : STATUS_LABELS.pending)

const fmtNum = (n) => (n === null || n === undefined ? null : Number(n).toLocaleString())

const fmtDate = (d) => {
  if (!d) return null
  const t = new Date(d)
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Translate submission + verification state into the headline/tone of the result card. */
const describeOutcome = ({ platform, verifying, verifyFailed, verification, autoApproved, pendingReason }) => {
  if (verifying) {
    return { tone: 'info', icon: 'spinner', title: 'Verifying your post on Instagram…', body: 'This usually takes about 10 seconds — hang tight.' }
  }
  if (platform !== 'instagram' || (!verification && !verifyFailed)) {
    return { tone: 'success', icon: 'check', title: 'Post Submitted!', body: 'Your post is now under review. Keep it live for the full retention period to earn your cashback.' }
  }
  if (verifyFailed) {
    return { tone: 'warning', icon: 'clock', title: 'Submitted for review', body: "Automatic verification isn't available right now; an admin will review it." }
  }
  switch (verification.status) {
    case 'passed':
      if (autoApproved) {
        return { tone: 'success', icon: 'check', title: 'Verified — cashback released 🎉', body: 'Every campaign check passed. Keep the post live for the full retention period.' }
      }
      return pendingReason === 'identity'
        ? { tone: 'warning', icon: 'check', title: 'Verified — awaiting final approval', body: 'Every campaign check passed; an admin will release this cashback. Verify ownership of your Instagram account on the Account Audit page to get instant cashback next time.' }
        : { tone: 'warning', icon: 'check', title: 'Verified — awaiting final approval', body: 'Every campaign check passed. An admin will release your cashback after a final look.' }
    case 'failed':
      return { tone: 'error', icon: 'cross', title: "We couldn't verify this post", body: "Some campaign requirements weren't met. Edit your post to add the missing hashtags or mention — an admin can still review it manually." }
    default:
      // Nothing retries automatically — be honest that a human will look at it.
      return { tone: 'warning', icon: 'clock', title: 'Submitted — pending manual review', body: "We couldn't check this post automatically; an admin will review it." }
  }
}

const OutcomeIcon = ({ kind, color }) => {
  if (kind === 'spinner') return <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
  if (kind === 'check') {
    return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  }
  if (kind === 'cross') {
    return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  }
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}

// pass → ✓ · required failure → ✗ · optional failure → – · could not evaluate (null) → ?
const checkState = (c) => (c.passed === true ? 'pass' : c.passed === false ? (c.required ? 'fail' : 'soft') : 'unknown')
const CHECK_GLYPH = {
  pass:    { mark: '✓', color: '#4ade80' },
  fail:    { mark: '✗', color: '#f87171' },
  soft:    { mark: '–', color: '#fbbf24' },
  unknown: { mark: '?', color: '#fbbf24' },
}

const ChecksList = ({ checks }) => (
  <ul className="text-left space-y-1.5 mb-4 list-none p-0 m-0">
    {checks.map(c => {
      const state = checkState(c)
      const glyph = CHECK_GLYPH[state]
      return (
        <li key={c.key} className="flex items-start gap-2 text-sm">
          <span style={{ color: glyph.color, fontWeight: 700, flexShrink: 0, width: 14, textAlign: 'center' }}>{glyph.mark}</span>
          <span className="min-w-0">
            <span className={state === 'fail' ? 'text-white font-semibold' : 'text-zinc-300'}>{c.label}</span>
            {state !== 'pass' && c.detail && <span className="block text-xs text-zinc-500">{c.detail}</span>}
          </span>
        </li>
      )
    })}
  </ul>
)

const SnapshotStats = ({ snapshot, source }) => {
  const stats = [
    // null likes mean "hidden by the owner" only when we read the post through a session;
    // the anonymous embed page simply may not expose the count.
    { label: 'Likes',    value: snapshot.likes === null ? (source === 'session' ? 'Hidden' : null) : fmtNum(snapshot.likes) },
    { label: 'Comments', value: fmtNum(snapshot.comments) },
    { label: 'Views',    value: fmtNum(snapshot.views) },
    { label: 'Posted',   value: fmtDate(snapshot.takenAt) },
    { label: 'Type',     value: snapshot.mediaType ? capitalize(snapshot.mediaType) : null },
  ].filter(s => s.value)
  if (!stats.length) return null
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {stats.map(s => (
        <div key={s.label} className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 m-0">{s.label}</p>
          <p className="text-sm font-semibold text-white m-0">{s.value}</p>
        </div>
      ))}
    </div>
  )
}

const Row = ({ label, last, children }) => (
  <div className={`flex justify-between items-center gap-3 text-sm ${last ? '' : 'mb-2'}`}>
    <span className="text-zinc-500 shrink-0">{label}</span>
    {children}
  </div>
)

const ResultCard = ({ platform, postUrl, post, verification, autoApproved, pendingReason, verifying, verifyFailed, onReset }) => {
  const outcome    = describeOutcome({ platform, verifying, verifyFailed, verification, autoApproved, pendingReason })
  const tone       = TONES[outcome.tone]
  const status     = statusOf(post)
  const checks     = verification?.checks || []
  const snapshot   = verification?.snapshot
  const showChecks = !verifying && checks.length > 0 && (verification.status === 'passed' || verification.status === 'failed')

  return (
    <div className="p-4 lg:p-8 min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md w-full">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: tone.bg, border: `2px solid ${tone.border}`, boxShadow: `0 0 40px ${tone.bg}` }}>
          <OutcomeIcon kind={outcome.icon} color={tone.text} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{outcome.title}</h2>
        <p className="text-zinc-400 mb-6">{outcome.body}</p>

        {showChecks && <ChecksList checks={checks} />}
        {!verifying && snapshot && <SnapshotStats snapshot={snapshot} source={verification?.source} />}

        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-left mb-6">
          <Row label="Status"><span className={`badge ${status.cls}`}>{status.label}</span></Row>
          <Row label="Platform"><span className="text-white capitalize">{platform}</span></Row>
          <Row label="Post URL" last>
            <a href={postUrl} target="_blank" rel="noreferrer" className="text-blue-400 text-xs truncate max-w-[200px]">{postUrl}</a>
          </Row>
        </div>
        {/* never disabled: a slow verification must not trap the creator on this screen */}
        <button onClick={onReset}
          className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-semibold hover:bg-white/10 transition-all">
          Submit Another
        </button>
      </div>
    </div>
  )
}

const PostSubmission = () => {
  const location = useLocation()
  const preState = location.state || {}

  const [postUrl, setPostUrl]               = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState(preState.orderId || '')
  const [platform, setPlatform]             = useState('instagram')
  const [orders, setOrders]                 = useState([])
  const [loadingOrders, setLoadingOrders]   = useState(true)
  const [submitting, setSubmitting]         = useState(false)
  const [submitted, setSubmitted]           = useState(false)
  const [error, setError]                   = useState('')

  // Verification state — { post, verification, autoApproved, verifyFailed }
  const [result, setResult]       = useState(null)
  const [verifying, setVerifying] = useState(false)

  // AI caption state
  const [aiPrompt, setAiPrompt]     = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading]   = useState(false)

  useEffect(() => {
    // Load delivered orders that haven't had post submitted
    getOrders({ status: 'delivered' })
      .then(d => setOrders(d.orders || []))
      .catch(console.error)
      .finally(() => setLoadingOrders(false))
  }, [])

  const selectedOrder = orders.find(o => o._id === selectedOrderId)

  const generateCaption = async () => {
    setAiLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    const product = selectedOrder?.product || 'this product'
    const brand   = selectedOrder?.brand   || 'our partner brand'
    const captions = {
      bangla:   `✨ ${product} দিয়ে আজকের লুক! ${brand} থেকে পারফেক্ট প্রোডাক্ট পেলাম 🔥\n\n#FlextagCreator #${brand.replace(/\s+/g, '')}`,
      english:  `✨ Obsessed with ${product} from @${brand.replace(/\s+/g, '').toLowerCase()}! Absolutely loving it. My new favorite! 🔥\n\n#FlextagCreator #${brand.replace(/\s+/g, '')}`,
      banglish: `✨ Guys! ${product} ta literally AMAZING 🤩 ${brand} er ei product try korte hobe! Full recommend!\n\n#FlextagCreator`,
    }
    setAiResponse(captions[aiPrompt] || captions.english)
    setAiLoading(false)
  }

  const handleSubmit = async () => {
    if (!postUrl || !selectedOrderId) return
    const url = postUrl.trim()
    if (platform === 'instagram' && !IG_POST_RE.test(url)) { setError(IG_URL_HINT); return }

    setSubmitting(true)
    setError('')
    let created
    try {
      const data = await submitPost({
        orderId:    selectedOrderId,
        campaignId: selectedOrder?.campaignId?._id || selectedOrder?.campaignId,
        postUrl:    url,
        platform,
      })
      created = data?.post || null
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    // This order now has a live submission — drop it from the picker so "Submit Another" can't re-pick it (409).
    setOrders(os => os.filter(o => o._id !== selectedOrderId))
    setResult({ post: created, verification: null, autoApproved: false, pendingReason: null, verifyFailed: false })
    setSubmitted(true)

    // Instagram only: verify right away. A verifier outage must never read as a failed submission.
    if (platform !== 'instagram' || !created?._id) return
    setVerifying(true)
    try {
      const v = await verifyInstagramPost(created._id)
      setResult({
        post: v?.post || created,
        verification: v?.verification || null,
        autoApproved: !!v?.autoApproved,
        pendingReason: v?.pendingReason || null,
        verifyFailed: false,
      })
    } catch {
      setResult(r => ({ ...r, verifyFailed: true }))
    } finally {
      setVerifying(false)
    }
  }

  const reset = () => {
    setSubmitted(false)
    setResult(null)
    setVerifying(false)
    setPostUrl('')
    setSelectedOrderId('')
    setError('')
  }

  if (submitted) {
    return (
      <ResultCard
        platform={platform}
        postUrl={postUrl.trim()}
        post={result?.post}
        verification={result?.verification}
        autoApproved={!!result?.autoApproved}
        pendingReason={result?.pendingReason || null}
        verifying={verifying}
        verifyFailed={!!result?.verifyFailed}
        onReset={reset}
      />
    )
  }

  return (
    <div className="page-root">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Submit Post</h1>
      <p className="text-zinc-500 mb-8">Submit your post URL for cashback verification</p>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Submission form */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Post Details</h2>
          {error && <p className="text-xs text-red-400 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{error}</p>}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Select Order</label>
              {loadingOrders ? (
                <div className="flex items-center gap-2 text-zinc-500 text-sm"><div className="w-4 h-4 rounded-full border border-zinc-500 border-t-transparent animate-spin" /><span>Loading orders...</span></div>
              ) : (
                <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none">
                  <option value="">Choose a delivered order...</option>
                  {orders.map(o => (
                    <option key={o._id} value={o._id}>
                      {o.product} — {o.brand} ({o.orderId})
                    </option>
                  ))}
                </select>
              )}
              {orders.length === 0 && !loadingOrders && (
                <p className="text-xs text-zinc-600 mt-1">No delivered orders found. Orders must be delivered before you can submit.</p>
              )}
            </div>

            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Platform</label>
              <div className="flex gap-2">
                {['instagram', 'tiktok', 'facebook'].map(p => (
                  <button key={p} onClick={() => { setPlatform(p); setError('') }} style={{
                    flex:1, padding:'10px', borderRadius:12, fontSize:13, fontWeight:600, cursor:'pointer',
                    fontFamily:'inherit', textTransform:'capitalize', transition:'all 0.2s', border:'none',
                    background: platform === p ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)',
                    color: platform === p ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                    outline: platform === p ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Post URL</label>
              <input value={postUrl} onChange={e => { setPostUrl(e.target.value); if (error === IG_URL_HINT) setError('') }}
                placeholder={platform === 'instagram' ? 'https://www.instagram.com/p/… or /reel/…' : 'https://www.instagram.com/p/...'}
                className="field-input" />
              <p className="text-xs text-zinc-600 mt-1">
                {platform === 'instagram'
                  ? 'Instagram posts are verified automatically — make sure the post is public and includes the campaign hashtags/mention.'
                  : 'Your post must be public and meet campaign requirements'}
              </p>
            </div>

            <button onClick={handleSubmit} disabled={!postUrl || !selectedOrderId || submitting}
              className="btn-primary" style={{ width:'100%', padding:14 }}>
              {submitting ? 'Submitting…' : 'Submit for Verification'}
            </button>
          </div>
        </div>

        {/* AI Caption Assistant */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-1">AI Creative Assistant</h2>
          <p className="text-xs text-zinc-500 mb-5">Generate captions & hashtag ideas</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Language</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'bangla', label: 'বাংলা' }, { id: 'english', label: 'English' }, { id: 'banglish', label: 'Banglish' }].map(l => (
                  <button key={l.id} onClick={() => setAiPrompt(l.id)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${aiPrompt === l.id ? 'bg-violet-500/15 border border-violet-500/30 text-violet-400' : 'bg-white/5 border border-white/5 text-zinc-500 hover:bg-white/10'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={generateCaption} disabled={!aiPrompt || aiLoading || !selectedOrderId}
              className="w-full py-3 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 font-semibold hover:bg-violet-500/25 transition-all disabled:opacity-30">
              {aiLoading ? '✨ Generating...' : '✨ Generate Caption'}
            </button>
            {!selectedOrderId && <p className="text-xs text-zinc-600">Select an order first to generate a relevant caption.</p>}
            {aiResponse && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Generated Caption</span>
                  <button onClick={() => navigator.clipboard?.writeText(aiResponse)} className="text-xs text-violet-400 hover:text-violet-300">Copy</button>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostSubmission
