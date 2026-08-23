import { Outlet } from 'react-router-dom'
import AppShell from '../components/AppShell'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, BadgeCheck, FileSearch, Layers,
  ShieldAlert, Percent, HeartPulse, Activity, PackageSearch, UserCheck, MessageSquare,
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
  chat:       <NavIcon icon={MessageSquare}   color="#06b6d4" />,
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
  { path: '/admin/chat',                   label: 'Live Chat Support',    icon: icons.chat,      badge: '●' },
]

const AdminLayout = () => (
  <AppShell links={adminLinks}><Outlet /></AppShell>
)

export default AdminLayout
