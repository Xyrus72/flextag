import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Sidebar = ({ links = [] }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
      {/* ── Mobile top bar ────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        height: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px',
        background: 'rgba(5,8,22,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }} className="lg:hidden">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/products/flextag-logo.png" alt="FlexTag" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{
          width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="17" x2="21" y2="17"/></>
            }
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 39,
        }} className="lg:hidden" />
      )}

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 40,
        width: collapsed ? 72 : 256,
        background: 'rgba(5,8,22,0.98)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease, transform 0.3s ease',
        transform: mobileOpen ? 'translateX(0)' : undefined,
      }} className={`${mobileOpen ? '' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Purple top line */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          height: 72, display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 18px' : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}>
          {!collapsed && (
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/products/flextag-logo.png" alt="FlexTag" style={{ height: 42, width: 'auto', objectFit: 'contain' }} />
            </Link>
          )}
          {collapsed && (
            <img src="/products/flextag-logo.png" alt="FlexTag" style={{ height: 34, width: 34, objectFit: 'contain' }} />
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex" style={{
            width: 28, height: 28, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
            transition: 'all 0.2s', flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed ? <polyline points="9 18 15 12 9 6"/> : <polyline points="15 18 9 12 15 6"/>}
            </svg>
          </button>
        </div>

        {/* User card */}
        {!collapsed && user && (
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
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px' : '10px 12px',
                borderRadius: 12,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
                transition: 'all 0.15s ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
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
                  {!collapsed && (
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
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '10px' : '10px 12px',
            width: '100%', borderRadius: 12, border: '1px solid transparent',
            background: 'transparent', cursor: 'pointer',
            color: 'rgba(239,68,68,0.6)', fontSize: 13,
            fontFamily: 'inherit', transition: 'all 0.15s ease',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.6)'; e.currentTarget.style.borderColor = 'transparent' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
