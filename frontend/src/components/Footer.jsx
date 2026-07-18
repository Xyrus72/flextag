import React from 'react'
import { Link } from 'react-router-dom'

const Footer = () => (
  <footer className="relative z-20 border-t border-white/5 bg-[#030303] py-12 px-6 overflow-hidden">
    {/* Top gradient line */}
    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 blur-md opacity-30 group-hover:opacity-60 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center text-white font-black text-sm italic">F</div>
          </div>
          <div>
            <span className="text-lg font-black italic tracking-tighter text-white group-hover:text-orange-400 transition-colors">FlexTag™</span>
            <p className="text-[9px] text-orange-500/60 uppercase tracking-[0.2em] leading-none">Shop · Share · Earn</p>
          </div>
        </Link>

        {/* Links */}
        <div className="flex flex-wrap items-center gap-6">
          {['Home', 'How It Works', 'For Brands', 'Catalog'].map(l => (
            <a key={l} href="/"
              className="text-[10px] text-zinc-600 hover:text-zinc-300 uppercase tracking-[0.15em] transition-colors">
              {l}
            </a>
          ))}
        </div>

        {/* Social icons */}
        <div className="flex items-center gap-3">
          {[
            { label: 'Instagram', path: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z' },
            { label: 'TikTok',   path: 'M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5' },
            { label: 'Facebook', path: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
          ].map(s => (
            <button key={s.label}
              className="w-9 h-9 rounded-full border border-white/8 flex items-center justify-center text-zinc-600 hover:text-white hover:border-orange-500/40 hover:bg-orange-500/5 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={s.path} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/[0.04] mb-6" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} FlexTag™ · Bangladesh · All Rights Reserved
        </p>
        <div className="flex items-center gap-6">
          {['Privacy Policy', 'Terms of Service', 'Contact'].map(l => (
            <span key={l} className="text-[10px] text-zinc-700 hover:text-zinc-400 cursor-pointer uppercase tracking-[0.15em] transition-colors">{l}</span>
          ))}
        </div>
      </div>
    </div>
  </footer>
)

export default Footer
