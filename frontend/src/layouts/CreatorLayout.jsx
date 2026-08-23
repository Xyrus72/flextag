import { Outlet } from 'react-router-dom'
import AppShell from '../components/AppShell'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Package,
  Upload, Wand2, Clock4, Wallet, TrendingUp,
  Briefcase, UserCircle2, HelpCircle, Ticket, MessageSquare,
} from 'lucide-react'

/**
 * Instagram glyph — lucide-react v1 dropped brand icons, so this mirrors the
 * lucide icon props API (size / strokeWidth / style) for use with <NavIcon>.
 */
const InstagramGlyph = ({ size = 17, strokeWidth = 1.6, style, ...rest }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    style={style} aria-hidden="true" {...rest}
  >
    <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <path d="M17.5 6.5h.01" />
  </svg>
)

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
  instagram:   <NavIcon icon={InstagramGlyph}   color="#fd1d1d" />,
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
  { path: '/creator/instagram-analyzer',  label: 'Account Audit',      icon: icons.instagram, badge: 'IG' },
  { path: '/support/chat',            label: 'Live Chat',        icon: icons.chat, badge: '●' },
]

const CreatorLayout = () => (
  <AppShell links={creatorLinks}><Outlet /></AppShell>
)

export default CreatorLayout
