import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Package,
  Upload, Wand2, Clock4, Wallet, TrendingUp,
  Briefcase, UserCircle2, HelpCircle, Ticket, MessageSquare, BarChart2,
} from 'lucide-react'

const icons = {
  dashboard:   <NavIcon icon={LayoutDashboard} color="#7c3aed" />,
  catalog:     <NavIcon icon={ShoppingBag}      color="#06b6d4" />,
  cart:        <NavIcon icon={ShoppingCart}     color="#f59e0b" />,
  orders:      <NavIcon icon={Package}          color="#10b981" />,
  post:        <NavIcon icon={Upload}           color="#8b5cf6" />,
  caption:     <NavIcon icon={Wand2}            color="#ec4899" />,
  tracker:     <NavIcon icon={Clock4}           color="#06b6d4" />,
  wallet:      <NavIcon icon={Wallet}           color="#22c55e" />,
  leaderboard: <NavIcon icon={TrendingUp}       color="#f97316" />,
  portfolio:   <NavIcon icon={Briefcase}        color="#a78bfa" />,
  profile:     <NavIcon icon={UserCircle2}      color="#7c3aed" />,
  faq:         <NavIcon icon={HelpCircle}       color="#64748b" />,
  ticket:      <NavIcon icon={Ticket}           color="#64748b" />,
  chat:        <NavIcon icon={MessageSquare}    color="#06b6d4" />,
  instagram:   <NavIcon icon={BarChart2}        color="#fd1d1d" />,
}

const creatorLinks = [
  { path: '/creator',                  label: 'Dashboard',        icon: icons.dashboard },
  { path: '/creator/catalog',          label: 'Shop Catalog',     icon: icons.catalog },
  { path: '/creator/cart',             label: 'Cart',             icon: icons.cart },
  { path: '/creator/orders',           label: 'My Orders',        icon: icons.orders },
  { path: '/creator/submit-post',      label: 'Submit Post',      icon: icons.post },
  { path: '/creator/caption-validator',label: 'Caption Validator',icon: icons.caption, badge: 'AI' },
  { path: '/creator/campaign-tracker', label: 'Campaign Tracker', icon: icons.tracker },
  { path: '/creator/wallet',           label: 'Wallet',           icon: icons.wallet },
  { path: '/creator/leaderboard',      label: 'Leaderboard',      icon: icons.leaderboard },
  { path: '/creator/portfolio',        label: 'Portfolio',        icon: icons.portfolio },
  { path: '/creator/profile',          label: 'Profile & Shipping',icon: icons.profile },
  { path: '/creator/instagram-analyzer',  label: 'IG Analyzer',        icon: icons.instagram, badge: 'BOT' },
  { path: '/support/faq',             label: 'FAQ',              icon: icons.faq },
  { path: '/support/tickets',         label: 'Support',          icon: icons.ticket },
  { path: '/support/chat',            label: 'Live Chat',        icon: icons.chat, badge: '●' },
]

const CreatorLayout = () => (
  <div style={{ minHeight: '100vh', background: '#050816', position: 'relative' }}>
    <div className="noise-overlay" />
    <Sidebar links={creatorLinks} />
    <main style={{ marginLeft: 0, paddingTop: 60, minHeight: '100vh', position: 'relative', zIndex: 10 }} className="lg:ml-64 lg:pt-0">
      <Outlet />
    </main>
  </div>
)

export default CreatorLayout
