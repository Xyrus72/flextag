import { useState, useEffect, useCallback } from 'react'
import { getPayouts, sendPayout, rejectPayout, reconcilePayout, runPayoutQueue } from '../../services/wallet'

/**
 * Payout queue — the "money out" desk.
 *
 * With PAYOUT_PROVIDER=manual (the default) an admin sends the cash from their
 * own bKash/Nagad app and confirms it here; with an automatic provider the same
 * buttons trigger the real disbursement. The workflow is identical either way,
 * which is the point: switching providers later changes an env var, not this UI.
 */

const STATUS_STYLE = {
  queued:     { label: 'Queued',     color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  processing: { label: 'Processing', color: '#67e8f9', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.3)' },
  paid:       { label: 'Paid',       color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
  failed:     { label: 'Held',       color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' },
  rejected:   { label: 'Returned',   color: 'rgba(var(--ink-rgb),0.5)', bg: 'rgba(var(--ink-rgb),0.06)', border: 'rgba(var(--ink-rgb),0.12)' },
}

const METHOD_LABEL = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', bank: 'Bank' }

const Payouts = () => {
  const [rows, setRows]       = useState([])
  const [summary, setSummary] = useState(null)
  const [config, setConfig]   = useState({ provider: 'manual', automatic: false, autoSend: false, fellBack: false })
  const [filter, setFilter]   = useState('queued')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId]   = useState(null)
  const [banner, setBanner]   = useState(null)   // { kind: 'ok' | 'err', text }

  // `loading` is flipped on by whoever *asks* for data (the filter buttons, the
  // initial state) rather than inside the effect — every setState here happens
  // in a promise callback, which keeps the render pass clean.
  const load = useCallback((status = filter) => (
    getPayouts({ status })
      .then(d => {
        setRows(d.payouts || [])
        setSummary(d.summary || null)
        setConfig({ provider: d.provider, automatic: d.automatic, autoSend: d.autoSend, fellBack: d.fellBack, requested: d.requested })
      })
      .catch(err => setBanner({ kind: 'err', text: err.response?.data?.message || 'Could not load the payout queue.' }))
      .finally(() => setLoading(false))
  ), [filter])

  useEffect(() => { load(filter) }, [filter, load])

  const changeFilter = (f) => { setLoading(true); setFilter(f) }

  const act = async (id, fn, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusyId(id); setBanner(null)
    try {
      const d = await fn()
      setBanner({ kind: 'ok', text: d.message || 'Done.' })
      await load(filter)
    } catch (err) {
      setBanner({ kind: 'err', text: err.response?.data?.message || 'That did not go through.' })
    } finally {
      setBusyId(null)
    }
  }

  const handleSend = (row) => act(
    row._id,
    () => sendPayout(row._id),
    config.automatic
      ? `Send ৳${row.amount?.toLocaleString()} to ${row.payoutAccount || row.bkashNumber} via ${config.provider}?`
      : `Confirm you have ALREADY sent ৳${row.amount?.toLocaleString()} to ${row.payoutAccount || row.bkashNumber} (${METHOD_LABEL[row.payoutMethod] || 'bKash'}).\n\nThis marks the payout complete and deducts it from the creator's balance.`,
  )

  const handleReject = (row) => {
    const reason = window.prompt(`Return ৳${row.amount?.toLocaleString()} to ${row.userId?.name || 'the creator'}'s balance. Reason (they will see it):`, '')
    if (reason === null) return
    return act(row._id, () => rejectPayout(row._id, reason))
  }

  const handleReconcile = (row) => {
    const reference = window.prompt('Provider reference / trxID for this settled payout (optional):', row.payoutRef || '')
    if (reference === null) return
    return act(row._id, () => reconcilePayout(row._id, reference))
  }

  const handleRunAll = () => act('all', () => runPayoutQueue({ limit: 25 }),
    `Process the whole queue (${summary?.queued?.count || 0} request${(summary?.queued?.count || 0) === 1 ? '' : 's'}, ৳${(summary?.queued?.amount || 0).toLocaleString()})?`)

  const copy = (text) => navigator.clipboard?.writeText(text)

  const cards = [
    { key: 'queued',     label: 'Waiting',    grad: 'linear-gradient(135deg,#f59e0b22,#fbbf2422)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24' },
    { key: 'processing', label: 'In flight',  grad: 'linear-gradient(135deg,#06b6d422,#67e8f922)', border: 'rgba(6,182,212,0.3)',  color: '#67e8f9' },
    { key: 'paid',       label: 'Paid out',   grad: 'linear-gradient(135deg,#22c55e22,#4ade8022)', border: 'rgba(34,197,94,0.3)',  color: '#4ade80' },
    { key: 'failed',     label: 'Held',       grad: 'linear-gradient(135deg,#ef444422,#f8717122)', border: 'rgba(239,68,68,0.3)',  color: '#f87171' },
  ]

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Money Out</span></div>
        <h1 className="page-title">Creator Payouts</h1>
        <p className="page-subtitle">
          Every withdrawal request, in one queue. Speed of payout is what creators judge FlexTag on.
        </p>
      </div>

      {/* Provider status */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', borderRadius: 14,
        background: config.automatic ? 'rgba(34,197,94,0.06)' : 'rgba(124,58,237,0.06)',
        border: `1px solid ${config.automatic ? 'rgba(34,197,94,0.2)' : 'rgba(124,58,237,0.2)'}`,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: config.automatic ? '#4ade80' : '#a78bfa' }}>
          {config.automatic ? `Automatic — ${config.provider}` : 'Manual settlement'}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.45)' }}>
          {config.automatic
            ? `Sending happens through the ${config.provider} API${config.autoSend ? ' and runs on a schedule.' : ' when you press Send.'}`
            : 'Send the money from your bKash/Nagad app, then press “Mark paid” — the ledger, notification and receipt are handled here.'}
        </span>
        {config.fellBack && (
          <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>
            PAYOUT_PROVIDER={config.requested} is not fully configured — falling back to manual
          </span>
        )}
      </div>

      {banner && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 16, fontSize: 13,
          background: banner.kind === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${banner.kind === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: banner.kind === 'ok' ? '#4ade80' : '#f87171',
        }}>{banner.text}</div>
      )}

      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.key} style={{ padding: 20, borderRadius: 18, background: c.grad, border: `1px solid ${c.border}` }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.4)', marginBottom: 8 }}>{c.label}</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: c.color, letterSpacing: '-0.03em' }}>
              ৳{(summary?.[c.key]?.amount || 0).toLocaleString()}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.3)', marginTop: 4 }}>{summary?.[c.key]?.count || 0} request{(summary?.[c.key]?.count || 0) === 1 ? '' : 's'}</p>
          </div>
        ))}
      </div>

      {/* Filters + batch action */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        {['queued', 'processing', 'paid', 'failed', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => changeFilter(f)} style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            textTransform: 'capitalize', border: 'none',
            background: filter === f ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(var(--ink-rgb),0.04)',
            color: filter === f ? '#fff' : 'rgba(var(--ink-rgb),0.45)',
          }}>{f}</button>
        ))}
        {(summary?.queued?.count || 0) > 0 && (
          <button onClick={handleRunAll} disabled={busyId === 'all'} className="btn-primary"
            style={{ marginLeft: 'auto', padding: '9px 20px', fontSize: 12 }}>
            {busyId === 'all' ? 'Working…' : `Pay everyone (${summary.queued.count})`}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="empty-state"><p style={{ fontSize: 28, marginBottom: 8 }}>💸</p><p>No {filter === 'all' ? '' : filter} payouts</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map(r => {
            const st = STATUS_STYLE[r.payoutStatus] || STATUS_STYLE.queued
            const account = r.payoutAccount || r.bkashNumber || '—'
            const underwater = r.balance !== null && r.balance !== undefined && r.amount > r.balance
            const pending = ['queued', 'failed'].includes(r.payoutStatus)
            return (
              <div key={r._id} style={{
                padding: 20, borderRadius: 18, background: 'rgba(var(--ink-rgb),0.03)',
                border: `1px solid ${underwater && pending ? 'rgba(239,68,68,0.35)' : 'rgba(var(--ink-rgb),0.07)'}`,
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{r.userId?.name || 'Creator'}</p>
                      {r.userId?.igVerified && <span className="badge badge-success" style={{ fontSize: 9 }}>IG verified</span>}
                      {r.userId?.tier && <span className="badge badge-neutral" style={{ fontSize: 9, textTransform: 'capitalize' }}>{r.userId.tier}</span>}
                      <span style={{
                        padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                        color: st.color, background: st.bg, border: `1px solid ${st.border}`,
                      }}>{st.label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)', margin: '0 0 10px' }}>
                      {r.userId?.email} {r.userId?.instagramHandle ? `· @${String(r.userId.instagramHandle).replace(/^@/, '')}` : ''} · requested {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13 }}>
                      <div>
                        <span style={{ color: 'rgba(var(--ink-rgb),0.35)' }}>Send to: </span>
                        <button onClick={() => copy(account)} title="Copy number" style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'monospace',
                          fontSize: 13, fontWeight: 700, color: '#67e8f9',
                        }}>{account} ⧉</button>
                        <span style={{ color: 'rgba(var(--ink-rgb),0.35)', marginLeft: 6 }}>({METHOD_LABEL[r.payoutMethod] || 'bKash'})</span>
                      </div>
                      {r.balance !== null && r.balance !== undefined && (
                        <div>
                          <span style={{ color: 'rgba(var(--ink-rgb),0.35)' }}>Balance now: </span>
                          <span style={{ color: underwater ? '#f87171' : 'rgba(var(--ink-rgb),0.6)', fontWeight: 600 }}>৳{r.balance.toLocaleString()}</span>
                        </div>
                      )}
                      {r.payoutRef && (
                        <div><span style={{ color: 'rgba(var(--ink-rgb),0.35)' }}>Ref: </span><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(var(--ink-rgb),0.6)' }}>{r.payoutRef}</span></div>
                      )}
                    </div>
                    {underwater && pending && (
                      <p style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>
                        ⚠ Their balance has dropped below this request (a clawback landed). Sending will be refused — return it instead.
                      </p>
                    )}
                    {r.payoutError && (
                      <p style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>{r.payoutError}</p>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 140 }}>
                    <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>৳{r.amount?.toLocaleString()}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                      {pending && (
                        <>
                          <button onClick={() => handleSend(r)} disabled={busyId === r._id} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                            {busyId === r._id ? 'Working…' : config.automatic ? 'Send now' : 'Mark paid'}
                          </button>
                          <button onClick={() => handleReject(r)} disabled={busyId === r._id} style={{
                            padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                            background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)',
                          }}>Return to wallet</button>
                        </>
                      )}
                      {r.payoutStatus === 'processing' && (
                        <button onClick={() => handleReconcile(r)} disabled={busyId === r._id} style={{
                          padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                          background: 'rgba(6,182,212,0.1)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.25)',
                        }}>Confirm settled</button>
                      )}
                      {r.payoutSentAt && (
                        <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.3)', margin: 0 }}>{new Date(r.payoutSentAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Payouts
