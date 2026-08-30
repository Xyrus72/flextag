import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Scale } from 'lucide-react'
import { getDisputes, fileDispute, replyToDispute } from '../../services/disputes'
import { getOrders } from '../../services/orders'
import { useAuth } from '../../context/AuthContext'

/**
 * The dispute desk, shared by creators and brands.
 *
 * Same thread, two vantage points: a creator files against one of their own
 * orders and chases it; a brand answers. An admin refereeing from
 * /admin/disputes sees the identical conversation, so nobody is arguing from a
 * different copy of the story.
 */

const STATUS_STYLE = {
  open:           { label: 'Open',            color: 'var(--amber-ink)', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  awaiting_brand: { label: 'Awaiting brand',  color: 'var(--amber-ink)', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  investigating:  { label: 'Under review',    color: 'var(--cyan-ink)', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.3)' },
  resolved:       { label: 'Resolved',        color: 'var(--green-ink)', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
}

const Disputes = () => {
  const { user } = useAuth()
  const location = useLocation()
  const isCreator = user?.role === 'creator'

  const [disputes, setDisputes] = useState([])
  const [types, setTypes]       = useState([])
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [openId, setOpenId]     = useState(null)
  const [reply, setReply]       = useState({})
  const [busy, setBusy]         = useState(null)
  const [banner, setBanner]     = useState(null)

  // New-dispute form
  const [showForm, setShowForm] = useState(!!location.state?.orderId)
  const [form, setForm] = useState({
    orderId: location.state?.orderId || '',
    type: 'product_damaged',
    description: '',
    evidence: '',
  })

  const load = useCallback(() => (
    getDisputes({ status: 'all' })
      .then(d => { setDisputes(d.disputes || []); setTypes(d.types || []) })
      .catch(err => setBanner({ kind: 'err', text: err.response?.data?.message || 'Could not load disputes.' }))
      .finally(() => setLoading(false))
  ), [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!isCreator) return undefined
    let alive = true
    getOrders({ status: 'all' })
      .then(d => { if (alive) setOrders(d.orders || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [isCreator])

  const submitDispute = async (e) => {
    e.preventDefault()
    if (!form.orderId || !form.description.trim()) return
    setBusy('new'); setBanner(null)
    try {
      const d = await fileDispute({
        orderId: form.orderId,
        type: form.type,
        description: form.description.trim(),
        evidence: form.evidence.split(/[\s,]+/).filter(Boolean),
      })
      setBanner({ kind: 'ok', text: d.message || 'Dispute filed.' })
      setShowForm(false)
      setForm({ orderId: '', type: 'product_damaged', description: '', evidence: '' })
      await load()
    } catch (err) {
      setBanner({ kind: 'err', text: err.response?.data?.message || 'Could not file the dispute.' })
    } finally { setBusy(null) }
  }

  const sendReply = async (id) => {
    const text = (reply[id] || '').trim()
    if (!text) return
    setBusy(id)
    try {
      await replyToDispute(id, text)
      setReply(prev => ({ ...prev, [id]: '' }))
      await load()
    } catch (err) {
      setBanner({ kind: 'err', text: err.response?.data?.message || 'Could not send the reply.' })
    } finally { setBusy(null) }
  }

  const eligibleOrders = orders.filter(o => !['cancelled'].includes(o.status))

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Support</span></div>
        <h1 className="page-title">Disputes</h1>
        <p className="page-subtitle">
          {isCreator
            ? 'Something wrong with an order or a rejected post? Raise it here — the brand replies in the same thread and an admin decides if you disagree.'
            : 'Creator complaints about your orders. Answer here; an admin steps in only if the two of you cannot settle it.'}
        </p>
      </div>

      {banner && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 16, fontSize: 13,
          background: banner.kind === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${banner.kind === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: banner.kind === 'ok' ? 'var(--green-ink)' : '#f87171',
        }}>{banner.text}</div>
      )}

      {isCreator && (
        <div style={{ marginBottom: 24 }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="btn-primary" style={{ padding: '10px 22px', fontSize: 13 }}>
              File a dispute
            </button>
          ) : (
            <form onSubmit={submitDispute} style={{
              padding: 22, borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>What went wrong?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
                <div>
                  <label className="field-label">Order</label>
                  <select value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} className="field-select" required>
                    <option value="" style={{ background: 'var(--bg-2)' }}>Select an order…</option>
                    {eligibleOrders.map(o => (
                      <option key={o._id} value={o._id} style={{ background: 'var(--bg-2)' }}>
                        {o.product} · {o.orderId} · ৳{o.total?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Problem</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="field-select">
                    {(types.length ? types : [{ value: 'other', label: 'Other' }]).map(t => (
                      <option key={t.value} value={t.value} style={{ background: 'var(--bg-2)' }}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">What happened</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4} className="field-input" required
                  placeholder="Describe it the way you would to a person — what you ordered, what arrived, what you want done." />
              </div>
              <div>
                <label className="field-label">Evidence links (optional)</label>
                <input value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })}
                  className="field-input" placeholder="Paste photo / screenshot URLs, separated by spaces" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn-primary" disabled={busy === 'new' || !form.orderId || !form.description.trim()} style={{ padding: '10px 22px', fontSize: 13 }}>
                  {busy === 'new' ? 'Filing…' : 'Submit dispute'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{
                  padding: '10px 22px', fontSize: 13, fontWeight: 700, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                  background: 'rgba(var(--ink-rgb),0.05)', color: 'rgba(var(--ink-rgb),0.6)', border: '1px solid rgba(var(--ink-rgb),0.1)',
                }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : disputes.length === 0 ? (
        <div className="empty-state">
          <Scale size={28} strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: 10 }} />
          <p>No disputes{isCreator ? ' — that is the way it should be.' : '. Your creators are happy.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {disputes.map(d => {
            const st = STATUS_STYLE[d.status] || STATUS_STYLE.open
            const open = openId === d._id
            const counterpart = isCreator ? (d.brandId?.companyName || d.brandId?.name || 'Brand') : (d.creatorId?.name || 'Creator')
            return (
              <div key={d._id} style={{ borderRadius: 14, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)', overflow: 'hidden' }}>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {d.orderId?.product || 'Order'} · {d.orderId?.orderId || ''}
                    </p>
                    <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                      {st.label}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)' }}>
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)', margin: '0 0 10px' }}>
                    {isCreator ? 'Against' : 'From'} {counterpart} · ৳{d.amount?.toLocaleString()} at stake
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', margin: 0 }}>{d.description}</p>

                  {d.status === 'resolved' && (
                    <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--green-ink)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Resolved{d.refundAmount > 0 ? ` · ৳${d.refundAmount.toLocaleString()} refunded` : ''}
                      </p>
                      <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', margin: 0 }}>{d.resolution}</p>
                    </div>
                  )}

                  <button onClick={() => setOpenId(open ? null : d._id)} style={{
                    marginTop: 14, padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    background: 'rgba(var(--ink-rgb),0.05)', color: 'rgba(var(--ink-rgb),0.7)', border: '1px solid rgba(var(--ink-rgb),0.1)',
                  }}>
                    {open ? 'Hide conversation' : `Conversation (${d.messages?.length || 0})`}
                  </button>
                </div>

                {open && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(var(--ink-rgb),0.06)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 0' }}>
                      {(d.messages || []).map(m => {
                        const mine = String(m.from?._id || m.from) === String(user?._id)
                        return (
                          <div key={m._id} style={{
                            alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%',
                            padding: '10px 14px', borderRadius: 14,
                            background: mine ? 'rgba(124,58,237,0.15)' : m.role === 'admin' ? 'rgba(6,182,212,0.12)' : 'rgba(var(--ink-rgb),0.04)',
                            border: `1px solid ${mine ? 'rgba(124,58,237,0.25)' : m.role === 'admin' ? 'rgba(6,182,212,0.25)' : 'rgba(var(--ink-rgb),0.07)'}`,
                          }}>
                            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(var(--ink-rgb),0.4)', margin: '0 0 4px' }}>
                              {m.role === 'admin' ? 'FlexTag' : (m.from?.companyName || m.from?.name || m.role)}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{m.text}</p>
                            <p style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),0.25)', margin: '6px 0 0' }}>{new Date(m.at).toLocaleString()}</p>
                          </div>
                        )
                      })}
                    </div>

                    {(d.evidence || []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        {d.evidence.map((url, i) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--cyan-ink)' }}>Evidence {i + 1} ↗</a>
                        ))}
                      </div>
                    )}

                    {d.status !== 'resolved' && (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input value={reply[d._id] || ''} onChange={e => setReply(prev => ({ ...prev, [d._id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') sendReply(d._id) }}
                          className="field-input" placeholder="Write a reply…" style={{ flex: 1 }} />
                        <button onClick={() => sendReply(d._id)} disabled={busy === d._id || !(reply[d._id] || '').trim()}
                          className="btn-primary" style={{ padding: '10px 20px', fontSize: 12 }}>
                          {busy === d._id ? 'Sending…' : 'Send'}
                        </button>
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

export default Disputes
