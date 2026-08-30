import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getNotifications, markNotificationsRead } from '../../services/notifications'

/**
 * Everything the bell has ever told you.
 *
 * The dropdown holds twenty and forgets; this is the history — filterable,
 * paged, and every row still links to the thing it is about, so "your cashback
 * was released" three weeks ago is still one click from the wallet.
 */

const TYPE_META = {
  cashback:      { icon: '💰', label: 'Cashback' },
  payout:        { icon: '💸', label: 'Payouts' },
  order:         { icon: '📦', label: 'Orders' },
  dispute:       { icon: '⚖️', label: 'Disputes' },
  post_verified: { icon: '✅', label: 'Posts' },
  rating:        { icon: '⭐', label: 'Reviews' },
  referral:      { icon: '🎁', label: 'Referrals' },
  wallet:        { icon: '🏦', label: 'Wallet' },
  system:        { icon: '🔔', label: 'System' },
}

const PAGE = 25

const relative = (d) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString()
}

const Notifications = () => {
  const navigate = useNavigate()
  const [items, setItems]     = useState([])
  const [unread, setUnread]   = useState(0)
  const [total, setTotal]     = useState(0)
  const [types, setTypes]     = useState([])
  const [filter, setFilter]   = useState('all')
  const [page, setPage]       = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => (
    getNotifications({ type: filter, limit: PAGE, skip: page * PAGE })
      .then(d => {
        setItems(d.notifications || [])
        setUnread(d.unread || 0)
        setTotal(d.total || 0)
        setTypes(d.types || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  ), [filter, page])

  useEffect(() => { load() }, [load])

  const change = (fn) => { setLoading(true); fn() }

  const markAll = async () => {
    await markNotificationsRead().catch(() => {})
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  const open = async (n) => {
    if (!n.read) {
      markNotificationsRead(n._id).catch(() => {})
      setItems(prev => prev.map(x => (x._id === n._id ? { ...x, read: true } : x)))
      setUnread(u => Math.max(0, u - 1))
    }
    if (n.link) navigate(n.link)
  }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Activity</span></div>
        <h1 className="page-title">Notifications</h1>
        <p className="page-subtitle">
          {unread > 0 ? `${unread} unread · ` : ''}Everything that happened on your account.
          {' '}<Link to="/creator/profile" style={{ color: '#67e8f9' }}>Email preferences →</Link>
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22, alignItems: 'center' }}>
        {['all', ...types].map(t => (
          <button key={t} onClick={() => change(() => { setFilter(t); setPage(0) })} style={{
            padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', border: 'none',
            background: filter === t ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.04)',
            color: filter === t ? '#fff' : 'rgba(var(--ink-rgb),0.45)',
          }}>
            {t === 'all' ? 'All' : `${TYPE_META[t]?.icon || '🔔'} ${TYPE_META[t]?.label || t}`}
          </button>
        ))}
        {unread > 0 && (
          <button onClick={markAll} style={{
            marginLeft: 'auto', padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', background: 'rgba(var(--ink-rgb),0.05)', color: 'rgba(var(--ink-rgb),0.7)',
            border: '1px solid rgba(var(--ink-rgb),0.1)',
          }}>Mark all read</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state"><p style={{ fontSize: 28, marginBottom: 8 }}>🔔</p><p>Nothing here yet.</p></div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(n => (
              <button key={n._id} onClick={() => open(n)} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start', textAlign: 'left', width: '100%',
                padding: '16px 18px', borderRadius: 16, cursor: n.link ? 'pointer' : 'default', fontFamily: 'inherit',
                background: n.read ? 'rgba(var(--ink-rgb),0.02)' : 'rgba(124,58,237,0.07)',
                border: `1px solid ${n.read ? 'rgba(var(--ink-rgb),0.05)' : 'rgba(124,58,237,0.22)'}`,
              }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{n.icon || TYPE_META[n.type]?.icon || '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: n.read ? 500 : 700, color: 'var(--text)', margin: 0 }}>{n.title}</p>
                  {n.body && <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.5)', margin: '4px 0 0', lineHeight: 1.5 }}>{n.body}</p>}
                  <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.28)', margin: '6px 0 0' }}>{relative(n.createdAt)}</p>
                </div>
                {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', flexShrink: 0, marginTop: 6 }} />}
              </button>
            ))}
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

export default Notifications
