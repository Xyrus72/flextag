/**
 * English + Bangla strings.
 *
 * FlexTag's users are Bangladeshi creators and Dhaka D2C brands — captions have
 * always supported Bangla while the interface only spoke English. Keys are flat
 * and namespaced (`nav.catalog`), and anything missing from `bn` falls back to
 * `en` rather than rendering a raw key, so a half-translated screen still reads.
 *
 * Placeholders use {name}: t('hero.subtitle', { rate: '30–70%' }).
 */

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'bn', label: 'বাং', name: 'বাংলা' },
]

const en = {
  // ── Public navigation ──────────────────────────────────────────────────
  'nav.home': 'Home',
  'nav.howItWorks': 'How It Works',
  'nav.forBrands': 'For Brands',
  'nav.catalog': 'Catalog',
  'nav.contact': 'Contact',
  'nav.login': 'Log In',
  'nav.signup': 'Sign Up',
  'nav.dashboard': 'Dashboard',
  'nav.logout': 'Log Out',
  'nav.menu': 'Menu',

  // ── Landing hero ───────────────────────────────────────────────────────
  'hero.badge': "Bangladesh's creator-commerce platform",
  'hero.title1': 'Shop. Share.',
  'hero.title2': 'Get Paid.',
  'hero.subtitle': 'FlexTag pays nano & micro-influencers {rate} cashback for sharing products they genuinely love. Escrow-protected. Paid in 48 hours.',
  'hero.cta': 'Start Earning Free →',
  'hero.secondary': 'See How It Works',
  'hero.creators': 'creators',
  'hero.cashbackPaid': 'cashback paid',
  'hero.brandPartners': 'brand partners',

  // ── Auth ───────────────────────────────────────────────────────────────
  'auth.welcomeBack': 'Welcome back',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.login': 'Log in',
  'auth.loggingIn': 'Logging in…',
  'auth.noAccount': "Don't have an account?",
  'auth.createAccount': 'Create one',
  'auth.haveAccount': 'Already have an account?',

  // ── Dashboard navigation ───────────────────────────────────────────────
  'menu.dashboard': 'Dashboard',
  'menu.catalog': 'Shop Catalog',
  'menu.cart': 'Cart',
  'menu.wishlist': 'Wishlist',
  'menu.orders': 'My Orders',
  'menu.submitPost': 'Submit Post',
  'menu.captionValidator': 'Caption Validator',
  'menu.campaignTracker': 'Campaign Tracker',
  'menu.wallet': 'Wallet',
  'menu.leaderboard': 'Leaderboard',
  'menu.portfolio': 'Portfolio',
  'menu.profile': 'Profile & Shipping',
  'menu.accountAudit': 'Account Audit',
  'menu.disputes': 'Disputes',
  'menu.liveChat': 'Live Chat',
  'menu.postProduct': 'Post Product',
  'menu.myProducts': 'My Products',
  'menu.createCampaign': 'Create Campaign',
  'menu.fulfillment': 'Order Fulfillment',
  'menu.analytics': 'Analytics',
  'menu.inviteCreators': 'Invite Creators',
  'menu.creatorAudit': 'Creator Audit',
  'menu.brandReputation': 'Brand Reputation',
  'menu.companyProfile': 'Company Profile',
  'menu.payouts': 'Creator Payouts',
  'menu.fraud': 'Fraud Review',

  // ── Page headers ───────────────────────────────────────────────────────
  'page.catalog.title': 'Shop Catalog & Category Filter',
  'page.catalog.subtitle': 'Browse products and earn verified cashback by sharing authentic content',
  'page.orders.title': 'My Orders',
  'page.orders.subtitle': 'Track your orders and post content to earn cashback',
  'page.wallet.title': 'Wallet',
  'page.wallet.subtitle': 'Track your cashback earnings and withdraw anytime',
  'page.wishlist.title': 'Wishlist',
  'page.wishlist.subtitle': 'Products you saved. Budgets move — check the cashback before you order.',

  // ── Wallet ─────────────────────────────────────────────────────────────
  'wallet.totalEarnings': 'Total Earnings',
  'wallet.pendingEscrow': 'Pending Escrow',
  'wallet.available': 'Available Balance',
  'wallet.withdraw': 'Withdraw',
  'wallet.addCash': 'Add Cash',
  'wallet.transactions': 'Transaction History',
  'wallet.payoutMethod': 'Payout Method',
  'wallet.requestWithdrawal': 'Request Withdrawal',

  // ── Common ─────────────────────────────────────────────────────────────
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.loading': 'Loading…',
  'common.search': 'Search',
  'common.all': 'All',
  'common.retry': 'Try again',
  'common.language': 'Language',
}

