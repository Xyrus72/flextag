import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useSocket } from '../context/SocketContext'
import { getNotifications, markNotificationsRead } from '../services/notifications'

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
  const [items, setItems]   = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen]     = useState(false)
  const { socket } = useSocket()
  const navigate = useNavigate()
  const ref = useRef(null)

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
    }
    socket.on('notification', onNotif)
    return () => socket.off('notification', onNotif)
  }, [socket])

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

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
      <button type="button" onClick={toggle} aria-label="Notifications" style={{
        position: 'relative', width: 40, height: 40, borderRadius: 12, cursor: 'pointer',
        background: 'rgba(var(--ink-rgb),0.05)', border: '1px solid rgba(var(--ink-rgb),0.1)',
        color: 'rgba(var(--ink-rgb),0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 48, width: 320, maxHeight: 420, overflowY: 'auto',
          background: 'var(--bg-2)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16,
          boxShadow: 'var(--shadow-lg)', zIndex: 60, padding: 8,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.4)', padding: '8px 10px 6px' }}>Notifications</p>
          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.4)', textAlign: 'center', padding: '24px 12px' }}>You&apos;re all caught up 🎉</p>
          ) : items.map((n, i) => (
            <button type="button" key={n._id || i} onClick={() => openItem(n)} style={{
              width: '100%', textAlign: 'left', display: 'flex', gap: 10, padding: '10px 10px', borderRadius: 12,
              background: n.read ? 'transparent' : 'rgba(124,58,237,0.08)', border: 'none', cursor: 'pointer', marginBottom: 2,
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--ink-rgb),0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(124,58,237,0.08)'}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon || '🔔'}</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{n.title}</span>
                {n.body && <span style={{ display: 'block', fontSize: 12, color: 'rgba(var(--ink-rgb),0.5)', lineHeight: 1.4, marginTop: 2 }}>{n.body}</span>}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),0.3)', flexShrink: 0 }}>{relative(n.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationBell
