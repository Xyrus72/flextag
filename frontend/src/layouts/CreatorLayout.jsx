import { Outlet } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useT } from '../context/LanguageContext'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Package,
  Upload, Wand2, Clock4, Wallet, TrendingUp,
  Briefcase, UserCircle2, HelpCircle, Ticket, MessageSquare, ShieldAlert, Heart, LineChart,
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
  dashboard:   <NavIcon icon={LayoutDashboard} />,
  catalog:     <NavIcon icon={ShoppingBag} />,
  cart:        <NavIcon icon={ShoppingCart} />,
  wishlist:    <NavIcon icon={Heart} />,
  orders:      <NavIcon icon={Package} />,
  post:        <NavIcon icon={Upload} />,
  caption:     <NavIcon icon={Wand2} />,
  tracker:     <NavIcon icon={Clock4} />,
  wallet:      <NavIcon icon={Wallet} />,
  earnings:    <NavIcon icon={LineChart} />,
  leaderboard: <NavIcon icon={TrendingUp} />,
  portfolio:   <NavIcon icon={Briefcase} />,
  profile:     <NavIcon icon={UserCircle2} />,
  faq:         <NavIcon icon={HelpCircle} />,
  ticket:      <NavIcon icon={Ticket} />,
  chat:        <NavIcon icon={MessageSquare} />,
  disputes:    <NavIcon icon={ShieldAlert} />,
  instagram:   <NavIcon icon={InstagramGlyph} />,
}

// Labels are translated per render so the sidebar follows the language toggle.
const creatorLinks = (t) => [
  { path: '/creator',                     label: t('menu.dashboard'),        icon: icons.dashboard },
  { path: '/creator/catalog',             label: t('menu.catalog'),          icon: icons.catalog },
  { path: '/creator/cart',                label: t('menu.cart'),             icon: icons.cart },
  { path: '/creator/wishlist',            label: t('menu.wishlist'),         icon: icons.wishlist },
  { path: '/creator/orders',              label: t('menu.orders'),           icon: icons.orders },
  { path: '/creator/submit-post',         label: t('menu.submitPost'),       icon: icons.post, badgeKey: 'submitPost' },
  { path: '/creator/caption-validator',   label: t('menu.captionValidator'), icon: icons.caption, badge: 'AI' },
  { path: '/creator/campaign-tracker',    label: t('menu.campaignTracker'),  icon: icons.tracker },
  { path: '/creator/wallet',              label: t('menu.wallet'),           icon: icons.wallet },
  { path: '/creator/earnings',            label: t('menu.earnings'),         icon: icons.earnings },
  { path: '/creator/leaderboard',         label: t('menu.leaderboard'),      icon: icons.leaderboard },
  { path: '/creator/portfolio',           label: t('menu.portfolio'),        icon: icons.portfolio },
  { path: '/creator/profile',             label: t('menu.profile'),          icon: icons.profile },
  { path: '/creator/instagram-analyzer',  label: t('menu.accountAudit'),     icon: icons.instagram, badge: 'IG' },
  { path: '/creator/disputes',            label: t('menu.disputes'),         icon: icons.disputes, badgeKey: 'disputes' },
  { path: '/support/chat',                label: t('menu.liveChat'),         icon: icons.chat },
]

const CreatorLayout = () => {
  const t = useT()
  return <AppShell links={creatorLinks(t)}><Outlet /></AppShell>
}

export default CreatorLayout
