import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const stats = [
  { value: '12,400+', label: 'Active Creators' },
  { value: '৳34M+', label: 'Cashback Paid' },
  { value: '48+', label: 'Brand Partners' },
  { value: '4.8x', label: 'Avg Brand ROI' },
]

const steps = [
  { n: '01', title: 'Shop', desc: 'Browse participating brand products and purchase what you love from our curated catalog.', icon: '🛍️' },
  { n: '02', title: 'Share', desc: 'Create authentic content — Reels, Stories or posts — featuring the product on your social channel.', icon: '📱' },
  { n: '03', title: 'Earn', desc: 'Our AI auditor verifies your post. Once approved, cashback lands in your wallet instantly.', icon: '💸' },
]

const tiers = [
  { name: 'Bronze', icon: '🥉', min: '1K', max: '5K', cashback: '30–40%', color: 'from-amber-800/20 to-amber-700/10', border: 'border-amber-700/20', text: 'text-amber-600' },
  { name: 'Silver', icon: '🥈', min: '5K', max: '10K', cashback: '40–55%', color: 'from-zinc-500/20 to-zinc-400/10', border: 'border-zinc-500/20', text: 'text-zinc-400' },
  { name: 'Gold', icon: '🥇', min: '10K', max: '50K', cashback: '55–65%', color: 'from-yellow-500/20 to-yellow-400/10', border: 'border-yellow-500/20', text: 'text-yellow-400', highlight: true },
  { name: 'Diamond', icon: '💎', min: '50K+', max: '', cashback: '65–70%', color: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
]

const testimonials = [
  { quote: 'I earned ৳18,000 in just one month posting products I genuinely love. This is the future of creator monetization.', name: 'Tasnim Rahman', role: 'Gold Creator · 12K followers', img: 'T' },
  { quote: 'The ROI we see from Flextag creators is 4x better than our old agency campaigns. Zero ad waste.', name: 'GlowUp Cosmetics', role: 'Brand Partner', img: 'G' },
  { quote: 'The cashback verification is seamless. Post it, tag it, get paid. No chasing anyone.', name: 'Priya Das', role: 'Diamond Creator · 58K followers', img: 'P' },
]

const Landing = () => {
  const { login } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [followers, setFollowers] = useState(10000)
  const [cashback, setCashback] = useState(55)
  const [price, setPrice] = useState(1200)
  const netEarn = Math.round(price * cashback / 100)

  return (
    <div className={`relative overflow-x-hidden ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>

      {/* ── HERO ───────────────────────────────────────── */}
      <header className="relative pt-24 pb-32 px-6 min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-grid" />
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] pointer-events-none ${isDark ? 'bg-orange-500/8' : 'bg-orange-400/5'}`} />

        <div className="max-w-7xl mx-auto relative z-10 w-full flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <div className="w-full lg:w-3/5 space-y-10">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md ${isDark ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'}`}>
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className={`text-xs font-normal uppercase tracking-widest ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>Nano & Micro Influencer Platform</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight uppercase italic leading-[0.95]">
              <span className={`bg-gradient-to-br bg-clip-text text-transparent ${isDark ? 'from-white via-white to-zinc-500' : 'from-zinc-900 via-zinc-800 to-zinc-400'}`}>
                FLEX<br />TAG™
              </span>
              <span className={`text-3xl md:text-5xl lg:text-6xl not-italic font-light tracking-tight mt-4 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Shop. Share.<br />Earn Cashback.
              </span>
            </h1>

            <p className={`text-sm md:text-base font-light leading-relaxed max-w-xl ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              The creator-powered e-commerce platform where nano & micro-influencers earn 30–70% cashback by shopping and sharing products they genuinely love.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link to="/register"
                className="bg-white text-black text-xs font-medium uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-zinc-200 transition-all hover:scale-105">
                Start Earning
              </Link>
              <Link to="/register?role=brand"
                className="glass-panel text-white text-xs font-normal uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-white/10 transition-all flex items-center gap-2">
                List Your Brand
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
          </div>

          {/* Hero card */}
          <div className="w-full lg:w-2/5 hidden md:block relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-blue-500/10 rounded-[2rem] blur-2xl transform rotate-3 z-0" />
            <div className="relative z-10 glass-panel rounded-[2rem] p-4 transform transition-transform duration-700 hover:scale-[1.02]">
              <div className="rounded-[1.5rem] overflow-hidden p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg">T</div>
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>Tasnim Rahman</p>
                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Gold Creator · @tasnim.styles</p>
                  </div>
                  <span className="ml-auto px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-bold border border-yellow-500/20">🥇 Gold</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[{ l: 'Earned', v: '৳18,400' }, { l: 'Campaigns', v: '18' }, { l: 'Avg CB', v: '55%' }].map(s => (
                    <div key={s.l} className={`text-center p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
                      <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{s.v}</p>
                      <p className={`text-[10px] uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className={`p-4 rounded-xl flex items-center justify-between ${isDark ? 'bg-emerald-500/5 border border-emerald-500/15' : 'bg-emerald-50 border border-emerald-200/50'}`}>
                  <div>
                    <p className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Latest cashback</p>
                    <p className="text-xl font-bold text-emerald-400">৳2,340</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── STATS ──────────────────────────────────────── */}
      <section className={`py-12 px-6 border-y relative z-10 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-3xl lg:text-4xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{s.value}</p>
                <p className={`text-xs font-normal uppercase tracking-widest mt-2 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <section id="how-it-works" className={`py-32 px-6 relative z-10 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="space-y-4">
              <h2 className="text-sm font-normal tracking-widest text-orange-500 uppercase">How It Works</h2>
              <h3 className={`text-3xl md:text-5xl font-medium tracking-tight leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Three Steps to<br /><span className={isDark ? 'text-zinc-500 italic' : 'text-zinc-400 italic'}>Consistent Earnings</span>
              </h3>
            </div>
            <p className={`text-xs font-light leading-relaxed max-w-md ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              No complex contracts, no upfront fees. Just purchase, post, and get paid within 24 hours of content verification.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {steps.map(s => (
              <div key={s.n} className={`glass-panel rounded-3xl p-8 md:p-12 card-hover relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl transition-colors group-hover:opacity-100 opacity-0 bg-orange-500/5" />
                <div className="relative z-10 h-full flex flex-col justify-between space-y-12">
                  <span className="text-4xl">{s.icon}</span>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-orange-500 text-xs font-medium tracking-widest uppercase">{s.n}</span>
                      <h4 className={`text-2xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{s.title}</h4>
                    </div>
                    <p className={`text-sm font-light leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EARNINGS CALCULATOR ────────────────────────── */}
      <section className={`py-40 px-6 relative overflow-hidden border-b ${isDark ? 'border-white/5 bg-[#030303]' : 'border-black/5 bg-zinc-50/80'}`}>
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/8 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-12">
          <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full border animate-[spin_10s_linear_infinite] ${isDark ? 'border-white/10' : 'border-black/5'}`} />
            <div className={`absolute inset-2 rounded-full border animate-[spin_15s_linear_infinite_reverse] ${isDark ? 'border-white/5' : 'border-black/[0.03]'}`} />
            <div className="absolute inset-0 bg-orange-500/15 rounded-full blur-xl animate-pulse" />
            <div className={`relative w-16 h-16 glass-panel rounded-2xl shadow-2xl flex items-center justify-center transform rotate-45 cursor-pointer hover:bg-white/10 transition-colors`}>
              <span className="text-2xl -rotate-45">💰</span>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className={`text-4xl md:text-5xl lg:text-7xl font-medium tracking-tight leading-[1.1] ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Calculate Your<br />
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent italic">Earnings</span>
            </h2>
            <p className={`text-sm font-light max-w-lg mx-auto leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              See exactly how much cashback you can earn per campaign based on your product price and cashback rate.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-8 md:p-12 text-left space-y-8 max-w-2xl mx-auto">
            {[
              { label: 'Product Price (৳)', value: price, setter: setPrice, min: 200, max: 5000, step: 100, display: `৳${price.toLocaleString()}` },
              { label: `Cashback Rate: ${cashback}%`, value: cashback, setter: setCashback, min: 30, max: 70, step: 5, display: null },
            ].map(f => (
              <div key={f.label}>
                <div className="flex justify-between mb-3">
                  <label className={`text-xs uppercase tracking-widest font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{f.label}</label>
                  {f.display && <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{f.display}</span>}
                </div>
                <input type="range" min={f.min} max={f.max} step={f.step} value={f.value}
                  onChange={e => f.setter(Number(e.target.value))}
                  className="w-full accent-orange-500 h-1 rounded-full" />
                <div className="flex justify-between mt-1">
                  <span className={`text-[10px] ${isDark ? 'text-zinc-700' : 'text-zinc-400'}`}>{f.min}</span>
                  <span className={`text-[10px] ${isDark ? 'text-zinc-700' : 'text-zinc-400'}`}>{f.max}</span>
                </div>
              </div>
            ))}
            <div className={`p-6 rounded-2xl flex items-center justify-between ${isDark ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200/50'}`}>
              <div>
                <p className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>You earn per campaign</p>
                <p className="text-4xl font-bold text-emerald-400 mt-1">৳{netEarn.toLocaleString()}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>You pay only: ৳{(price - netEarn).toLocaleString()}</p>
              </div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-100'}`}>🏆</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CREATOR TIERS ──────────────────────────────── */}
      <section className={`py-32 px-6 relative z-10 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="space-y-4">
            <h2 className="text-sm font-normal tracking-widest text-orange-500 uppercase">Creator Tiers</h2>
            <h3 className={`text-3xl md:text-5xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Grow Through the<br /><span className={`${isDark ? 'text-zinc-500' : 'text-zinc-400'} italic`}>Flextag Ranks</span>
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map(t => (
              <div key={t.name} className={`relative glass-panel rounded-3xl p-8 card-hover bg-gradient-to-br ${t.color} border ${t.border} ${t.highlight ? 'ring-1 ring-yellow-500/30' : ''}`}>
                {t.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-[10px] text-yellow-400 font-bold uppercase tracking-widest whitespace-nowrap">Most Popular</div>}
                <div className="text-4xl mb-6">{t.icon}</div>
                <p className={`text-xl font-medium tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{t.name}</p>
                <p className={`text-xs uppercase tracking-widest mb-6 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{t.min}{t.max ? `–${t.max}` : ''} followers</p>
                <p className={`text-2xl font-bold ${t.text}`}>{t.cashback}</p>
                <p className={`text-[10px] uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>cashback rate</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR BRANDS ─────────────────────────────────── */}
      <section id="for-brands" className={`py-32 px-6 relative z-10 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <span className="w-8 h-[1px] bg-orange-500" />
                <h2 className={`text-xs font-normal tracking-[0.2em] uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>For Brands</h2>
              </div>
              <h3 className={`text-3xl md:text-5xl font-medium tracking-tight leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Zero Ad Waste.<br /><span className={`${isDark ? 'text-zinc-500' : 'text-zinc-400'} italic`}>Maximum Authentic Reach.</span>
              </h3>
              <p className={`text-sm font-light leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Traditional influencer campaigns cost ৳50K–60K upfront with no ROI guarantee. Flextag flips the script — you only pay when authenticated content goes live.
              </p>
              <div className="space-y-4 pt-4">
                {[
                  { icon: '✓', text: 'Performance-based: pay only for verified posts' },
                  { icon: '✓', text: 'AI-powered content authentication via Meta API' },
                  { icon: '✓', text: 'Set budget caps — campaigns auto-close on limit' },
                  { icon: '✓', text: 'Private campaigns with hand-picked creator invites' },
                ].map(f => (
                  <div key={f.text} className="flex items-start gap-3">
                    <span className="text-orange-500 font-bold text-sm mt-0.5">{f.icon}</span>
                    <p className={`text-sm font-light ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{f.text}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <Link to="/register?role=brand"
                  className={`inline-flex items-center gap-3 text-xs font-medium uppercase tracking-widest border-b pb-2 transition-colors ${isDark ? 'text-white border-white/20 hover:text-orange-400 hover:border-orange-400/50' : 'text-zinc-900 border-black/20 hover:text-orange-500 hover:border-orange-500/50'}`}>
                  Apply as Brand Partner
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Cost Per Post', value: '৳380', sub: 'vs ৳12K+ agency avg', good: true },
                { label: 'Avg Brand ROI', value: '4.8x', sub: '+0.3 vs last quarter', good: true },
                { label: 'Active Campaigns', value: '48', sub: 'Across all brands', good: false },
                { label: 'Creator Network', value: '12,400+', sub: 'Verified influencers', good: false },
              ].map(s => (
                <div key={s.label} className="glass-panel rounded-3xl p-6 card-hover">
                  <p className={`text-3xl font-bold mb-2 ${s.good ? 'text-emerald-400' : isDark ? 'text-white' : 'text-zinc-900'}`}>{s.value}</p>
                  <p className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{s.label}</p>
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────── */}
      <section className={`py-32 px-6 border-b relative ${isDark ? 'border-white/5 bg-gradient-to-b from-transparent to-black' : 'border-black/5 bg-gradient-to-b from-transparent to-white'}`}>
        <div className="max-w-7xl mx-auto space-y-24">
          <div className={`max-w-3xl mx-auto text-center space-y-8`}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={`mx-auto ${isDark ? 'text-white/20' : 'text-black/15'}`}><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
            <p className={`text-xl md:text-3xl font-light leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              "I earned ৳34,000 in my first two months — just by posting products I'd buy anyway. Flextag changed my definition of passive income."
            </p>
            <div className="space-y-1">
              <p className={`text-xs font-medium uppercase tracking-widest ${isDark ? 'text-white' : 'text-zinc-900'}`}>Ayesha Karim</p>
              <p className={`text-xs font-normal tracking-[0.2em] uppercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Diamond Creator · 58K Followers</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="glass-panel rounded-3xl p-6 card-hover">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white font-bold flex-shrink-0">{t.img}</div>
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{t.name}</p>
                    <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t.role}</p>
                  </div>
                </div>
                <p className={`text-sm font-light leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>"{t.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section id="contact" className={`py-32 px-6 relative overflow-hidden border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="glass-panel rounded-[2rem] p-8 md:p-16">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-xs font-normal tracking-[0.2em] text-orange-500 uppercase">Get Started</h2>
                  <h3 className={`text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    Start Your<br /><span className={`${isDark ? 'text-zinc-500' : 'text-zinc-400'} italic`}>Earning Journey</span>
                  </h3>
                  <p className={`text-sm font-light leading-relaxed max-w-md ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Join thousands of creators already earning with Flextag. No minimum following requirement beyond 1,000 followers.
                  </p>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: '📱', text: 'Instagram · TikTok · YouTube' },
                    { icon: '🌐', text: 'Available across Bangladesh' },
                    { icon: '💳', text: 'Instant bKash withdrawal' },
                  ].map(i => (
                    <div key={i.text} className="flex items-center gap-3">
                      <span>{i.icon}</span>
                      <span className={`text-sm font-light ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{i.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-3xl p-8 border ${isDark ? 'bg-black/40 border-white/5' : 'bg-white/80 border-black/5'}`}>
                <div className="space-y-6">
                  <h4 className={`text-lg font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Quick Start</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/register?role=creator"
                      className="p-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 text-center hover:bg-orange-500/10 transition-all group">
                      <p className="text-2xl mb-2">🎯</p>
                      <p className={`text-xs font-medium uppercase tracking-widest ${isDark ? 'text-white' : 'text-zinc-900'}`}>Creator</p>
                      <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Shop & earn</p>
                    </Link>
                    <Link to="/register?role=brand"
                      className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 text-center hover:bg-blue-500/10 transition-all group">
                      <p className="text-2xl mb-2">🏢</p>
                      <p className={`text-xs font-medium uppercase tracking-widest ${isDark ? 'text-white' : 'text-zinc-900'}`}>Brand</p>
                      <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Launch campaigns</p>
                    </Link>
                  </div>
                  <div className="pt-2">
                    <Link to="/register"
                      className="block w-full text-center py-3.5 rounded-xl bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-zinc-200 transition-all">
                      Create Free Account
                    </Link>
                    <p className={`text-center text-[10px] mt-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Already have an account? <Link to="/login" className="text-orange-500 hover:text-orange-400">Sign in</Link></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Landing
