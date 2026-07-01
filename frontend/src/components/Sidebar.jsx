import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const Sidebar = ({ links = [] }) => {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isDark = theme === 'dark'

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <>
      {/* Mobile top bar */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-40 h-16 glass-panel flex items-center justify-between px-4 ${isDark ? '' : 'bg-white/80'}`}>
        <Link to="/" className="flex items-center gap-2">
          <span className={`text-lg font-medium tracking-tight italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>Flextag</span>
          <span className="text-[8px] font-normal uppercase tracking-widest text-orange-500">Dashboard</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className={`w-9 h-9 rounded-full border flex items-center justify-center ${isDark ? 'border-white/10 text-white' : 'border-black/10 text-zinc-900'}`}>
          {mobileOpen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen z-40 transition-all duration-300 flex flex-col
        ${collapsed ? 'w-20' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isDark ? 'bg-[#030303] border-r border-white/5' : 'bg-white border-r border-black/5'}
      `}>
        {/* Header */}
        <div className={`flex items-center justify-between h-20 px-5 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2 group">
              <span className={`text-xl font-medium tracking-tight italic ${isDark ? 'text-white group-hover:text-orange-400' : 'text-zinc-900 group-hover:text-orange-500'} transition-colors duration-500`}>Flextag</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className={`hidden lg:flex w-8 h-8 rounded-lg border items-center justify-center transition-colors ${isDark ? 'border-white/10 text-zinc-500 hover:text-white' : 'border-black/10 text-zinc-400 hover:text-zinc-900'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {collapsed ? <polyline points="9 18 15 12 9 6"/> : <polyline points="15 18 9 12 15 6"/>}
            </svg>
          </button>
        </div>

        {/* User card */}
        {!collapsed && user && (
          <div className={`mx-4 mt-4 p-3 rounded-xl ${isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-black/[0.02] border border-black/5'}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.name?.[0] || '?'}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{user.name}</p>
                <p className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map(link => (
            <NavLink key={link.path} to={link.path} end={link.path === '/creator' || link.path === '/brand' || link.path === '/admin'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-normal transition-all duration-200 group
                ${collapsed ? 'justify-center' : ''}
                ${isActive
                  ? isDark ? 'bg-white/[0.05] text-white border border-white/10' : 'bg-black/[0.05] text-zinc-900 border border-black/10'
                  : isDark ? 'text-zinc-500 hover:text-white hover:bg-white/[0.03] border border-transparent' : 'text-zinc-400 hover:text-zinc-900 hover:bg-black/[0.03] border border-transparent'
                }
              `}>
              <span className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">{link.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{link.label}</span>
                  {link.badge && (
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[9px] font-bold border border-orange-500/20">
                      {link.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className={`p-4 space-y-2 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <button onClick={toggleTheme} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-normal transition-all ${collapsed ? 'justify-center' : ''} ${isDark ? 'text-zinc-500 hover:text-white hover:bg-white/[0.03]' : 'text-zinc-400 hover:text-zinc-900 hover:bg-black/[0.03]'}`}>
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
            {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button onClick={handleLogout} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-normal transition-all ${collapsed ? 'justify-center' : ''} text-red-400/70 hover:text-red-400 ${isDark ? 'hover:bg-red-500/5' : 'hover:bg-red-50'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
