import { Outlet } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useT } from '../context/LanguageContext'
import NavIcon from '../components/NavIcon'
import {
  LayoutDashboard, BadgeCheck, FileSearch, Layers,
  ShieldAlert, Percent, HeartPulse, Activity, PackageSearch, UserCheck, MessageSquare, Banknote, Fingerprint, ScrollText,
} from 'lucide-react'

const icons = {
  dashboard:  <NavIcon icon={LayoutDashboard} />,
  brands:     <NavIcon icon={BadgeCheck} />,
  categories: <NavIcon icon={Layers} />,
  disputes:   <NavIcon icon={ShieldAlert} />,
  commission: <NavIcon icon={Percent} />,
  financial:  <NavIcon icon={HeartPulse} />,
  payouts:    <NavIcon icon={Banknote} />,
  fraud:      <NavIcon icon={Fingerprint} />,
  audit:      <NavIcon icon={ScrollText} />,
  analytics:  <NavIcon icon={Activity} />,
  review:     <NavIcon icon={FileSearch} />,
  products:   <NavIcon icon={PackageSearch} />,
  creators:   <NavIcon icon={UserCheck} />,
  chat:       <NavIcon icon={MessageSquare} />,
}

// Labels are translated per render so the sidebar follows the language toggle
// — admin used to be the one shell that ignored it.
const adminLinks = (t) => [
  { path: '/admin',                        label: t('menu.dashboard'),            icon: icons.dashboard },
  { path: '/admin/product-approval',       label: t('menu.productApproval'),      icon: icons.products,  badgeKey: 'products' },
  { path: '/admin/brand-verification',     label: t('menu.brandVerification'),    icon: icons.brands,    badgeKey: 'brands' },
  { path: '/admin/creator-verification',   label: t('menu.creatorVerification'),  icon: icons.creators },
  { path: '/admin/post-review',            label: t('menu.postReview'),           icon: icons.review,    badgeKey: 'posts' },
  { path: '/admin/categories',             label: t('menu.categories'),           icon: icons.categories },
  { path: '/admin/disputes',               label: t('menu.disputePortal'),        icon: icons.disputes,  badgeKey: 'disputes' },
  { path: '/admin/fraud',                  label: t('menu.fraud'),                icon: icons.fraud,     badgeKey: 'flagged' },
  { path: '/admin/commission',             label: t('menu.commissionSettings'),   icon: icons.commission },
  { path: '/admin/payouts',                label: t('menu.payouts'),              icon: icons.payouts,   badgeKey: 'payouts' },
  { path: '/admin/financial',              label: t('menu.financialHealth'),      icon: icons.financial },
  { path: '/admin/analytics',              label: t('menu.platformAnalytics'),    icon: icons.analytics },
  { path: '/admin/audit',                  label: t('menu.auditTrail'),           icon: icons.audit },
  { path: '/admin/chat',                   label: t('menu.liveChatSupport'),      icon: icons.chat },
]

const AdminLayout = () => {
  const t = useT()
  return <AppShell links={adminLinks(t)}><Outlet /></AppShell>
}

export default AdminLayout
