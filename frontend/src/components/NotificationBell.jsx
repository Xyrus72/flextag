import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import { getNotifications, markNotificationsRead } from '../services/notifications'
import { NotificationIcon } from '../utils/notificationIcons'

const relative = (d) => {
  const t = new Date(d).getTime()
  if (Number.isNaN(t)) return ''
  const mins = Math.floor((Date.now() - t) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const NotificationBell = () => {
  const [items, setItems]     = useState([])
  const [unread, setUnread]   = useState(0)
  const [open, setOpen]       = useState(false)
  const [nudgeKey, setNudgeKey] = useState(0)   // bumps only on a LIVE socket event, never the poll
  const { socket } = useSocket()
  const navigate = useNavigate()
  const location = useLocation()
  const ref = useRef(null)
  // The centre lives under whichever dashboard you are in, so the link keeps
  // you inside your own shell instead of bouncing you to another role's.
  const centre = location.pathname.startsWith('/brand') ? '/brand/notifications'
    : location.pathname.startsWith('/admin') ? '/admin/notifications'
    : '/creator/notifications'

  const load = () => getNotifications()
    .then(d => { setItems(d.notifications || []); setUnread(d.unread || 0) })
    .catch(() => {})

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)   // fallback poll; socket handles the live case
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!socket) return undefined
    const onNotif = (payload) => {
      const n = payload?.notification
      if (!n) return
      setItems(prev => [n, ...prev].slice(0, 20))
      setUnread(u => u + 1)
      setNudgeKey(k => k + 1)
    }
    socket.on('notification', onNotif)
    return () => socket.off('notification', onNotif)
  }, [socket])

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      setItems(prev => prev.map(n => ({ ...n, read: true })))
      markNotificationsRead().catch(() => {})
    }
  }

  const openItem = (n) => { setOpen(false); if (n.link) navigate(n.link) }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={toggle} aria-label="Notifications" aria-haspopup="true" aria-expanded={open} style={{
        position: 'relative', width: 40, height: 40, borderRadius: 12, cursor: 'pointer',
        background: 'rgba(var(--ink-rgb),0.05)', border: '1px solid rgba(var(--ink-rgb),0.1)',
        color: 'rgba(var(--ink-rgb),0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span key={nudgeKey} className={nudgeKey > 0 ? 'bell-nudge' : ''} style={{ display: 'inline-flex' }}>
          <Bell size={18} strokeWidth={1.75} />
        </span>
        {unread > 0 && (
          <span key={`badge-${unread > 0}`} className="badge-pop tnum" style={{
            position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-pop" style={{
          position: 'absolute', right: 0, top: 48, width: 320, maxHeight: 420, overflowY: 'auto',
          background: 'var(--bg-2)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16,
          boxShadow: 'var(--shadow-lg)', zIndex: 60, padding: 8,
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', padding: '8px 10px 6px', margin: 0 }}>Notifications</p>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 12px' }}>
              <Bell size={22} strokeWidth={1.5} style={{ color: 'var(--text-dim)', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>You&apos;re all caught up</p>
            </div>
          ) : items.map((n, i) => (
            <button type="button" key={n._id || i} onClick={() => openItem(n)} className="notif-row" style={{
              width: '100%', textAlign: 'left', display: 'flex', gap: 10, padding: '10px 10px', borderRadius: 12,
              background: n.read ? 'transparent' : 'rgba(124,58,237,0.08)', border: 'none', cursor: 'pointer', marginBottom: 2,
            }}>
              <span style={{ flexShrink: 0, color: 'var(--violet-ink)', marginTop: 1 }}><NotificationIcon type={n.type} size={17} /></span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{n.title}</span>
                {n.body && <span style={{ display: 'block', fontSize: 12, color: 'rgba(var(--ink-rgb),0.5)', lineHeight: 1.4, marginTop: 2 }}>{n.body}</span>}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),0.3)', flexShrink: 0 }}>{relative(n.createdAt)}</span>
            </button>
          ))}
          <button type="button" onClick={() => { setOpen(false); navigate(centre) }} style={{
            width: '100%', marginTop: 4, padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.08)',
            color: 'var(--cyan-ink)', fontSize: 12, fontWeight: 600,
          }}>See all notifications</button>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
