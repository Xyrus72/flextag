import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [scrolled, setScrolled]           = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const location                          = useLocation()
  const isLanding                         = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const getDashboardLink = () => {
    if (!user) return '/login'
    return { creator: '/creator', brand: '/brand', admin: '/admin' }[user.role] || '/login'
  }

  const navLinks = [
    { label: 'Home',        href: '/' },
    { label: 'How It Works',href: '/#how-it-works' },
    { label: 'For Brands',  href: '/#for-brands' },
    { label: 'Catalog',     href: '/creator/catalog' },
    { label: 'Contact',     href: '/#contact' },
  ]

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      scrolled
        ? 'border-b border-white/8 bg-[#050505]/80 backdrop-blur-2xl shadow-2xl shadow-black/50'
        : 'border-b border-transparent bg-transparent'
    }`}>
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* ── Logo ─────────────────────────────────────────── */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center text-white font-black text-sm italic">F</div>
          </div>
          <div>
            <span className="text-xl font-black italic tracking-tighter text-white group-hover:text-orange-400 transition-colors">
              FlexTag™
            </span>
            <p className="text-[9px] text-orange-500/70 uppercase tracking-[0.2em] leading-none mt-0.5">Shop · Share · Earn</p>
          </div>
        </Link>

        {/* ── Center pill nav ───────────────────────────────── */}
        <div className="hidden lg:flex items-center gap-1 px-3 py-2 rounded-full border border-white/8 bg-white/[0.03] backdrop-blur-xl">
          {navLinks.map(link => (
            <a key={link.label} href={link.href}
              className="px-4 py-2 text-[11px] font-medium text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-all uppercase tracking-wider">
              {link.label}
            </a>
          ))}
        </div>

        {/* ── Right actions ─────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to={getDashboardLink()}
                  className="px-5 py-2.5 text-[11px] font-black text-white uppercase tracking-widest rounded-full relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600 group-hover:from-orange-400 group-hover:to-pink-500 transition-all" />
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600 blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
                  <span className="relative z-10">Dashboard</span>
                </Link>
                <button onClick={logout}
                  className="text-[11px] text-zinc-500 hover:text-white transition-colors uppercase tracking-wider">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login"
                  className="text-[11px] text-zinc-400 hover:text-white transition-colors uppercase tracking-wider px-3 py-2">
                  Sign In
                </Link>
                <Link to="/register"
                  className="px-5 py-2.5 text-[11px] font-black text-white uppercase tracking-widest rounded-full relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600 group-hover:from-orange-400 group-hover:to-pink-500 transition-all" />
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600 blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
                  <span className="relative z-10">Get Started</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="17" x2="21" y2="17"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ──────────────────────────────────── */}
      <div className={`lg:hidden transition-all duration-300 overflow-hidden ${mobileOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-[#050505]/95 backdrop-blur-2xl space-y-1">
          {navLinks.map(link => (
            <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-wider">
              {link.label}
            </a>
          ))}
          <div className="pt-4 border-t border-white/5 space-y-2">
            {isAuthenticated ? (
              <Link to={getDashboardLink()} onClick={() => setMobileOpen(false)}
                className="block text-center py-3 rounded-xl text-xs font-black text-white uppercase tracking-widest relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600" />
                <span className="relative z-10">Dashboard</span>
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="block text-center py-3 rounded-xl text-xs font-medium text-zinc-400 border border-white/8 hover:border-white/15 hover:text-white transition-all uppercase tracking-wider">
                  Sign In
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}
                  className="block text-center py-3 rounded-xl text-xs font-black text-white uppercase tracking-widest relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-600" />
                  <span className="relative z-10">Get Started Free</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
