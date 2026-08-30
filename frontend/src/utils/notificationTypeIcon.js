import { Wallet, Banknote, Package, Scale, CheckCircle2, Star, Gift, Landmark, Bell } from 'lucide-react'

/**
 * One icon per notification type, shared by the bell dropdown and the full
 * notification history — keyed on `type` rather than the `icon` emoji the
 * backend still stores on each document (kept for the email digest's plain-
 * text rendering; the web UI never shows raw emoji as chrome).
 */
export const TYPE_ICON = {
  cashback:      Wallet,
  payout:        Banknote,
  order:         Package,
  dispute:       Scale,
  post_verified: CheckCircle2,
  rating:        Star,
  referral:      Gift,
  wallet:        Landmark,
  system:        Bell,
}
