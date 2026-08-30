import { useState, useEffect, useCallback } from 'react'
import { ScrollText } from 'lucide-react'
import { getAuditLog } from '../../services/admin'

/**
 * The trail.
 *
 * Every privileged action — money sent, account blocked, dispute closed with a
 * refund, threshold changed — with a name and a timestamp against it. It exists
 * for the question that always eventually comes: "who did this, and when?"
 */

const GROUP_STYLE = {
  payout:   { color: 'var(--green-ink)', badge: 'success' },
  user:     { color: '#f87171', badge: 'error' },
  dispute:  { color: 'var(--cyan-ink)', badge: 'cyan' },
  cashback: { color: 'var(--violet-ink)', badge: 'info' },
  settings: { color: 'var(--amber-ink)', badge: 'warning' },
  brand:    { color: '#f9a8d4', badge: 'neutral' },
  product:  { color: 'var(--amber-ink)', badge: 'warning' },
  fraud:    { color: '#f87171', badge: 'error' },
  post:     { color: 'var(--violet-ink)', badge: 'info' },
}
const styleFor = (action) => GROUP_STYLE[String(action).split('.')[0]] || { color: 'rgba(var(--ink-rgb),0.6)', badge: 'neutral' }

const PAGE = 50

const AuditLog = () => {
  const [entries, setEntries] = useState([])
  const [total, setTotal]     = useState(0)
  const [actions, setActions] = useState([])
  const [filter, setFilter]   = useState('all')
  const [page, setPage]       = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => (
    getAuditLog({ action: filter, limit: PAGE, skip: page * PAGE })
      .then(d => {
        setEntries(d.entries || [])
        setTotal(d.total || 0)
        setActions(d.actions || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  ), [filter, page])

  useEffect(() => { load() }, [load])

  const change = (fn) => { setLoading(true); fn() }
  const groups = ['all', ...new Set(actions.map(a => a.split('.')[0]))]

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Accountability</span></div>
        <h1 className="page-title">Audit Trail</h1>
        <p className="page-subtitle">Who did what, to whom, and when — every privileged action on the platform.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22, alignItems: 'center' }}>
        {groups.map(g => (
          <button key={g} onClick={() => change(() => { setFilter(g); setPage(0) })} style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', border: 'none', textTransform: 'capitalize',
            background: filter === g ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.04)',
            color: filter === g ? '#fff' : 'rgba(var(--ink-rgb),0.45)',
          }}>{g}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)' }}>
          {total.toLocaleString()} entr{total === 1 ? 'y' : 'ies'}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : entries.length === 0 ? (
        <div className="empty-state"><ScrollText size={28} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 10 }} /><p>No entries yet.</p></div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map(e => {
              const st = styleFor(e.action)
              return (
                <div key={e._id} style={{
                  display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
                  padding: '14px 18px', borderRadius: 14,
                  background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.06)',
                }}>
                  <span className={`badge badge-${st.badge}`}>{e.action}</span>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{e.summary || '—'}</p>
                    <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.3)', margin: '3px 0 0' }}>
                      {e.actorName || 'system'}{e.actorRole ? ` (${e.actorRole})` : ''}
                      {e.targetName ? ` → ${e.targetName}` : ''}
                      {e.ip ? ` · ${e.ip}` : ''}
                    </p>
                  </div>

                  {e.amount ? (
                    <span className="tnum" style={{ fontSize: 14, fontWeight: 800, color: st.color, whiteSpace: 'nowrap' }}>৳{e.amount.toLocaleString()}</span>
                  ) : null}
                  <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.3)', whiteSpace: 'nowrap' }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>

          {total > PAGE && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, alignItems: 'center' }}>
              <button onClick={() => change(() => setPage(p => Math.max(0, p - 1)))} disabled={page === 0} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>← Newer</button>
              <span style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)' }}>Page {page + 1} of {Math.ceil(total / PAGE)}</span>
              <button onClick={() => change(() => setPage(p => p + 1))} disabled={(page + 1) * PAGE >= total} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>Older →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AuditLog
