import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, BadgeCheck, FileSearch, Layers,
  ShieldAlert, Percent, HeartPulse, Activity, PackageSearch, UserCheck,
} from 'lucide-react'

const icons = {
  dashboard:  <NavIcon icon={LayoutDashboard} color="#ec4899" />,
  brands:     <NavIcon icon={BadgeCheck}      color="#22c55e" />,
  categories: <NavIcon icon={Layers}          color="#06b6d4" />,
  disputes:   <NavIcon icon={ShieldAlert}     color="#ef4444" />,
  commission: <NavIcon icon={Percent}         color="#f59e0b" />,
  financial:  <NavIcon icon={HeartPulse}      color="#10b981" />,
  analytics:  <NavIcon icon={Activity}        color="#a78bfa" />,
  review:     <NavIcon icon={FileSearch}      color="#7c3aed" />,
  products:   <NavIcon icon={PackageSearch}   color="#fbbf24" />,
  creators:   <NavIcon icon={UserCheck}       color="#f97316" />,
}

const adminLinks = [
  { path: '/admin',                        label: 'Dashboard',            icon: icons.dashboard },
  { path: '/admin/product-approval',       label: 'Product Approval',     icon: icons.products,  badge: '!' },
  { path: '/admin/brand-verification',     label: 'Brand Verification',   icon: icons.brands,    badge: '3' },
  { path: '/admin/creator-verification',   label: 'Creator Verification', icon: icons.creators },
  { path: '/admin/post-review',            label: 'Post Review',          icon: icons.review },
  { path: '/admin/categories',             label: 'Categories',           icon: icons.categories },
  { path: '/admin/disputes',               label: 'Dispute Portal',       icon: icons.disputes,  badge: '2' },
  { path: '/admin/commission',             label: 'Commission Settings',  icon: icons.commission },
  { path: '/admin/financial',              label: 'Financial Health',     icon: icons.financial },
  { path: '/admin/analytics',              label: 'Platform Analytics',   icon: icons.analytics },
]

const AdminLayout = () => (
  <div style={{ minHeight: '100vh', background: '#050816', position: 'relative' }}>
    <div className="noise-overlay" />
    <Sidebar links={adminLinks} />
    <main style={{ marginLeft: 256, minHeight: '100vh', position: 'relative', zIndex: 10 }}>
      <Outlet />
    </main>
  </div>
)

export default AdminLayout
