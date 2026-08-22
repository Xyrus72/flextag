import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const isLanding = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const getDashboardLink = () => {
    if (!user) return '/login'
    return { creator: '/creator', brand: '/brand', admin: '/admin' }[user.role] || '/login'
  }

  const navLinks = [
    { label: 'Home',         href: '/' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'For Brands',   href: '/#for-brands' },
    { label: 'Catalog',      href: '/creator/catalog' },
    { label: 'Contact',      href: '/#contact' },
  ]

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9000,
      transition: 'all 0.4s ease',
      background: scrolled
        ? 'rgba(5, 8, 22, 0.92)'
        : 'rgba(5, 8, 22, 0.75)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: scrolled
        ? '1px solid rgba(124, 58, 237, 0.2)'
        : '1px solid rgba(255,255,255,0.06)',
      boxShadow: scrolled
        ? '0 4px 40px rgba(0,0,0,0.6), 0 1px 0 rgba(124,58,237,0.1) inset'
        : 'none',
    }}>
      {/* Top shimmer line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(6,182,212,0.4), transparent)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 24px',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
      }}>

        {/* ── LOGO ───────────────────────────────────────────────── */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* FlexTag logo image */}
          <img
            src="/products/flextag-logo.png"
            alt="FlexTag"
            style={{ height: 48, width: 'auto', objectFit: 'contain' }}
          />
        </Link>

        {/* ── CENTER NAV ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          flex: 1, justifyContent: 'center',
        }} className="desktop-nav">
          {navLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="nav-link"
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* ── RIGHT ACTIONS ──────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isAuthenticated ? (
            <>
              <Link to={getDashboardLink()} style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '9px 20px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                  border: 'none', color: '#fff', fontWeight: 700,
                  fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 0 20px rgba(124,58,237,0.35)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(124,58,237,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.35)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >Dashboard</button>
              </Link>
              <button onClick={logout} style={{
                background: 'none', border: 'none', padding: '9px 12px',
                fontSize: 11, color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: 'Inter, sans-serif', transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
              >Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                  padding: '9px 18px', borderRadius: 10,
                  fontSize: 11, color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                >Sign In</button>
              </Link>

              <Link to="/register" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '9px 20px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                  border: 'none', color: '#fff', fontWeight: 700,
                  fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 0 20px rgba(124,58,237,0.35)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(124,58,237,0.65)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.35)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >Get Started</button>
              </Link>
            </>
          )}

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none',
              width: 38, height: 38, borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
              transition: 'all 0.2s',
            }}
            className="mobile-burger"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="17" x2="21" y2="17"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* ── MOBILE DRAWER ──────────────────────────────────────── */}
      <div style={{
        overflow: 'hidden',
        maxHeight: mobileOpen ? 500 : 0,
        transition: 'max-height 0.35s ease',
        background: 'rgba(5,8,22,0.98)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navLinks.map(link => (
            <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{
              padding: '12px 16px', borderRadius: 10,
              fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
              display: 'block',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent' }}
            >{link.label}</a>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 8, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/login" onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: 12, borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Sign In</button>
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: 12, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>Get Started Free</button>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .desktop-nav { display: none !important; }
          .mobile-burger { display: flex !important; }
        }
        .nav-link { position: relative; }
        .nav-link::after {
          content: '';
          position: absolute;
          left: 14px; right: 14px; bottom: 4px;
          height: 1.5px;
          border-radius: 2px;
          background: linear-gradient(90deg, #7c3aed, #06b6d4);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .nav-link:hover::after { transform: scaleX(1); }
      `}</style>
    </nav>
  )
}

export default Navbar
