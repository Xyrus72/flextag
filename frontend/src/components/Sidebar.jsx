import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

const ROLE_LABEL = { creator: 'Creator', brand: 'Brand partner', admin: 'Admin' }

const Sidebar = ({ links = [], mobile = false, open = false, onClose }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const handleLogout = () => { onClose?.(); logout(navigate) }
  const closeOnMobile = mobile ? onClose : undefined
  const roleLabel = ROLE_LABEL[user?.role] || user?.role

  return (
    <aside
      // A closed mobile drawer is only moved off-screen — inert keeps its
      // links, logout button and logo out of the tab/AT order while hidden.
      inert={mobile && !open}
      style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: mobile ? 50 : 40,
        width: 256,
        background: 'rgba(var(--nav-rgb),0.98)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(var(--ink-rgb),0.06)',
        display: 'flex', flexDirection: 'column',
        transform: mobile ? (open ? 'translateX(0)' : 'translateX(-110%)') : 'none',
        transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: mobile && open ? '0 0 60px rgba(0,0,0,0.6)' : 'none',
      }}>

      <div style={{ height: 2, background: 'var(--purple)', flexShrink: 0 }} />

      {/* Header */}
      <div style={{
        height: 72, display: 'flex', alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid rgba(var(--ink-rgb),0.05)',
        flexShrink: 0,
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={28} />
        </Link>
      </div>

      {/* User card */}
      {user && (
        <div style={{ margin: '12px 16px 0', padding: '12px 14px', borderRadius: 14, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{user.name}</p>
              <p style={{ fontSize: 11, color: 'var(--violet-ink)', marginTop: 2 }}>{roleLabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {links.map(link => (
          <NavLink
            key={link.path}
            to={link.path}
            onClick={closeOnMobile}
            end={link.path === '/creator' || link.path === '/brand' || link.path === '/admin'}
            className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--text)' : 'rgba(var(--ink-rgb),0.45)',
              background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
              border: isActive ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
              justifyContent: 'flex-start',
              position: 'relative',
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="side-active-rail"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.25, bounce: 0 }}
                    style={{ position: 'absolute', left: -10, top: '22%', bottom: '22%', width: 2.5, borderRadius: 3, background: 'var(--purple)' }}
                  />
                )}
                <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5, color: isActive ? 'var(--violet-ink)' : 'currentColor' }}>{link.icon}</span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.label}</span>
                {link.badge && (
                  <span className="tnum" style={{
                    padding: '2px 7px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                    background: 'rgba(124,58,237,0.2)', color: 'var(--violet-ink)',
                    border: '1px solid rgba(124,58,237,0.3)',
                  }}>{link.badge}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(var(--ink-rgb),0.05)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button onClick={handleLogout} className="sidebar-logout" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          width: '100%', borderRadius: 12, border: '1px solid transparent',
          background: 'transparent', cursor: 'pointer',
          color: 'rgba(239,68,68,0.6)', fontSize: 13,
          fontFamily: 'inherit',
          justifyContent: 'flex-start',
        }}>
          <LogOut size={15} strokeWidth={1.6} style={{ flexShrink: 0 }} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