const bn = {
  'nav.home': 'হোম',
  'nav.howItWorks': 'কীভাবে কাজ করে',
  'nav.forBrands': 'ব্র্যান্ডদের জন্য',
  'nav.catalog': 'ক্যাটালগ',
  'nav.contact': 'যোগাযোগ',
  'nav.login': 'লগ ইন',
  'nav.signup': 'সাইন আপ',
  'nav.dashboard': 'ড্যাশবোর্ড',
  'nav.logout': 'লগ আউট',
  'nav.menu': 'মেনু',

  'hero.badge': 'বাংলাদেশের ক্রিয়েটর-কমার্স প্ল্যাটফর্ম',
  'hero.title1': 'কিনুন। শেয়ার করুন।',
  'hero.title2': 'টাকা নিন।',
  'hero.subtitle': 'পছন্দের পণ্য শেয়ার করলেই ফ্লেক্সট্যাগ ন্যানো ও মাইক্রো-ইনফ্লুয়েন্সারদের {rate} ক্যাশব্যাক দেয়। এসক্রো-সুরক্ষিত। ৪৮ ঘণ্টার মধ্যে পেমেন্ট।',
  'hero.cta': 'ফ্রিতে আয় শুরু করুন →',
  'hero.secondary': 'কীভাবে কাজ করে দেখুন',
  'hero.creators': 'জন ক্রিয়েটর',
  'hero.cashbackPaid': 'ক্যাশব্যাক দেওয়া হয়েছে',
  'hero.brandPartners': 'ব্র্যান্ড পার্টনার',

  'auth.welcomeBack': 'আবার স্বাগতম',
  'auth.email': 'ইমেইল',
  'auth.password': 'পাসওয়ার্ড',
  'auth.login': 'লগ ইন',
  'auth.loggingIn': 'লগ ইন হচ্ছে…',
  'auth.noAccount': 'অ্যাকাউন্ট নেই?',
  'auth.createAccount': 'নতুন অ্যাকাউন্ট খুলুন',
  'auth.haveAccount': 'আগে থেকেই অ্যাকাউন্ট আছে?',

  'menu.dashboard': 'ড্যাশবোর্ড',
  'menu.catalog': 'শপ ক্যাটালগ',
  'menu.cart': 'কার্ট',
  'menu.wishlist': 'উইশলিস্ট',
  'menu.orders': 'আমার অর্ডার',
  'menu.submitPost': 'পোস্ট জমা দিন',
  'menu.captionValidator': 'ক্যাপশন যাচাই',
  'menu.campaignTracker': 'ক্যাম্পেইন ট্র্যাকার',
  'menu.wallet': 'ওয়ালেট',
  'menu.leaderboard': 'লিডারবোর্ড',
  'menu.portfolio': 'পোর্টফোলিও',
  'menu.profile': 'প্রোফাইল ও শিপিং',
  'menu.accountAudit': 'অ্যাকাউন্ট অডিট',
  'menu.disputes': 'অভিযোগ',
  'menu.liveChat': 'লাইভ চ্যাট',
  'menu.postProduct': 'পণ্য যোগ করুন',
  'menu.myProducts': 'আমার পণ্য',
  'menu.createCampaign': 'ক্যাম্পেইন তৈরি',
  'menu.fulfillment': 'অর্ডার ফুলফিলমেন্ট',
  'menu.analytics': 'অ্যানালিটিক্স',
  'menu.inviteCreators': 'ক্রিয়েটর আমন্ত্রণ',
  'menu.creatorAudit': 'ক্রিয়েটর অডিট',
  'menu.brandReputation': 'ব্র্যান্ড রেপুটেশন',
  'menu.companyProfile': 'কোম্পানি প্রোফাইল',
  'menu.payouts': 'ক্রিয়েটর পেআউট',
  'menu.fraud': 'ফ্রড রিভিউ',

  'page.catalog.title': 'শপ ক্যাটালগ ও ক্যাটাগরি ফিল্টার',
  'page.catalog.subtitle': 'পণ্য দেখুন, নিজের কনটেন্ট শেয়ার করে যাচাইকৃত ক্যাশব্যাক আয় করুন',
  'page.orders.title': 'আমার অর্ডার',
  'page.orders.subtitle': 'অর্ডার ট্র্যাক করুন, পোস্ট দিয়ে ক্যাশব্যাক আয় করুন',
  'page.wallet.title': 'ওয়ালেট',
  'page.wallet.subtitle': 'আপনার ক্যাশব্যাক দেখুন, যেকোনো সময় তুলে নিন',
  'page.wishlist.title': 'উইশলিস্ট',
  'page.wishlist.subtitle': 'আপনার সেভ করা পণ্য। বাজেট বদলায় — অর্ডারের আগে ক্যাশব্যাক দেখে নিন।',

  'wallet.totalEarnings': 'মোট আয়',
  'wallet.pendingEscrow': 'অপেক্ষমাণ এসক্রো',
  'wallet.available': 'উত্তোলনযোগ্য ব্যালেন্স',
  'wallet.withdraw': 'টাকা তুলুন',
  'wallet.addCash': 'টাকা যোগ করুন',
  'wallet.transactions': 'লেনদেনের ইতিহাস',
  'wallet.payoutMethod': 'পেআউট মাধ্যম',
  'wallet.requestWithdrawal': 'উত্তোলনের অনুরোধ',

  'common.save': 'সংরক্ষণ',
  'common.cancel': 'বাতিল',
  'common.loading': 'লোড হচ্ছে…',
  'common.search': 'খুঁজুন',
  'common.all': 'সব',
  'common.retry': 'আবার চেষ্টা করুন',
  'common.language': 'ভাষা',
}

export const DICTIONARIES = { en, bn }

/** Look a key up with an English fallback, then fill {placeholders}. */
export function translate(lang, key, vars) {
  const raw = DICTIONARIES[lang]?.[key] ?? DICTIONARIES.en[key] ?? key
  if (!vars) return raw
  return Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, String(v)), raw)
}
