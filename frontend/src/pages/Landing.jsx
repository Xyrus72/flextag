import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'

/* ─── Particle Canvas ─────────────────────────────────────────────────────── */
const ParticleCanvas = () => {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let raf, W, H
    const particles = []
    const COUNT = 90
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        o: Math.random() * 0.5 + 0.15,
        hue: 20 + Math.random() * 30
      })
    }
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${p.o})`
        ctx.fill()
        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x, dy = p.y - q.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `hsla(25, 90%, 65%, ${0.06 * (1 - dist / 130)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="fixed inset-0 z-0 pointer-events-none" />
}

/* ─── Tilt Card ───────────────────────────────────────────────────────────── */
const TiltCard = ({ children, className = '', depth = 20 }) => {
  const ref = useRef(null)
  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width - 0.5) * depth
    const y = ((e.clientY - r.top) / r.height - 0.5) * -depth
    el.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${y}deg) translateZ(10px)`
    el.style.boxShadow = `${-x * 0.5}px ${y * 0.5}px 40px rgba(255,120,50,0.15)`
  }, [depth])
  const onLeave = useCallback(() => {
    const el = ref.current; if (!el) return
    el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0)'
    el.style.boxShadow = ''
  }, [])
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ transition: 'transform 0.08s ease, box-shadow 0.08s ease', willChange: 'transform' }}
      className={className}>
      {children}
    </div>
  )
}

/* ─── Scroll Reveal ───────────────────────────────────────────────────────── */
const Reveal = ({ children, delay = 0, className = '', dir = 'up' }) => {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold: 0.15 })
    if (ref.current) ob.observe(ref.current)
    return () => ob.disconnect()
  }, [])
  const transforms = { up: 'translateY(40px)', down: 'translateY(-40px)', left: 'translateX(-40px)', right: 'translateX(40px)' }
  return (
    <div ref={ref} className={className}
      style={{ transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
        opacity: vis ? 1 : 0, transform: vis ? 'none' : (transforms[dir] || 'translateY(40px)') }}>
      {children}
    </div>
  )
}

/* ─── 3D Floating Ring ────────────────────────────────────────────────────── */
const Ring3D = () => (
  <div className="relative w-56 h-56 mx-auto" style={{ perspective: '600px' }}>
    {[...Array(4)].map((_, i) => (
      <div key={i} className="absolute inset-0 rounded-full border border-orange-500/20"
        style={{
          animation: `spin3d ${8 + i * 3}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
          transform: `rotateX(${i * 45}deg) rotateY(${i * 30}deg)`,
          boxShadow: i === 0 ? '0 0 30px rgba(255,120,50,0.2)' : 'none'
        }} />
    ))}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-3xl shadow-2xl shadow-orange-500/40"
        style={{ animation: 'floatY 3s ease-in-out infinite' }}>
        💰
      </div>
    </div>
  </div>
)

/* ─── Animated Counter ────────────────────────────────────────────────────── */
const Counter = ({ target, suffix = '', prefix = '', duration = 1800 }) => {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const num = parseFloat(target.replace(/[^0-9.]/g, ''))
        const start = performance.now()
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setVal(Math.floor(ease * num))
          if (p < 1) requestAnimationFrame(tick)
          else setVal(num)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    if (ref.current) ob.observe(ref.current)
    return () => ob.disconnect()
  }, [target, duration])
  return <span ref={ref}>{prefix}{typeof val === 'number' && val < 1000 && target.includes('.') ? val.toFixed(1) : val.toLocaleString()}{suffix}</span>
}

