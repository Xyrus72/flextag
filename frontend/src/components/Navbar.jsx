import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated, user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isDark = theme === 'dark'

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'For Brands', href: '/#for-brands' },
    { label: 'Catalog', href: '/creator/catalog' },
    { label: 'Contact', href: '/#contact' },
  ]

  const getDashboardLink = () => {
    if (!user) return '/login'
    return { creator: '/creator', brand: '/brand', admin: '/admin' }[user.role] || '/login'
  }

  return (
    <nav className="fixed top-0 w-full z-40 glass-panel border-b-0 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className={`text-2xl font-medium tracking-tight italic transition-colors duration-500 ${isDark ? 'text-white group-hover:text-orange-400' : 'text-zinc-900 group-hover:text-orange-500'}`}>
            Flextag
          </span>
          <span className="text-[10px] font-normal uppercase tracking-widest text-orange-500 leading-tight flex flex-col opacity-80">
            <span>Shop</span>
            <span>Share · Earn</span>
          </span>
        </Link>

        {/* Center pill nav */}
        <div className={`hidden lg:flex items-center gap-8 px-8 py-2.5 rounded-full border backdrop-blur-md ${isDark ? 'bg-black/20 border-white/5' : 'bg-white/60 border-black/5'}`}>
          {navLinks.map(link => (
            <a key={link.label} href={link.href}
              className={`text-xs font-normal transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
              {link.label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          {/* Dark mode toggle */}
          <button onClick={toggleTheme}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${isDark ? 'border-white/10 text-zinc-400 hover:text-white hover:border-white/20' : 'border-black/10 text-zinc-500 hover:text-zinc-900 hover:border-black/20'}`}>
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to={getDashboardLink()}
                  className="relative inline-flex items-center justify-center px-6 py-2.5 text-xs font-medium text-white transition-all duration-200 bg-orange-600/90 border border-orange-500/50 rounded-full hover:bg-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 uppercase tracking-widest">
                  Dashboard
                </Link>
                <button onClick={logout} className={`text-xs font-normal transition-colors ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={`text-xs font-normal transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
                  Sign In
                </Link>
                <Link to="/register"
                  className="relative inline-flex items-center justify-center px-6 py-2.5 text-xs font-medium text-white transition-all duration-200 bg-orange-600/90 border border-orange-500/50 rounded-full hover:bg-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 uppercase tracking-widest">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className={`lg:hidden w-10 h-10 rounded-full border flex items-center justify-center ${isDark ? 'border-white/10 text-white' : 'border-black/10 text-zinc-900'}`}>
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className={`lg:hidden px-6 pb-6 space-y-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          {navLinks.map(link => (
            <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)}
              className={`block py-2 text-xs font-normal ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}>
              {link.label}
            </a>
          ))}
          <div className="pt-4 space-y-2 border-t border-white/5">
            {isAuthenticated ? (
              <Link to={getDashboardLink()} onClick={() => setMobileOpen(false)}
                className="block text-center px-6 py-2.5 text-xs font-medium text-white bg-orange-600/90 border border-orange-500/50 rounded-full uppercase tracking-widest">
                Dashboard
              </Link>
            ) : (
              <Link to="/register" onClick={() => setMobileOpen(false)}
                className="block text-center px-6 py-2.5 text-xs font-medium text-white bg-orange-600/90 border border-orange-500/50 rounded-full uppercase tracking-widest">
                Get Started
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
