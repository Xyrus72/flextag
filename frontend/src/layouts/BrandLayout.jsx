import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, Megaphone, Package, BarChart3,
  UserPlus, Star, Building2, HelpCircle, Ticket,
} from 'lucide-react'

const icons = {
  dashboard: <NavIcon icon={LayoutDashboard} color="#06b6d4" />,
  campaign:  <NavIcon icon={Megaphone}       color="#ec4899" />,
  orders:    <NavIcon icon={Package}         color="#10b981" />,
  analytics: <NavIcon icon={BarChart3}       color="#f59e0b" />,
  invite:    <NavIcon icon={UserPlus}        color="#7c3aed" />,
  ratings:   <NavIcon icon={Star}            color="#f97316" />,
  profile:   <NavIcon icon={Building2}       color="#06b6d4" />,
  faq:       <NavIcon icon={HelpCircle}      color="#64748b" />,
  ticket:    <NavIcon icon={Ticket}          color="#64748b" />,
}

const brandLinks = [
  { path: '/brand',                  label: 'Dashboard',       icon: icons.dashboard },
  { path: '/brand/campaign-builder', label: 'Create Campaign', icon: icons.campaign, badge: '+' },
  { path: '/brand/orders',           label: 'Order Fulfillment',icon: icons.orders },
  { path: '/brand/analytics',        label: 'Analytics',       icon: icons.analytics },
  { path: '/brand/invite',           label: 'Invite Creators', icon: icons.invite },
  { path: '/brand/ratings',          label: 'Brand Reputation',icon: icons.ratings },
  { path: '/brand/profile',          label: 'Company Profile', icon: icons.profile },
  { path: '/support/faq',           label: 'FAQ',             icon: icons.faq },
  { path: '/support/tickets',       label: 'Support',         icon: icons.ticket },
]

const BrandLayout = () => (
  <div style={{ minHeight: '100vh', background: '#050816', position: 'relative' }}>
    <div className="noise-overlay" />
    <Sidebar links={brandLinks} />
    <main style={{ marginLeft: 0, paddingTop: 60, minHeight: '100vh', position: 'relative', zIndex: 10 }} className="lg:ml-64 lg:pt-0">
      <Outlet />
    </main>
  </div>
)

export default BrandLayout