/* ─── 3D Card Stack (hero right side) ────────────────────────────────────── */
const HeroCardStack = () => {
  const cards = [
    { bg: 'from-orange-600/20 to-pink-600/10', zIdx: 3, rot: 'rotateY(-6deg) rotateX(4deg)', tx: '0px', tz: '0px', delay: '0s', emoji: '🏆', label: 'Cashback Earned', val: '৳18,400', sub: 'Gold Creator · @tasnim' },
    { bg: 'from-blue-600/15 to-violet-600/10', zIdx: 2, rot: 'rotateY(-8deg) rotateX(6deg)', tx: '20px', tz: '-60px', delay: '0.3s', emoji: '📈', label: 'Campaign ROI', val: '4.8×', sub: 'Brand average this month' },
    { bg: 'from-emerald-600/15 to-teal-600/10', zIdx: 1, rot: 'rotateY(-10deg) rotateX(8deg)', tx: '40px', tz: '-120px', delay: '0.6s', emoji: '✅', label: 'Cashback Released', val: '৳2,340', sub: 'Post approved instantly' },
  ]
  return (
    <div className="relative h-80 w-full" style={{ perspective: '1000px', perspectiveOrigin: '40% 50%' }}>
      {cards.map((c, i) => (
        <div key={i} className={`absolute inset-0 rounded-3xl border border-white/10 bg-gradient-to-br ${c.bg} backdrop-blur-xl p-6 flex flex-col justify-between`}
          style={{
            transform: c.rot,
            translateX: c.tx,
            translateZ: c.tz,
            zIndex: c.zIdx,
            animation: `floatCard ${3 + i}s ease-in-out ${c.delay} infinite alternate`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">{c.emoji}</div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest">{c.label}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{c.val}</p>
            <p className="text-xs text-zinc-500 mt-1">{c.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Steps 3D ────────────────────────────────────────────────────────────── */
const steps = [
  { n: '01', title: 'Shop', desc: 'Browse curated brand products and purchase what you love from our verified catalog.', icon: '🛍️', color: 'from-orange-500/20 to-amber-500/10', glow: '255,150,50' },
  { n: '02', title: 'Share', desc: 'Create authentic Reels, Stories, or posts featuring the product on your socials.', icon: '📱', color: 'from-pink-500/20 to-rose-500/10', glow: '255,80,150' },
  { n: '03', title: 'Earn', desc: 'AI verifies your post. Once approved, cashback lands in your wallet instantly.', icon: '💸', color: 'from-emerald-500/20 to-teal-500/10', glow: '50,200,150' },
]

const tiers = [
  { name: 'Bronze', icon: '🥉', range: '1K–5K', cashback: '30–40%', color: 'from-amber-900/30 to-amber-700/10', border: 'border-amber-700/30', glow: '180,100,30' },
  { name: 'Silver', icon: '🥈', range: '5K–10K', cashback: '40–55%', color: 'from-zinc-600/30 to-zinc-400/10', border: 'border-zinc-500/30', glow: '150,150,180' },
  { name: 'Gold', icon: '🥇', range: '10K–50K', cashback: '55–65%', color: 'from-yellow-500/30 to-amber-400/10', border: 'border-yellow-500/40', glow: '255,200,50', highlight: true },
  { name: 'Diamond', icon: '💎', range: '50K+', cashback: '65–70%', color: 'from-cyan-500/30 to-blue-500/10', border: 'border-cyan-500/30', glow: '50,200,255' },
]

const testimonials = [
  { quote: 'I earned ৳18,000 in just one month posting products I genuinely love. This is the future of creator monetization.', name: 'Tasnim Rahman', role: 'Gold Creator · 12K followers', img: 'T', color: 'from-orange-500 to-pink-600' },
  { quote: 'The ROI from Flextag creators is 4× better than our old agency campaigns. Zero ad waste, real engagement.', name: 'GlowUp Cosmetics', role: 'Brand Partner', img: 'G', color: 'from-emerald-500 to-teal-600' },
  { quote: 'The cashback verification is seamless. Post it, tag it, get paid. No chasing anyone ever.', name: 'Priya Das', role: 'Diamond Creator · 58K followers', img: 'P', color: 'from-violet-500 to-blue-600' },
]

/* ─── MAIN LANDING ────────────────────────────────────────────────────────── */
const Landing = () => {
  const [price, setPrice] = useState(1200)
  const [cashback, setCashback] = useState(55)
  const netEarn = Math.round(price * cashback / 100)
  const mousePos = useRef({ x: 0, y: 0 })
  const heroRef = useRef(null)

  // Parallax hero background
  useEffect(() => {
    const onMove = e => { mousePos.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div className="relative bg-[#050505] text-zinc-300 overflow-x-hidden">
      {/* Global keyframes */}
      <style>{`
        @keyframes floatY {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(2deg); }
        }
        @keyframes floatCard {
          from { transform: rotateY(-6deg) rotateX(4deg) translateY(0px); }
          to   { transform: rotateY(-4deg) rotateX(6deg) translateY(-12px); }
        }
        @keyframes spin3d {
          from { transform: rotateX(60deg) rotateZ(0deg); }
          to   { transform: rotateX(60deg) rotateZ(360deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(90px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(90px) rotate(-360deg); }
        }
        @keyframes orbitReverse {
          from { transform: rotate(0deg) translateX(65px) rotate(0deg); }
          to   { transform: rotate(-360deg) translateX(65px) rotate(360deg); }
        }
        @keyframes pulse3d {
          0%,100% { transform: scale(1); opacity: 0.6; }
          50%      { transform: scale(1.15); opacity: 1; }
        }
        @keyframes gradShift {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #ff6b35, #ff9a3c, #fff, #ff9a3c, #ff6b35);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .glow-orb {
          background: radial-gradient(circle, rgba(255,120,50,0.15) 0%, transparent 70%);
          animation: pulse3d 4s ease-in-out infinite;
        }
        .grad-animate {
          background: linear-gradient(270deg, #ff6b35, #ff3ca0, #7c3aed, #ff6b35);
          background-size: 300% 300%;
          animation: gradShift 5s ease infinite;
        }
      `}</style>

      <ParticleCanvas />

      {/* ── Ambient orbs ─────────────────────────────────────────────────── */}
      <div className="fixed top-1/4 left-1/4 w-[600px] h-[600px] rounded-full glow-orb pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(150,50,255,0.08) 0%, transparent 70%)', animation: 'pulse3d 6s ease-in-out 2s infinite' }} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center px-6 pt-20 pb-16 z-10 overflow-hidden">
        {/* Grid overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Left */}
          <div className="space-y-8">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/5 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs text-orange-400 font-medium uppercase tracking-[0.15em]">Nano & Micro Influencer Platform</span>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="text-[clamp(52px,9vw,110px)] font-black tracking-tighter uppercase italic leading-[0.9]">
                <span className="shimmer-text">FLEX</span>
                <br />
                <span className="text-white">TAG™</span>
              </h1>
              <p className="text-[clamp(20px,3vw,36px)] font-light text-zinc-500 tracking-tight mt-3">
                Shop. Share.<br />
                <span className="text-zinc-300">Earn Cashback.</span>
              </p>
            </Reveal>

            <Reveal delay={200}>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">
                The creator-powered e-commerce platform where nano & micro-influencers earn
                <span className="text-orange-400 font-semibold"> 30–70% cashback</span> by shopping and sharing products they genuinely love.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="flex flex-wrap gap-4">
                <Link to="/register"
                  className="relative group overflow-hidden px-8 py-3.5 rounded-full text-sm font-bold uppercase tracking-widest text-black">
                  <div className="absolute inset-0 grad-animate rounded-full" />
                  <span className="relative z-10 text-white">Start Earning →</span>
                </Link>
                <Link to="/register?role=brand"
                  className="px-8 py-3.5 rounded-full text-xs font-medium uppercase tracking-widest border border-white/10 text-zinc-300 hover:border-orange-500/50 hover:text-orange-400 transition-all backdrop-blur-md">
                  List Your Brand
                </Link>
              </div>
            </Reveal>

            {/* Orbit graphic */}
            <Reveal delay={400}>
              <div className="flex items-center gap-8 pt-4">
                <div className="relative w-48 h-12">
                  {/* Micro orbit system */}
                  <div className="absolute left-0 top-0 flex -space-x-3">
                    {['T','P','A','R','N'].map((l, i) => (
                      <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-600 border-2 border-[#050505] flex items-center justify-center text-white text-xs font-bold"
                        style={{ transform: `translateZ(${i * 2}px)` }}>
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Join <span className="text-white font-semibold">12,400+</span> creators already earning</p>
              </div>
            </Reveal>
          </div>

          {/* Right — 3D Card Stack */}
          <Reveal delay={150} dir="left" className="hidden lg:block">
            <TiltCard className="rounded-3xl" depth={12}>
              <HeroCardStack />
            </TiltCard>
          </Reveal>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none z-20" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STATS BAR                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 border-y border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { value: '12400', suffix: '+', prefix: '', label: 'Active Creators' },
            { value: '34', suffix: 'M+', prefix: '৳', label: 'Cashback Paid' },
            { value: '48', suffix: '+', prefix: '', label: 'Brand Partners' },
            { value: '4.8', suffix: '×', prefix: '', label: 'Avg Brand ROI' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="text-center">
              <p className="text-3xl lg:text-5xl font-black text-white tracking-tighter">
                <Counter target={s.value} suffix={s.suffix} prefix={s.prefix} />
              </p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mt-2">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS — 3D Cards                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6 border-b border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <Reveal className="space-y-3">
              <p className="text-xs text-orange-500 uppercase tracking-[0.2em] font-medium">How It Works</p>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-tight">
                Three Steps to<br />
                <span className="text-zinc-600 italic font-light">Consistent Earnings</span>
              </h2>
            </Reveal>
            <Reveal delay={100} className="max-w-xs">
              <p className="text-sm text-zinc-500 leading-relaxed">
                No complex contracts, no upfront fees. Purchase, post, and get paid within 24 hours.
              </p>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-3 gap-6" style={{ perspective: '1200px' }}>
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120} dir="up">
                <TiltCard depth={15}
                  className={`h-full rounded-3xl border border-white/8 bg-gradient-to-br ${s.color} backdrop-blur-xl p-8 md:p-10 overflow-hidden relative group`}>
                  {/* Glow bg */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle, rgba(${s.glow},0.2) 0%, transparent 70%)` }} />
                  {/* Number */}
                  <div className="absolute top-6 right-8 text-7xl font-black text-white/4 select-none">{s.n}</div>

                  <div className="relative z-10 space-y-8 h-full flex flex-col justify-between">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl"
                      style={{ animation: `floatY ${3 + i * 0.5}s ease-in-out ${i * 0.4}s infinite` }}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-3 mb-3">
                        <span className="text-[10px] text-orange-500 font-bold tracking-widest uppercase">{s.n}</span>
                        <h3 className="text-2xl font-black text-white tracking-tight">{s.title}</h3>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EARNINGS CALCULATOR — 3D Center piece                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-40 px-6 border-b border-white/5 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(255,120,50,0.06) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-16">
          <Reveal>
            <Ring3D />
          </Reveal>

          <Reveal delay={100}>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-tight">
              Calculate Your<br />
              <span className="shimmer-text italic">Earnings</span>
            </h2>
            <p className="text-sm text-zinc-500 mt-4 max-w-md mx-auto leading-relaxed">
              See exactly how much cashback you can earn per campaign.
            </p>
          </Reveal>

          <Reveal delay={200}>
            <TiltCard depth={8}
              className="rounded-3xl border border-white/8 bg-white/[0.02] backdrop-blur-2xl p-8 md:p-12 text-left space-y-8 max-w-2xl mx-auto">
              {[
                { label: 'Product Price (৳)', value: price, setter: setPrice, min: 200, max: 5000, step: 100, display: `৳${price.toLocaleString()}` },
                { label: 'Cashback Rate', value: cashback, setter: setCashback, min: 30, max: 70, step: 5, display: `${cashback}%` },
              ].map(f => (
                <div key={f.label}>
                  <div className="flex justify-between mb-4">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest font-medium">{f.label}</label>
                    <span className="text-sm font-black text-white">{f.display}</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full grad-animate transition-all"
                      style={{ width: `${((f.value - f.min) / (f.max - f.min)) * 100}%` }} />
                    <input type="range" min={f.min} max={f.max} step={f.step} value={f.value}
                      onChange={e => f.setter(Number(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-zinc-700">{f.min}</span>
                    <span className="text-[10px] text-zinc-700">{f.max}</span>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">You Earn Per Campaign</p>
                  <p className="text-5xl font-black text-emerald-400 mt-1">৳{netEarn.toLocaleString()}</p>
                  <p className="text-xs text-zinc-600 mt-1">You actually pay: ৳{(price - netEarn).toLocaleString()}</p>
                </div>
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl"
                  style={{ animation: 'floatY 2.5s ease-in-out infinite' }}>
                  🏆
                </div>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CREATOR TIERS — 3D perspective row                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto space-y-16">
          <Reveal>
            <p className="text-xs text-orange-500 uppercase tracking-[0.2em] font-medium mb-3">Creator Tiers</p>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white">
              Grow Through the<br />
              <span className="text-zinc-600 italic font-light">Flextag Ranks</span>
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tiers.map((t, i) => (
              <Reveal key={t.name} delay={i * 100} dir="up">
                <TiltCard depth={18}
                  className={`relative rounded-3xl border bg-gradient-to-br ${t.color} ${t.border} p-8 overflow-hidden ${t.highlight ? 'ring-1 ring-yellow-500/40' : ''}`}>
                  {t.highlight && (
                    <div className="absolute -top-px inset-x-8 h-px grad-animate" />
                  )}
                  {/* Glow */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
                    style={{ boxShadow: `inset 0 0 40px rgba(${t.glow},0.1)` }} />

                  {t.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-[9px] text-yellow-400 font-black uppercase tracking-widest whitespace-nowrap">Most Popular</div>}

                  <div className="relative z-10">
                    <div className="text-5xl mb-6" style={{ animation: `floatY ${3.5 + i * 0.4}s ease-in-out ${i * 0.5}s infinite` }}>{t.icon}</div>
                    <p className="text-xl font-black text-white tracking-tight">{t.name}</p>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1 mb-6">{t.range} followers</p>
                    <div className="h-px bg-white/5 mb-6" />
                    <p className="text-3xl font-black shimmer-text">{t.cashback}</p>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">cashback rate</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOR BRANDS                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6 border-b border-white/5 overflow-hidden">
        {/* Decorative 3D cube lines */}
        <div className="absolute right-10 top-20 w-64 h-64 pointer-events-none opacity-10" style={{ perspective: '400px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="absolute inset-0 border border-orange-500/50 rounded-xl"
              style={{ transform: `rotateX(${30 + i * 15}deg) rotateY(${20 + i * 10}deg) scale(${0.7 + i * 0.15})`, animation: `spin3d ${10 + i * 5}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}` }} />
          ))}
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <Reveal>
              <div className="flex items-center gap-4 mb-2">
                <span className="w-10 h-px bg-orange-500" />
                <p className="text-xs text-zinc-500 uppercase tracking-[0.2em]">For Brands</p>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white leading-tight">
                Zero Ad Waste.<br />
                <span className="text-zinc-600 italic font-light">Maximum Authentic Reach.</span>
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">
                Traditional influencer campaigns cost ৳50K–60K upfront with no ROI guarantee. Flextag flips the script — you only pay when authenticated content goes live.
              </p>
            </Reveal>
            <div className="space-y-4">
              {[
                'Performance-based: pay only for verified posts',
                'AI-powered content authentication via Meta API',
                'Set budget caps — campaigns auto-close on limit',
                'Private campaigns with hand-picked creator invites',
              ].map((f, i) => (
                <Reveal key={f} delay={i * 80} dir="left">
                  <div className="flex items-center gap-3 group">
                    <div className="w-5 h-5 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/25 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p className="text-sm text-zinc-400">{f}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={400}>
              <Link to="/register?role=brand"
                className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-orange-400 border-b border-orange-400/30 pb-1 hover:border-orange-400 transition-all">
                Apply as Brand Partner
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </Reveal>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Cost Per Post', value: '৳380', sub: 'vs ৳12K+ agency avg', green: true },
              { label: 'Avg Brand ROI', value: '4.8×', sub: '+0.3 vs last quarter', green: true },
              { label: 'Active Campaigns', value: '48', sub: 'Across all brands', green: false },
              { label: 'Creator Network', value: '12,400+', sub: 'Verified influencers', green: false },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 100} dir="right">
                <TiltCard depth={14}
                  className="rounded-3xl border border-white/8 bg-white/[0.02] backdrop-blur-xl p-6 hover:border-white/15 transition-all">
                  <p className={`text-3xl font-black mb-2 ${s.green ? 'text-emerald-400' : 'text-white'}`}>{s.value}</p>
                  <p className="text-xs text-zinc-400 font-medium">{s.label}</p>
                  <p className="text-[10px] text-zinc-700 mt-1">{s.sub}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TESTIMONIALS                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto space-y-20">
          <Reveal>
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <p className="text-zinc-600 text-4xl">"</p>
              <p className="text-2xl md:text-3xl font-light text-zinc-300 leading-relaxed">
                I earned ৳34,000 in my first two months — just by posting products I'd buy anyway. Flextag changed my definition of passive income.
              </p>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-widest">Ayesha Karim</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mt-1">Diamond Creator · 58K Followers</p>
              </div>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 120}>
                <TiltCard depth={16}
                  className="rounded-3xl border border-white/8 bg-white/[0.02] backdrop-blur-xl p-7 hover:border-white/15 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
                    style={{ background: `linear-gradient(135deg, rgba(255,107,53,0.04) 0%, transparent 60%)` }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                        {t.img}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{t.name}</p>
                        <p className="text-[10px] text-zinc-600">{t.role}</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">"{t.quote}"</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FINAL CTA                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-32 px-6 overflow-hidden">
        {/* Animated gradient bg */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 grad-animate blur-3xl" />
        </div>

        <Reveal>
          <div className="max-w-7xl mx-auto">
            <TiltCard depth={6}
              className="rounded-[2.5rem] border border-white/8 bg-white/[0.02] backdrop-blur-2xl p-8 md:p-16 overflow-hidden relative">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-32 h-32 border-t border-l border-orange-500/20 rounded-tl-[2.5rem]" />
              <div className="absolute bottom-0 right-0 w-32 h-32 border-b border-r border-orange-500/20 rounded-br-[2.5rem]" />

              <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
                <div className="space-y-8">
                  <div>
                    <p className="text-xs text-orange-500 uppercase tracking-[0.2em] font-medium mb-3">Get Started</p>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-tight">
                      Start Your<br />
                      <span className="shimmer-text italic">Earning Journey</span>
                    </h2>
                    <p className="text-sm text-zinc-500 mt-4 leading-relaxed max-w-md">
                      Join thousands of creators already earning. No minimum beyond 1,000 followers.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[{ e: '📱', t: 'Instagram · TikTok · YouTube' }, { e: '🌐', t: 'Available across Bangladesh' }, { e: '💳', t: 'Instant bKash withdrawal' }].map(i => (
                      <div key={i.t} className="flex items-center gap-3">
                        <span className="text-lg">{i.e}</span>
                        <span className="text-sm text-zinc-400">{i.t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/8 bg-black/40 p-8 space-y-5 backdrop-blur-xl">
                  <h3 className="text-lg font-black text-white">Quick Start</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/register?role=creator"
                      className="group p-5 rounded-2xl border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/40 transition-all text-center">
                      <p className="text-2xl mb-2" style={{ animation: 'floatY 3s ease-in-out infinite' }}>🎯</p>
                      <p className="text-xs font-black text-white uppercase tracking-widest">Creator</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Shop & earn</p>
                    </Link>
                    <Link to="/register?role=brand"
                      className="group p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all text-center">
                      <p className="text-2xl mb-2" style={{ animation: 'floatY 3.5s ease-in-out 0.5s infinite' }}>🏢</p>
                      <p className="text-xs font-black text-white uppercase tracking-widest">Brand</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Launch campaigns</p>
                    </Link>
                  </div>
                  <Link to="/register"
                    className="block w-full text-center py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white relative overflow-hidden group">
                    <div className="absolute inset-0 grad-animate" />
                    <span className="relative z-10">Create Free Account</span>
                  </Link>
                  <p className="text-center text-[10px] text-zinc-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-orange-500 hover:text-orange-400">Sign in</Link>
                  </p>
                </div>
              </div>
            </TiltCard>
          </div>
        </Reveal>
      </section>

      {/* Footer strip */}
      <div className="relative z-10 border-t border-white/5 py-8 px-6 text-center">
        <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em]">© 2026 FlexTag™ · Bangladesh · All Rights Reserved</p>
      </div>
    </div>
  )
}

export default Landing
