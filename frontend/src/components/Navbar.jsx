import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { useT } from '../context/LanguageContext'
import Logo from './Logo'

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const t = useT()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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
    { label: t('nav.home'),        href: '/' },
    { label: t('nav.howItWorks'),  href: '/#how-it-works' },
    { label: t('nav.forBrands'),   href: '/#for-brands' },
    // Visitors get the public shop window; a logged-in creator goes straight to the real catalog.
    { label: t('nav.catalog'),     href: isAuthenticated && user?.role === 'creator' ? '/creator/catalog' : '/explore' },
    { label: t('nav.contact'),     href: '/#contact' },
  ]

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9000,
      transition: 'all 0.4s ease',
      background: scrolled
        ? 'rgba(var(--nav-rgb), 0.92)'
        : 'rgba(var(--nav-rgb), 0.75)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(var(--ink-rgb),0.07)',
      boxShadow: scrolled ? '0 8px 30px rgba(0,0,0,0.25)' : 'none',
    }}>

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
          <Logo size={30} />
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
                padding: '8px 13px',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 500,
                color: 'rgba(var(--ink-rgb),0.6)',
                textDecoration: 'none',
                letterSpacing: '-0.005em',
                transition: 'color 150ms cubic-bezier(0.2,0,0,1), background-color 150ms cubic-bezier(0.2,0,0,1)',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text)'
                e.currentTarget.style.background = 'rgba(var(--ink-rgb),0.06)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'rgba(var(--ink-rgb),0.6)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* ── RIGHT ACTIONS ──────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <LanguageToggle />
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Link to={getDashboardLink()} className="btn-primary" style={{ textDecoration: 'none', padding: '8px 18px', fontSize: 13 }}>
                {t('nav.dashboard')}
              </Link>
              <button onClick={logout} style={{
                background: 'none', border: 'none', padding: '8px 10px',
                fontSize: 13, fontWeight: 500, color: 'rgba(var(--ink-rgb),0.4)', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'color 150ms',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(var(--ink-rgb),0.75)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--ink-rgb),0.4)'}
              >{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 13 }}>
                {t('nav.login')}
              </Link>
              <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 18px', fontSize: 13 }}>
                {t('nav.signup')}
              </Link>
            </>
          )}

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none',
              width: 38, height: 38, borderRadius: 10,
              border: '1px solid rgba(var(--ink-rgb),0.1)',
              background: 'rgba(var(--ink-rgb),0.04)',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(var(--ink-rgb),0.6)',
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
        background: 'rgba(var(--nav-rgb),0.98)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(var(--ink-rgb),0.05)',
      }}>
        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navLinks.map(link => (
            <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{
              padding: '12px 16px', borderRadius: 10,
              fontSize: 12, fontWeight: 500, color: 'rgba(var(--ink-rgb),0.5)',
              textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
              display: 'block',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(var(--ink-rgb),0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(var(--ink-rgb),0.5)'; e.currentTarget.style.background = 'transparent' }}
            >{link.label}</a>
          ))}
          <div style={{ borderTop: '1px solid rgba(var(--ink-rgb),0.05)', marginTop: 8, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/login" onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: 12, borderRadius: 10, background: 'transparent', border: '1px solid rgba(var(--ink-rgb),0.1)', color: 'rgba(var(--ink-rgb),0.5)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Sign In</button>
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: 12, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: 'none' }}>Get Started Free</button>
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
