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

  const isHash = (href) => href.includes('#')

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9000,
      transitionProperty: 'background-color, box-shadow',
      transitionDuration: '150ms',
      transitionTimingFunction: 'cubic-bezier(0.2,0,0,1)',
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
          <Logo size={30} />
        </Link>

        {/* ── CENTER NAV ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          flex: 1, justifyContent: 'center',
        }} className="desktop-nav">
          {navLinks.map(link => {
            const shared = {
              className: 'nav-link',
              style: {
                padding: '8px 13px',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 500,
                color: 'rgba(var(--ink-rgb),0.6)',
                textDecoration: 'none',
                letterSpacing: '-0.005em',
                whiteSpace: 'nowrap',
              },
            }
            return isHash(link.href)
              ? <a key={link.label} {...shared} href={link.href}>{link.label}</a>
              : <Link key={link.label} {...shared} to={link.href}>{link.label}</Link>
          })}
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
              <button onClick={logout} className="nav-logout" style={{
                background: 'none', border: 'none', padding: '8px 10px',
                fontSize: 13, fontWeight: 500, color: 'rgba(var(--ink-rgb),0.4)', cursor: 'pointer',
                fontFamily: 'inherit',
              }}>{t('nav.logout')}</button>
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
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            style={{
              display: 'none',
              width: 38, height: 38, borderRadius: 10,
              border: '1px solid rgba(var(--ink-rgb),0.1)',
              background: 'rgba(var(--ink-rgb),0.04)',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(var(--ink-rgb),0.6)',
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
        transition: 'max-height 0.35s cubic-bezier(0.2,0,0,1)',
        background: 'rgba(var(--nav-rgb),0.98)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(var(--ink-rgb),0.05)',
      }}>
        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navLinks.map(link => {
            const shared = {
              className: 'nav-link-mobile',
              onClick: () => setMobileOpen(false),
              style: {
                padding: '12px 16px', borderRadius: 10,
                fontSize: 14, fontWeight: 500, color: 'rgba(var(--ink-rgb),0.6)',
                textDecoration: 'none', letterSpacing: '-0.005em',
                display: 'block',
              },
            }
            return isHash(link.href)
              ? <a key={link.label} {...shared} href={link.href}>{link.label}</a>
              : <Link key={link.label} {...shared} to={link.href}>{link.label}</Link>
          })}
          <div style={{ borderTop: '1px solid rgba(var(--ink-rgb),0.05)', marginTop: 8, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isAuthenticated ? (
              <>
                <Link to={getDashboardLink()} onClick={() => setMobileOpen(false)} className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', width: '100%' }}>
                  {t('nav.dashboard')}
                </Link>
                <button onClick={() => { setMobileOpen(false); logout() }} className="btn-ghost" style={{ width: '100%' }}>
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-ghost" style={{ textDecoration: 'none', textAlign: 'center', width: '100%' }}>
                  {t('nav.login')}
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', width: '100%' }}>
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .desktop-nav { display: none !important; }
          .mobile-burger { display: flex !important; }
        }
        .nav-link, .nav-link-mobile, .nav-logout { position: relative; transition: color 150ms cubic-bezier(0.2,0,0,1), background-color 150ms cubic-bezier(0.2,0,0,1); }
        .nav-link:hover, .nav-link-mobile:hover { color: var(--text); background-color: rgba(var(--ink-rgb),0.06); }
        .nav-logout:hover { color: rgba(var(--ink-rgb),0.75); }
        .nav-link::after {
          content: '';
          position: absolute;
          left: 14px; right: 14px; bottom: 4px;
          height: 1.5px;
          border-radius: 2px;
          background: var(--purple);
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
