import { useState, useEffect, cloneElement } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import useMediaQuery from '../hooks/useMediaQuery'
import useBadges from '../hooks/useBadges'
import Logo from './Logo'

/**
 * Responsive dashboard shell shared by the creator / brand / admin layouts.
 * Desktop (≥1024px): fixed 256px sidebar + floating notification bell.
 * Mobile (<1024px): sidebar becomes a slide-in drawer, a sticky top bar carries
 * the menu button + logo + bell, and a bottom tab bar exposes the primary links.
 */
const isRoot = (path) => path === '/creator' || path === '/brand' || path === '/admin'

const AppShell = ({ links = [], children }) => {
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const [open, setOpen] = useState(false)
  const counts = useBadges()

  // A link declares WHICH count it wants (badgeKey); the number itself comes
  // from the database, and a zero shows nothing at all.
  const links_ = links.map(l => {
    if (!l.badgeKey) return l
    const n = counts[l.badgeKey] || 0
    return { ...l, badge: n > 0 ? (n > 99 ? '99+' : String(n)) : null }
  })
  const primary = links_.slice(0, 4)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <div className="aurora-bg" />
      <div className="noise-overlay" />

      <Sidebar links={links_} mobile={isMobile} open={open} onClose={() => setOpen(false)} />

      {/* Drawer backdrop */}
      {isMobile && open && (
        <div onClick={() => setOpen(false)} aria-hidden="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', zIndex: 45 }} />
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <header style={{
          position: 'sticky', top: 0, zIndex: 30, height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px',
          background: 'rgba(var(--nav-rgb),0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(var(--ink-rgb),0.06)',
        }}>
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" style={{
            width: 40, height: 40, borderRadius: 12, background: 'rgba(var(--ink-rgb),0.05)', border: '1px solid rgba(var(--ink-rgb),0.1)',
            color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}><Menu size={20} /></button>
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Logo size={26} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LanguageToggle />
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
      )}

      {/* Desktop floating theme toggle + bell */}
      {!isMobile && (
        <div style={{ position: 'fixed', top: 16, right: 22, zIndex: 35, display: 'flex', alignItems: 'center', gap: 10 }}>
          <LanguageToggle />
          <ThemeToggle />
          <NotificationBell />
        </div>
      )}

      <main style={{
        marginLeft: isMobile ? 0 : 256, minHeight: '100vh', position: 'relative', zIndex: 10,
        paddingBottom: isMobile ? 76 : 0,
      }}>
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, height: 64,
          display: 'flex', alignItems: 'stretch',
          background: 'rgba(var(--nav-rgb),0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(var(--ink-rgb),0.08)',
        }}>
          {primary.map(l => (
            <NavLink key={l.path} to={l.path} end={isRoot(l.path)}
              style={({ isActive }) => ({
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                textDecoration: 'none', fontSize: 10, fontWeight: 600,
                color: isActive ? 'var(--violet-ink)' : 'rgba(var(--ink-rgb),0.45)',
              })}>
              {cloneElement(l.icon, { size: 15 })}
              <span style={{ whiteSpace: 'nowrap', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.label.split(' ')[0]}</span>
            </NavLink>
          ))}
          <button type="button" onClick={() => setOpen(true)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'rgba(var(--ink-rgb),0.45)', fontFamily: 'inherit' }}>
            <Menu size={20} />
            <span>More</span>
          </button>
        </nav>
      )}
    </div>
  )
}

export default AppShell
