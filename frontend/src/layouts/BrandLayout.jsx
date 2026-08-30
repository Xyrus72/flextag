import { Outlet } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useT } from '../context/LanguageContext'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, Megaphone, Package, BarChart3,
  UserPlus, Star, Building2, PackagePlus, PackageCheck, MessageSquare, ShieldCheck, ShieldAlert, Wallet, Upload, FileBarChart,
} from 'lucide-react'

const icons = {
  dashboard:   <NavIcon icon={LayoutDashboard} />,
  campaign:    <NavIcon icon={Megaphone} />,
  orders:      <NavIcon icon={Package} />,
  analytics:   <NavIcon icon={BarChart3} />,
  invite:      <NavIcon icon={UserPlus} />,
  audit:       <NavIcon icon={ShieldCheck} />,
  ratings:     <NavIcon icon={Star} />,
  profile:     <NavIcon icon={Building2} />,
  postProduct: <NavIcon icon={PackagePlus} />,
  myProducts:  <NavIcon icon={PackageCheck} />,
  chat:        <NavIcon icon={MessageSquare} />,
  disputes:    <NavIcon icon={ShieldAlert} />,
  wallet:      <NavIcon icon={Wallet} />,
  importCsv:   <NavIcon icon={Upload} />,
  report:      <NavIcon icon={FileBarChart} />,
}

const brandLinks = (t) => [
  { path: '/brand',                  label: t('menu.dashboard'),       icon: icons.dashboard },
  { path: '/brand/post-product',     label: t('menu.postProduct'),     icon: icons.postProduct, badge: '+' },
  { path: '/brand/my-products',      label: t('menu.myProducts'),      icon: icons.myProducts },
  { path: '/brand/import',           label: t('menu.importProducts'),  icon: icons.importCsv },
  { path: '/brand/campaign-builder', label: t('menu.createCampaign'),  icon: icons.campaign },
  { path: '/brand/orders',           label: t('menu.fulfillment'),     icon: icons.orders, badgeKey: 'orders' },
  { path: '/brand/wallet',           label: t('menu.brandWallet'),     icon: icons.wallet },
  { path: '/brand/analytics',        label: t('menu.analytics'),       icon: icons.analytics },
  { path: '/brand/report',           label: t('menu.report'),          icon: icons.report },
  { path: '/brand/invite',           label: t('menu.inviteCreators'),  icon: icons.invite },
  { path: '/brand/creator-audit',    label: t('menu.creatorAudit'),    icon: icons.audit },
  { path: '/brand/ratings',          label: t('menu.brandReputation'), icon: icons.ratings },
  { path: '/brand/disputes',         label: t('menu.disputes'),        icon: icons.disputes, badgeKey: 'disputes' },
  { path: '/brand/profile',          label: t('menu.companyProfile'),  icon: icons.profile },
  { path: '/brand/chat',             label: t('menu.liveChat'),        icon: icons.chat },
]

const BrandLayout = () => {
  const t = useT()
  return <AppShell links={brandLinks(t)}><Outlet /></AppShell>
}

export default BrandLayout
