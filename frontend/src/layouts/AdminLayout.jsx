import { Outlet } from 'react-router-dom'
import AppShell from '../components/AppShell'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, BadgeCheck, FileSearch, Layers,
  ShieldAlert, Percent, HeartPulse, Activity, PackageSearch, UserCheck, MessageSquare, Banknote, Fingerprint, ScrollText,
} from 'lucide-react'

const icons = {
  dashboard:  <NavIcon icon={LayoutDashboard} color="#ec4899" />,
  brands:     <NavIcon icon={BadgeCheck}      color="#22c55e" />,
  categories: <NavIcon icon={Layers}          color="#06b6d4" />,
  disputes:   <NavIcon icon={ShieldAlert}     color="#ef4444" />,
  commission: <NavIcon icon={Percent}         color="#f59e0b" />,
  financial:  <NavIcon icon={HeartPulse}      color="#10b981" />,
  payouts:    <NavIcon icon={Banknote}        color="#22c55e" />,
  fraud:      <NavIcon icon={Fingerprint}     color="#f43f5e" />,
  audit:      <NavIcon icon={ScrollText}      color="#94a3b8" />,
  analytics:  <NavIcon icon={Activity}        color="#a78bfa" />,
  review:     <NavIcon icon={FileSearch}      color="#7c3aed" />,
  products:   <NavIcon icon={PackageSearch}   color="#fbbf24" />,
  creators:   <NavIcon icon={UserCheck}       color="#f97316" />,
  chat:       <NavIcon icon={MessageSquare}   color="#06b6d4" />,
}

const adminLinks = [
  { path: '/admin',                        label: 'Dashboard',            icon: icons.dashboard },
  { path: '/admin/product-approval',       label: 'Product Approval',     icon: icons.products,  badgeKey: 'products' },
  { path: '/admin/brand-verification',     label: 'Brand Verification',   icon: icons.brands,    badgeKey: 'brands' },
  { path: '/admin/creator-verification',   label: 'Creator Verification', icon: icons.creators },
  { path: '/admin/post-review',            label: 'Post Review',          icon: icons.review,    badgeKey: 'posts' },
  { path: '/admin/categories',             label: 'Categories',           icon: icons.categories },
  { path: '/admin/disputes',               label: 'Dispute Portal',       icon: icons.disputes,  badgeKey: 'disputes' },
  { path: '/admin/fraud',                  label: 'Fraud Review',         icon: icons.fraud,     badgeKey: 'flagged' },
  { path: '/admin/commission',             label: 'Commission Settings',  icon: icons.commission },
  { path: '/admin/payouts',                label: 'Creator Payouts',      icon: icons.payouts,   badgeKey: 'payouts' },
  { path: '/admin/financial',              label: 'Financial Health',     icon: icons.financial },
  { path: '/admin/analytics',              label: 'Platform Analytics',   icon: icons.analytics },
  { path: '/admin/audit',                  label: 'Audit Trail',          icon: icons.audit },
  { path: '/admin/chat',                   label: 'Live Chat Support',    icon: icons.chat,      badge: '●' },
]

const AdminLayout = () => (
  <AppShell links={adminLinks}><Outlet /></AppShell>
)

export default AdminLayout
