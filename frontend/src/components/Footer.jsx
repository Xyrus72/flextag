import React from 'react'
import { Link } from 'react-router-dom'

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'How It Works', href: '/#how-it-works' },
      { label: 'Shop Catalog', href: '/creator/catalog' },
      { label: 'Leaderboard', href: '/creator/leaderboard' },
      { label: 'Creator Signup', href: '/register' },
    ],
  },
  {
    title: 'For Brands',
    links: [
      { label: 'Launch a Campaign', href: '/register?role=brand' },
      { label: 'Brand Dashboard', href: '/brand' },
      { label: 'Pricing & Fees', href: '/#for-brands' },
      { label: 'Success Stories', href: '/#testimonials' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center / FAQ', href: '/support/faq' },
      { label: 'Live Chat', href: '/support/chat' },
      { label: 'Submit a Ticket', href: '/support/tickets' },
      { label: 'Contact Us', href: '/#contact' },
    ],
  },
]

const SOCIALS = [
  { label: 'Instagram', path: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z' },
  { label: 'TikTok', path: 'M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5' },
  { label: 'Facebook', path: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
  { label: 'YouTube', path: 'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z M9.75 15.02l5.75-3.27-5.75-3.27v6.54z' },
]

const Footer = () => (
  <footer id="contact" className="relative z-20 border-t border-white/5 bg-[#030614] pt-16 pb-8 px-6 overflow-hidden">
    {/* Top gradient line */}
    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
    {/* Ambient glow */}
    <div
      className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none blur-3xl opacity-20"
      style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.5) 0%, transparent 70%)' }}
    />

    <div className="max-w-7xl mx-auto relative">
      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
        {/* Brand column (spans 2) */}
        <div className="lg:col-span-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group mb-5">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center text-white font-black text-sm italic">F</div>
            </div>
            <div>
              <span className="text-lg font-black italic tracking-tighter text-white group-hover:text-violet-300 transition-colors">FlexTag™</span>
              <p className="text-[9px] text-violet-400/60 uppercase tracking-[0.2em] leading-none">Shop · Share · Earn</p>
            </div>
          </Link>
          <p className="text-[13px] text-white/35 leading-relaxed max-w-xs mb-6">
            Bangladesh's creator-commerce platform. Nano & micro-influencers shop
            products, share authentic content, and earn 30–70% cashback — with
            escrow-protected payouts for everyone.
          </p>
          {/* Socials */}
          <div className="flex items-center gap-3">
            {SOCIALS.map(s => (
              <a
                key={s.label}
                href="/"
                aria-label={s.label}
                onClick={e => e.preventDefault()}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-violet-500/50 hover:bg-violet-500/10 hover:shadow-[0_0_16px_rgba(124,58,237,0.25)] transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {COLUMNS.map(col => (
          <div key={col.title}>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] mb-4">{col.title}</p>
            <ul className="space-y-2.5">
              {col.links.map(l => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[13px] text-white/35 hover:text-violet-300 transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Payment strip ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5 border-y border-white/[0.05] mb-6">
        <p className="text-[10px] text-white/25 uppercase tracking-[0.2em]">Payouts powered by</p>
        <div className="flex items-center gap-5">
          <img src="/products/bkash-logo.svg" alt="bKash" className="h-5 opacity-50 hover:opacity-90 transition-opacity" />
          <img src="/products/nagad-logo.svg" alt="Nagad" className="h-5 opacity-50 hover:opacity-90 transition-opacity" />
          <img src="/products/brac-bank.png" alt="BRAC Bank" className="h-5 opacity-50 hover:opacity-90 transition-opacity" />
        </div>
        <p className="text-[10px] text-white/25 uppercase tracking-[0.2em]">🔒 Escrow-protected payments</p>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} FlexTag™ · Dhaka, Bangladesh · All Rights Reserved
        </p>
        <div className="flex items-center gap-6">
          {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map(l => (
            <span key={l} className="text-[10px] text-white/20 hover:text-white/50 cursor-pointer uppercase tracking-[0.15em] transition-colors">{l}</span>
          ))}
        </div>
      </div>
    </div>
  </footer>
)

export default Footer
