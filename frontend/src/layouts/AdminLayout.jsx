import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useTheme } from '../context/ThemeContext'

const icons = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  brands: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  categories: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  disputes: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  commission: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  financial: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
  analytics: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
}

const adminLinks = [
  { path: '/admin', label: 'Dashboard', icon: icons.dashboard },
  { path: '/admin/brand-verification', label: 'Brand Verification', icon: icons.brands, badge: '3' },
  { path: '/admin/categories', label: 'Categories', icon: icons.categories },
  { path: '/admin/disputes', label: 'Dispute Portal', icon: icons.disputes, badge: '2' },
  { path: '/admin/commission', label: 'Commission Settings', icon: icons.commission },
  { path: '/admin/financial', label: 'Financial Health', icon: icons.financial },
  { path: '/admin/analytics', label: 'Platform Analytics', icon: icons.analytics },
]

const AdminLayout = () => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <div className={`min-h-screen relative ${isDark ? 'bg-[#030303]' : 'bg-[#f8f8f8]'}`}>
      <div className="noise-overlay" />
      <Sidebar links={adminLinks} />
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen relative z-10">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
