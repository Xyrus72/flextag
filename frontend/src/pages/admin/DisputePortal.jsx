import { useState, useEffect, useCallback } from 'react'
import { getDisputes, replyToDispute, investigateDispute, resolveDispute } from '../../services/disputes'

/**
 * Dispute portal — the referee's desk.
 *
 * An admin sees the whole creator/brand thread, can weigh in, and closes it
 * with an outcome that MOVES MONEY where it should: a refund writes a real
 * wallet transaction, capped at what the creator actually paid. "Resolved" with
 * no ledger row is how support queues quietly lose people money.
 */

const STATUS_STYLE = {
  open:           { label: 'Open',           color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  awaiting_brand: { label: 'Awaiting brand', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  investigating:  { label: 'Under review',   color: '#67e8f9', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.3)' },
  resolved:       { label: 'Resolved',       color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
}

const OUTCOMES = [
  { value: 'refund',            label: 'Refund the creator' },
  { value: 'cashback_released', label: 'Release the cashback' },
  { value: 'replacement',       label: 'Brand sends a replacement' },
  { value: 'rejected',          label: 'Reject the claim' },
  { value: 'other',             label: 'Other' },
]

const DisputePortal = () => {
  const [disputes, setDisputes] = useState([])
  const [filter, setFilter]     = useState('all')
  const [loading, setLoading]   = useState(true)
  const [openId, setOpenId]     = useState(null)
  const [busy, setBusy]         = useState(null)
  const [banner, setBanner]     = useState(null)
  const [reply, setReply]       = useState({})
  const [form, setForm]         = useState({})   // id -> { resolution, resolutionType, refundAmount }

  const load = useCallback(() => (
    getDisputes({ status: 'all' })
      .then(d => setDisputes(d.disputes || []))
      .catch(err => setBanner({ kind: 'err', text: err.response?.data?.message || 'Could not load disputes.' }))
      .finally(() => setLoading(false))
  ), [])

  useEffect(() => { load() }, [load])

  const act = async (id, fn) => {
    setBusy(id); setBanner(null)
    try {
      const d = await fn()
      setBanner({ kind: 'ok', text: d.message || 'Done.' })
      await load()
    } catch (err) {
      setBanner({ kind: 'err', text: err.response?.data?.message || 'That did not go through.' })
    } finally { setBusy(null) }
  }

  // Defaults come from the dispute itself (refund pre-filled with what the
  // creator paid); edits are merged on top so a half-filled form never loses a field.
  const formFor = (d) => ({
    resolution: '',
    resolutionType: 'refund',
    refundAmount: String(d.orderId?.total || d.amount || 0),
    ...(form[d._id] || {}),
  })
  const setFormFor = (id, patch) => setForm(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))

  const handleResolve = (d) => {
    const f = formFor(d)
    if (!f.resolution.trim()) { setBanner({ kind: 'err', text: 'Write what you decided — both sides will read it.' }); return }
    return act(d._id, () => resolveDispute(d._id, {
      resolution: f.resolution.trim(),
      resolutionType: f.resolutionType,
      refundAmount: f.resolutionType === 'refund' ? Number(f.refundAmount) : 0,
    }))
  }

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter)
  const counts = (s) => (s === 'all' ? disputes.length : disputes.filter(d => d.status === s).length)

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Trust &amp; Safety</span></div>
        <h1 className="page-title">Dispute Resolution</h1>
        <p className="page-subtitle">Read the whole thread, then close it with an outcome that actually moves the money.</p>
      </div>

      {banner && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 16, fontSize: 13,
          background: banner.kind === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${banner.kind === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: banner.kind === 'ok' ? '#4ade80' : '#f87171',
        }}>{banner.text}</div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {['all', 'awaiting_brand', 'investigating', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
            background: filter === f ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.04)',
            color: filter === f ? '#fff' : 'rgba(var(--ink-rgb),0.45)',
          }}>
            {(STATUS_STYLE[f]?.label || 'All')} ({counts(f)})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p style={{ fontSize: 28, marginBottom: 8 }}>⚖️</p><p>No {filter === 'all' ? '' : STATUS_STYLE[filter]?.label.toLowerCase()} disputes</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(d => {
            const st = STATUS_STYLE[d.status] || STATUS_STYLE.open
            const open = openId === d._id
            const f = formFor(d)
            return (
              <div key={d._id} style={{ borderRadius: 14, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)', overflow: 'hidden' }}>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {d.orderId?.product || 'Order'} · {d.orderId?.orderId || ''}
                    </p>
                    <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)' }}>{new Date(d.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)', margin: '0 0 10px' }}>
                    {d.creatorId?.name || 'Creator'} vs {d.brandId?.companyName || d.brandId?.name || 'Brand'} · ৳{d.amount?.toLocaleString()} · {String(d.type || '').replace(/_/g, ' ')}
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', margin: 0 }}>{d.description}</p>

                  {d.status === 'resolved' ? (
                    <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: '#4ade80', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {String(d.resolutionType || 'other').replace(/_/g, ' ')}{d.refundAmount > 0 ? ` · ৳${d.refundAmount.toLocaleString()} refunded` : ''}
                      </p>
                      <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', margin: 0 }}>{d.resolution}</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                      <button onClick={() => setOpenId(open ? null : d._id)} style={{
                        padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                        background: 'rgba(var(--ink-rgb),0.05)', color: 'rgba(var(--ink-rgb),0.7)', border: '1px solid rgba(var(--ink-rgb),0.1)',
                      }}>{open ? 'Close' : `Open thread (${d.messages?.length || 0})`}</button>
                      {d.status !== 'investigating' && (
                        <button onClick={() => act(d._id, () => investigateDispute(d._id))} disabled={busy === d._id} style={{
                          padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                          background: 'rgba(6,182,212,0.1)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.25)',
                        }}>Take it on</button>
                      )}
                    </div>
                  )}
                </div>

                {open && d.status !== 'resolved' && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(var(--ink-rgb),0.06)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 0' }}>
                      {(d.messages || []).map(m => (
                        <div key={m._id} style={{
                          alignSelf: m.role === 'creator' ? 'flex-start' : m.role === 'brand' ? 'flex-end' : 'center',
                          maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
                          background: m.role === 'admin' ? 'rgba(6,182,212,0.12)' : 'rgba(var(--ink-rgb),0.04)',
                          border: `1px solid ${m.role === 'admin' ? 'rgba(6,182,212,0.25)' : 'rgba(var(--ink-rgb),0.07)'}`,
                        }}>
                          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(var(--ink-rgb),0.4)', margin: '0 0 4px' }}>
                            {m.role === 'admin' ? 'FlexTag' : (m.from?.companyName || m.from?.name || m.role)}
                          </p>
                          <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{m.text}</p>
                          <p style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),0.25)', margin: '6px 0 0' }}>{new Date(m.at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>

                    {(d.evidence || []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        {d.evidence.map((url, i) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#67e8f9' }}>Evidence {i + 1} ↗</a>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                      <input value={reply[d._id] || ''} onChange={e => setReply(prev => ({ ...prev, [d._id]: e.target.value }))}
                        className="field-input" placeholder="Ask a question in the thread…" style={{ flex: 1 }} />
                      <button onClick={() => act(d._id, async () => {
                        const res = await replyToDispute(d._id, (reply[d._id] || '').trim())
                        setReply(prev => ({ ...prev, [d._id]: '' }))
                        return res
                      })} disabled={busy === d._id || !(reply[d._id] || '').trim()} className="btn-primary" style={{ padding: '10px 20px', fontSize: 12 }}>Send</button>
                    </div>

                    {/* Resolution */}
                    <div style={{ padding: 18, borderRadius: 14, background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.06)' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>Close this dispute</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label className="field-label">Outcome</label>
                          <select value={f.resolutionType} onChange={e => setFormFor(d._id, { resolutionType: e.target.value })} className="field-select">
                            {OUTCOMES.map(o => <option key={o.value} value={o.value} style={{ background: 'var(--bg-2)' }}>{o.label}</option>)}
                          </select>
                        </div>
                        {f.resolutionType === 'refund' && (
                          <div>
                            <label className="field-label">Refund amount (max ৳{(d.orderId?.total || d.amount || 0).toLocaleString()})</label>
                            <input type="number" value={f.refundAmount} onChange={e => setFormFor(d._id, { refundAmount: e.target.value })}
                              max={d.orderId?.total || d.amount || 0} min={0} className="field-input" />
                          </div>
                        )}
                      </div>
                      <textarea value={f.resolution} onChange={e => setFormFor(d._id, { resolution: e.target.value })}
                        rows={3} className="field-input" placeholder="What you decided and why — both sides see this." />
                      <button onClick={() => handleResolve(d)} disabled={busy === d._id} className="btn-primary" style={{ marginTop: 12, padding: '10px 22px', fontSize: 13 }}>
                        {busy === d._id ? 'Closing…' : f.resolutionType === 'refund' ? `Refund ৳${Number(f.refundAmount || 0).toLocaleString()} and close` : 'Resolve dispute'}
                      </button>
                    </div>
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
