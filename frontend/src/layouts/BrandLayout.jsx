import { Outlet } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useT } from '../context/LanguageContext'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, Megaphone, Package, BarChart3,
  UserPlus, Star, Building2, PackagePlus, PackageCheck, MessageSquare, ShieldCheck, ShieldAlert, Wallet,
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
  wallet:      <NavIcon icon={Wallet}           color="#22c55e" />,
}

const brandLinks = (t) => [
  { path: '/brand',                  label: t('menu.dashboard'),       icon: icons.dashboard },
  { path: '/brand/post-product',     label: t('menu.postProduct'),     icon: icons.postProduct, badge: '+' },
  { path: '/brand/my-products',      label: t('menu.myProducts'),      icon: icons.myProducts },
  { path: '/brand/campaign-builder', label: t('menu.createCampaign'),  icon: icons.campaign },
  { path: '/brand/orders',           label: t('menu.fulfillment'),     icon: icons.orders, badgeKey: 'orders' },
  { path: '/brand/wallet',           label: t('menu.brandWallet'),     icon: icons.wallet },
  { path: '/brand/analytics',        label: t('menu.analytics'),       icon: icons.analytics },
  { path: '/brand/invite',           label: t('menu.inviteCreators'),  icon: icons.invite },
  { path: '/brand/creator-audit',    label: t('menu.creatorAudit'),    icon: icons.audit },
  { path: '/brand/ratings',          label: t('menu.brandReputation'), icon: icons.ratings },
  { path: '/brand/disputes',         label: t('menu.disputes'),        icon: icons.disputes, badgeKey: 'disputes' },
  { path: '/brand/profile',          label: t('menu.companyProfile'),  icon: icons.profile },
  { path: '/brand/chat',             label: t('menu.liveChat'),        icon: icons.chat, badge: '●' },
]

const BrandLayout = () => {
  const t = useT()
  return <AppShell links={brandLinks(t)}><Outlet /></AppShell>
}

export default BrandLayout
