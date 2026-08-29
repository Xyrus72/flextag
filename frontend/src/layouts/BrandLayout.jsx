import { Outlet } from 'react-router-dom'
import AppShell from '../components/AppShell'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, Megaphone, Package, BarChart3,
  UserPlus, Star, Building2, PackagePlus, PackageCheck, MessageSquare, ShieldCheck, ShieldAlert,
} from 'lucide-react'

const icons = {
  dashboard:   <NavIcon icon={LayoutDashboard} color="#06b6d4" />,
  campaign:    <NavIcon icon={Megaphone}       color="#ec4899" />,
  orders:      <NavIcon icon={Package}         color="#10b981" />,
  analytics:   <NavIcon icon={BarChart3}       color="#f59e0b" />,
  invite:      <NavIcon icon={UserPlus}        color="#7c3aed" />,
  audit:       <NavIcon icon={ShieldCheck}     color="#22c55e" />,
  ratings:     <NavIcon icon={Star}            color="#f97316" />,
  profile:     <NavIcon icon={Building2}       color="#06b6d4" />,
  postProduct: <NavIcon icon={PackagePlus}     color="#a78bfa" />,
  myProducts:  <NavIcon icon={PackageCheck}    color="#4ade80" />,
  chat:        <NavIcon icon={MessageSquare}    color="#06b6d4" />,
  disputes:    <NavIcon icon={ShieldAlert}      color="#ef4444" />,
}

const brandLinks = [
  { path: '/brand',                  label: 'Dashboard',        icon: icons.dashboard },
  { path: '/brand/post-product',     label: 'Post Product',     icon: icons.postProduct, badge: '+' },
  { path: '/brand/my-products',      label: 'My Products',      icon: icons.myProducts },
  { path: '/brand/campaign-builder', label: 'Create Campaign',  icon: icons.campaign },
  { path: '/brand/orders',           label: 'Order Fulfillment',icon: icons.orders },
  { path: '/brand/analytics',        label: 'Analytics',        icon: icons.analytics },
  { path: '/brand/invite',           label: 'Invite Creators',  icon: icons.invite },
  { path: '/brand/creator-audit',    label: 'Creator Audit',    icon: icons.audit },
  { path: '/brand/ratings',          label: 'Brand Reputation', icon: icons.ratings },
  { path: '/brand/disputes',         label: 'Disputes',         icon: icons.disputes },
  { path: '/brand/profile',          label: 'Company Profile',  icon: icons.profile },
  { path: '/brand/chat',             label: 'Live Chat',        icon: icons.chat, badge: '●' },
]

const BrandLayout = () => (
  <AppShell links={brandLinks}><Outlet /></AppShell>
)

export default BrandLayout
