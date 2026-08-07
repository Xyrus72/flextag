import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Sidebar = ({ links = [] }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => logout(navigate)

  const roleColor = {
    creator: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
    brand:   'linear-gradient(135deg,#06b6d4,#ec4899)',
    admin:   'linear-gradient(135deg,#ec4899,#7c3aed)',
  }[user?.role] || 'linear-gradient(135deg,#7c3aed,#06b6d4)'

  const roleLabel = {
    creator: 'Creator',
    brand:   'Brand Partner',
    admin:   'Admin',
  }[user?.role] || user?.role

  return (
    <>
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 40,
        width: 256,
        background: 'rgba(5,8,22,0.98)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Purple top line */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          height: 72, display: 'flex', alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/products/flextag-logo.png" alt="FlexTag" style={{ height: 42, width: 'auto', objectFit: 'contain' }} />
          </Link>
        </div>

        {/* User card */}
        {user && (
          <div style={{ margin: '12px 16px 0', padding: '12px 14px', borderRadius: 14, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                {user.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                <p style={{ fontSize: 9, color: 'rgba(167,139,250,0.7)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>{roleLabel}</p>
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
              end={link.path === '/creator' || link.path === '/brand' || link.path === '/admin'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
                transition: 'all 0.15s ease',
                justifyContent: 'flex-start',
                position: 'relative',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.style.background.includes('rgba(124')) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.style.background.includes('rgba(124')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
                }
              }}
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  {isActive && (
                    <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: 'linear-gradient(180deg, #7c3aed, #06b6d4)' }} />
                  )}
                  <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5, color: isActive ? '#a78bfa' : 'currentColor' }}>{link.icon}</span>
                  <>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.label}</span>
                    {link.badge && (
                      <span style={{
                        padding: '2px 7px', borderRadius: 100, fontSize: 9, fontWeight: 800,
                        background: 'rgba(124,58,237,0.2)', color: '#a78bfa',
                        border: '1px solid rgba(124,58,237,0.3)',
                      }}>{link.badge}</span>
                    )}
                  </>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            width: '100%', borderRadius: 12, border: '1px solid transparent',
            background: 'transparent', cursor: 'pointer',
            color: 'rgba(239,68,68,0.6)', fontSize: 13,
            fontFamily: 'inherit', transition: 'all 0.15s ease',
            justifyContent: 'flex-start',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.6)'; e.currentTarget.style.borderColor = 'transparent' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
