import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import {
  motion, useScroll, useTransform, useMotionValue,
  useSpring, AnimatePresence, useInView, animate
} from 'framer-motion'
import { API_URL } from '../config'

// WebGL hero scene — lazy so three.js never blocks first paint
const Hero3D = lazy(() => import('../components/Hero3D'))

/* Deterministic pseudo-random in [0,1) keyed by index — keeps render pure (no Math.random in render) */
const rnd = (i, salt = 0) => { const x = Math.sin((i + 1) * 9301 + salt * 49297) * 233280; return x - Math.floor(x) }

/* ─── GLOBAL STYLES ────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #050816;
    --purple: #7c3aed;
    --cyan: #06b6d4;
    --pink: #ec4899;
    --glass: rgba(255,255,255,0.04);
    --glass-border: rgba(255,255,255,0.08);
  }

  html { scroll-behavior: smooth; }
  body { background: var(--bg); font-family: 'Inter', sans-serif; overflow-x: hidden; }

  @keyframes floatY {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-12px); }
  }
  @keyframes floatYSlow {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-6px); }
  }
  @keyframes orbitCW {
    from { transform: rotate(var(--start-angle)) translateX(var(--orbit-r)) rotate(calc(-1 * var(--start-angle))); }
    to   { transform: rotate(calc(var(--start-angle) + 360deg)) translateX(var(--orbit-r)) rotate(calc(-1 * (var(--start-angle) + 360deg))); }
  }
  @keyframes pulseRing {
    0%   { transform: scale(1); opacity: 0.5; }
    50%  { transform: scale(1.05); opacity: 0.8; }
    100% { transform: scale(1); opacity: 0.5; }
  }
  @keyframes marqueeX {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  .brand-marquee-track {
    display: flex;
    align-items: center;
    gap: 64px;
    width: max-content;
    animation: marqueeX 32s linear infinite;
  }
  .brand-marquee:hover .brand-marquee-track { animation-play-state: paused; }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes gradShift {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }
  @keyframes coinBurst {
    0%   { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-120px) scale(0.5); opacity: 0; }
  }
  @keyframes scanLine {
    0%   { top: 0%; }
    100% { top: 100%; }
  }
  @keyframes heartFloat {
    0%   { transform: translateY(0) scale(1); opacity: 0.9; }
    100% { transform: translateY(-200px) scale(0.5) rotate(15deg); opacity: 0; }
  }
  @keyframes connectionPulse {
    0%,100% { opacity: 0.2; }
    50%      { opacity: 0.6; }
  }
  @keyframes rotateSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes glowPulse {
    0%,100% { box-shadow: 0 0 40px rgba(124,58,237,0.3), 0 0 80px rgba(6,182,212,0.15); }
    50%      { box-shadow: 0 0 80px rgba(124,58,237,0.6), 0 0 160px rgba(6,182,212,0.3); }
  }
  @keyframes borderGlow {
    0%,100% { border-color: rgba(124,58,237,0.3); }
    50%      { border-color: rgba(6,182,212,0.5); }
  }
  @keyframes networkLine {
    0%   { stroke-dashoffset: 1000; opacity: 0; }
    50%  { opacity: 0.6; }
    100% { stroke-dashoffset: 0; opacity: 0; }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .shimmer-text {
    background: linear-gradient(90deg, #7c3aed, #06b6d4, #ec4899, #7c3aed);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
  }
  .grad-btn {
    background: linear-gradient(135deg, #7c3aed, #06b6d4);
    background-size: 200% 200%;
    animation: gradShift 3s ease infinite;
  }
  .glass-panel {
    background: rgba(255,255,255,0.03);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .neon-purple { color: #7c3aed; text-shadow: 0 0 20px rgba(124,58,237,0.8); }
  .neon-cyan   { color: #06b6d4; text-shadow: 0 0 20px rgba(6,182,212,0.8); }
`

/* ─── PARTICLE CANVAS ──────────────────────────────────────────────────────── */
const ParticleCanvas = ({ mouseX, mouseY }) => {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf, W, H
    const N = 120
    const particles = []
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * (window.innerWidth || 1920),
        y: Math.random() * (window.innerHeight || 1080),
        r: Math.random() * 1.8 + 0.2,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        o: Math.random() * 0.6 + 0.1,
        hue: Math.random() > 0.5 ? 270 : 190,
      })
    }
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const mx = mouseX.get(), my = mouseY.get()
      particles.forEach((p, i) => {
        // Slight attraction toward mouse
        const dx = mx - p.x, dy = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200) { p.vx += dx * 0.00002; p.vy += dy * 0.00002 }
        p.vx = Math.max(-0.5, Math.min(0.5, p.vx))
        p.vy = Math.max(-0.5, Math.min(0.5, p.vy))
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.o})`
        ctx.fill()
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const ex = p.x - q.x, ey = p.y - q.y
          const d2 = Math.sqrt(ex * ex + ey * ey)
          if (d2 < 110) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `hsla(${p.hue}, 80%, 70%, ${0.07 * (1 - d2 / 110)})`
            ctx.lineWidth = 0.4
            ctx.stroke()
          }
        }
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}

/* ─── PHONE MOCKUP ─────────────────────────────────────────────────────────── */
const PhoneMockup = ({ children, style = {}, className = '' }) => (
  <div className={className} style={{
    width: 220, height: 420,
    borderRadius: 36,
    background: 'linear-gradient(145deg, #1a1a2e, #0d0d1a)',
    border: '2px solid rgba(124,58,237,0.4)',
    boxShadow: '0 0 60px rgba(124,58,237,0.3), 0 0 120px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    ...style
  }}>
    {/* Notch */}
    <div style={{
      position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
      width: 60, height: 18, borderRadius: 10,
      background: '#0d0d1a', border: '1px solid rgba(124,58,237,0.3)',
      zIndex: 10
    }} />
    {/* Screen */}
    <div style={{
      position: 'absolute', inset: 4, borderRadius: 32,
      background: 'linear-gradient(180deg, #0f0f23, #050816)',
      overflow: 'hidden'
    }}>
      {children}
    </div>
    {/* Home bar */}
    <div style={{
      position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
      width: 60, height: 4, borderRadius: 2,
      background: 'rgba(255,255,255,0.3)', zIndex: 10
    }} />
  </div>
)

/* ─── GLASS CARD ───────────────────────────────────────────────────────────── */
const GlassCard = ({ children, style = {}, glow = 'purple' }) => {
  const glowColor = glow === 'purple' ? '124,58,237' : glow === 'cyan' ? '6,182,212' : '236,72,153'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 24,
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 60px rgba(${glowColor},0.08)`,
      position: 'relative',
      overflow: 'hidden',
      ...style
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 30% 0%, rgba(${glowColor},0.06) 0%, transparent 60%)`,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

/* ─── ANIMATED COUNTER ─────────────────────────────────────────────────────── */
const AnimCounter = ({ values, interval = 1200, prefix = '', suffix = '' }) => {
  const [idx, setIdx] = useState(0)
  const [display, setDisplay] = useState(values[0])
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % values.length), interval)
    return () => clearInterval(t)
  }, [values, interval])
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'inline-block' }}
      >
        {prefix}{values[idx]}{suffix}
      </motion.span>
    </AnimatePresence>
  )
}

/* ─── SECTION WRAPPER WITH SCROLL-BASED OPACITY ────────────────────────────── */
/* ── Category marquee (honest: the niches creators earn in, not brand claims) ─ */
const MARQUEE_BRANDS = [
  'BEAUTY', 'SKINCARE', 'FASHION', 'LIFESTYLE', 'FOOD', 'TECH',
  'FITNESS', 'HAIR CARE', 'HOME', 'ACCESSORIES', 'WELLNESS', 'GADGETS',
]

/** Compact number formatting for headline stats (1200 → 1.2k, 3_400_000 → 3.4M). */
const compactNum = (n) => {
  n = Number(n) || 0
  if (n >= 1e7) return (n / 1e6).toFixed(0) + 'M'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e4) return (n / 1e3).toFixed(0) + 'k'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return n.toLocaleString()
}

/** "3h ago" / "2d ago" for the payout ticker. */
const timeAgo = (d) => {
  const ms = Date.now() - new Date(d).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'just now'
  const h = Math.floor(ms / 3_600_000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const BrandMarquee = () => (
  <section className="brand-marquee" style={{
    position: 'relative', zIndex: 10, padding: '36px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    overflow: 'hidden',
  }}>
    <p style={{
      textAlign: 'center', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.3em', textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.25)', marginBottom: 24,
    }}>
      Creators earn across every category
    </p>
    <div style={{
      maskImage: 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)',
    }}>
      {/* Track is duplicated once — translating -50% loops seamlessly */}
      <div className="brand-marquee-track">
        {[...MARQUEE_BRANDS, ...MARQUEE_BRANDS].map((b, i) => (
          <span key={i} style={{
            fontSize: 17, fontWeight: 800, letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.22)', whiteSpace: 'nowrap',
            fontStyle: 'italic', transition: 'color 0.3s',
            cursor: 'default',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(167,139,250,0.85)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.22)'}
          >{b}</span>
        ))}
      </div>
    </div>
  </section>
)

/* ── Hero video background slot ──────────────────────────────────────────────
   Plays /hero-bg.mp4 from public/ if present (muted, looped, decorative).
   Skipped entirely under prefers-reduced-motion; paused when the tab hides;
   silently removed if the file is missing — the WebGL layer carries the hero.
   A scrim keeps text contrast >= 4.5:1 over any footage.
   Footage: Pexels #12920706 "Purple dots in darkness" (Pexels License — free for
   commercial use, no attribution required). Swap the file to change the mood. */
const HeroVideoBg = () => {
  // Decide once, at mount: reduced-motion users never get the video at all.
  const [ok, setOk] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const videoRef = useRef(null)

  useEffect(() => {
    if (!ok) return
    const onVis = () => {
      const v = videoRef.current
      if (!v) return
      if (document.hidden) v.pause()
      else v.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [ok])

  if (!ok) return null
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
      <video
        ref={videoRef}
        src="/hero-bg.mp4"
        autoPlay muted loop playsInline
        preload="metadata"
        onError={() => setOk(false)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45, filter: 'saturate(1.15) hue-rotate(-8deg)' }}
      />
      {/* Contrast scrim + vignette into the page background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(5,8,22,0.3) 0%, rgba(5,8,22,0.82) 78%), linear-gradient(180deg, rgba(5,8,22,0.55) 0%, rgba(5,8,22,0.15) 45%, #050816 97%)',
      }} />
    </div>
  )
}

/* ── Floating glass stat chip (SVG icons, not emoji) ───────────────────── */
const CHIP_ICONS = {
  heart:  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  chat:   <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  users:  <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  wallet: <><rect x="2" y="6" width="20" height="14" rx="3" /><path d="M16 12h4" /><path d="M2 10h20" /></>,
}

const StatChip = ({ icon, label, color = '#a78bfa', style = {}, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    style={{
      position: 'absolute',
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 14px', borderRadius: 100,
      background: 'rgba(10,14,32,0.72)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
      animation: 'floatYSlow 4s ease-in-out infinite',
      zIndex: 8, whiteSpace: 'nowrap',
      ...style,
    }}
  >
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {CHIP_ICONS[icon]}
    </svg>
    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}>{label}</span>
  </motion.div>
)

const ScrollSection = ({ children, style = {} }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: '-10% 0px -10% 0px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  )
}

/* ─── MAIN LANDING ─────────────────────────────────────────────────────────── */
export default function Landing() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 })

  const containerRef = useRef(null)

  // Scroll progress for the whole page
  const { scrollYProgress } = useScroll()

  // Deep links like /#how-it-works (navbar/footer links from other pages): the
  // browser can't scroll to a fragment that doesn't exist at load time because
  // React mounts it afterwards — so jump there ourselves once mounted. Instant
  // on purpose: it happens underneath the intro loader, and the second pass
  // catches any layout shift from the lazy WebGL chunk / web fonts. In-page
  // hash clicks are still handled natively (with the global smooth scrolling).
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const jump = () => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' })
    const t1 = setTimeout(jump, 120)
    const t2 = setTimeout(jump, 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    const onMove = e => { mouseX.set(e.clientX); mouseY.set(e.clientY) }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Live headline numbers — real DB counts, no invented figures
  const [stats, setStats] = useState(null)
  useEffect(() => {
    let ok = true
    fetch(`${API_URL}/api/stats/public`).then(r => r.json()).then(d => { if (ok && d && !d.message) setStats(d) }).catch(() => {})
    return () => { ok = false }
  }, [])

  /* ── Individual section refs for scroll-driven animations ── */
  const heroRef     = useRef(null)
  const s1Ref       = useRef(null)
  const s2Ref       = useRef(null)
  const s3Ref       = useRef(null)
  const s4Ref       = useRef(null)
  const s5Ref       = useRef(null)
  const s6Ref       = useRef(null)
  const ctaRef      = useRef(null)

  // Hero scroll progress
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroScale  = useTransform(heroScroll, [0, 1], [1, 1.3])
  const heroOpacity= useTransform(heroScroll, [0, 0.7], [1, 0])
  const camZ       = useTransform(heroScroll, [0, 1], ['perspective(1200px) scale(1)', 'perspective(1200px) scale(1.4)'])

  // Parallax for hero content
  const heroTitleY = useTransform(heroScroll, [0, 1], [0, -120])

  // Mouse parallax
  const pX = useTransform(smoothX, [0, typeof window !== 'undefined' ? window.innerWidth : 1920], [-20, 20])
  const pY = useTransform(smoothY, [0, typeof window !== 'undefined' ? window.innerHeight : 1080], [-12, 12])

  // True 3D tilt for the phone rig — follows the cursor across the viewport
  const rigRotY = useTransform(smoothX, [0, typeof window !== 'undefined' ? window.innerWidth : 1920], [-10, 10])
  const rigRotX = useTransform(smoothY, [0, typeof window !== 'undefined' ? window.innerHeight : 1080], [8, -8])

  return (
    <div style={{ background: 'var(--bg)', color: '#e2e8f0', minHeight: '100vh', overflowX: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <style>{GLOBAL_CSS}</style>
      <ParticleCanvas mouseX={mouseX} mouseY={mouseY} />

      {/* ── Ambient light orbs ─────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <motion.div style={{
          position: 'absolute', width: 700, height: 700,
          borderRadius: '50%', top: '10%', left: '15%', transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
          x: pX, y: pY,
        }} />
        <motion.div style={{
          position: 'absolute', width: 500, height: 500,
          borderRadius: '50%', bottom: '20%', right: '10%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
          x: useTransform(pX, v => -v * 0.5),
          y: useTransform(pY, v => -v * 0.5),
        }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section ref={heroRef} style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        paddingTop: 'clamp(120px, 16vh, 170px)',
        position: 'relative', overflow: 'hidden', zIndex: 10,
      }}>
        <HeroVideoBg />
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* WebGL layer — rising cashback coins + holographic cores */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <Suspense fallback={null}>
            <Hero3D />
          </Suspense>
        </div>

        {/* ── Centered headline block ── */}
        <motion.div style={{ opacity: heroOpacity, y: heroTitleY, position: 'relative', zIndex: 10, width: '100%', maxWidth: 1040, padding: '0 24px', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 18px', borderRadius: 100,
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.3)',
              marginBottom: 28, backdropFilter: 'blur(12px)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', display: 'inline-block', animation: 'pulseRing 2s ease-in-out infinite' }} />
              {/* Hero type scale is golden-ratio (φ≈1.618): 11 → 18 → 47–123, each step ×φ */}
              <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Bangladesh's creator-commerce platform</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: 'clamp(47px, 9vw, 123px)',
              fontWeight: 900, lineHeight: 0.94, letterSpacing: '-0.045em',
              textTransform: 'uppercase', fontStyle: 'italic',
              color: '#fff', margin: '0 0 24px',
            }}
          >
            Shop. Share.<br />
            <span className="shimmer-text">Get Paid.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{ fontSize: 'clamp(16px, 1.4vw, 18px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px' }}
          >
            FlexTag pays nano & micro-influencers{' '}
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>30–70% cashback</span>{' '}
            for sharing products they genuinely love. Escrow-protected. Paid in 48 hours.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}
          >
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 48px rgba(124,58,237,0.65)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '16px 38px', borderRadius: 100,
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                  border: 'none', color: '#fff', fontWeight: 800,
                  fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 0 32px rgba(124,58,237,0.4)',
                }}
              >Start Earning Free →</motion.button>
            </Link>
            <a href="#how-it-works" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ borderColor: 'rgba(124,58,237,0.6)', color: '#fff' }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '16px 32px', borderRadius: 100,
                  background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.65)', fontWeight: 600,
                  fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                See How It Works
              </motion.button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
          >
            <div style={{ display: 'flex' }}>
              {['T', 'P', 'A', 'R', 'N'].map((l, i) => (
                <div key={i} style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `linear-gradient(135deg, hsl(${270 + i * 20}, 80%, 60%), hsl(${190 + i * 15}, 80%, 55%))`,
                  border: '2px solid #050816',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: '#fff',
                  marginLeft: i > 0 ? -9 : 0,
                }}>{l}</div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              <span style={{ color: '#fff', fontWeight: 700 }}>{stats ? compactNum(stats.creators) : '—'}</span> creators ·{' '}
              {stats && stats.cashbackPaid > 0
                ? <><span style={{ color: '#fff', fontWeight: 700 }}>৳{compactNum(stats.cashbackPaid)}</span> cashback paid</>
                : <><span style={{ color: '#fff', fontWeight: 700 }}>{stats ? compactNum(stats.brands) : '—'}</span> brand partners</>}
            </p>
          </motion.div>
        </motion.div>

        {/* ── Phone rig — emerges from below the headline ── */}
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'relative', zIndex: 6,
            height: 480, width: '100%', maxWidth: 900,
            marginTop: 48, marginBottom: -40,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            perspective: 1200, transformStyle: 'preserve-3d',
            rotateY: rigRotY, rotateX: rigRotX,
            opacity: heroOpacity,
          }}
        >
          {/* Floating stat chips — SVG icons */}
          <StatChip icon="heart"  label="+2.4K Likes"     color="#ec4899" style={{ top: 30,  right: '16%' }} delay={1.0} />
          <StatChip icon="chat"   label="847 Comments"    color="#06b6d4" style={{ bottom: 120, left: '13%' }} delay={1.15} />
          <StatChip icon="users"  label="+1.2K Followers" color="#a78bfa" style={{ top: 90,  left: '15%' }} delay={1.3} />
          <StatChip icon="wallet" label="৳450 Cashback"   color="#22c55e" style={{ bottom: 60, right: '14%' }} delay={1.45} />

          {/* Fade the rig's bottom edge into the next section */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 160, background: 'linear-gradient(180deg, transparent, #050816 85%)', zIndex: 9, pointerEvents: 'none' }} />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          style={{
            position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 1, height: 40, background: 'linear-gradient(180deg, rgba(124,58,237,0.8), transparent)' }}
          />
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STATS BAR                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '40px 24px' }}>
        <ScrollSection>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
            {(stats ? [
              { value: compactNum(stats.creators), label: 'Active Creators' },
              { value: compactNum(stats.brands), label: 'Brand Partners' },
              { value: compactNum(stats.approvedPosts), label: 'Verified Posts' },
              stats.cashbackPaid > 0
                ? { value: `৳${compactNum(stats.cashbackPaid)}`, label: 'Cashback Paid' }
                : { value: compactNum(stats.activeCampaigns), label: 'Live Campaigns' },
            ] : [
              { value: '—', label: 'Active Creators' },
              { value: '—', label: 'Brand Partners' },
              { value: '—', label: 'Verified Posts' },
              { value: '—', label: 'Live Campaigns' },
            ]).map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{ textAlign: 'center' }}
              >
                <p style={{ fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 6 }}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        </ScrollSection>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PAYOUT PROOF TICKER — real recent cashback releases, names masked   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {stats?.recentPayouts?.length > 0 && (
        <section style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '14px 0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 48, width: 'max-content', animation: 'marqueeX 30s linear infinite' }}>
            {[...stats.recentPayouts, ...stats.recentPayouts].map((p, i) => (
              <span key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>💸</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{p.name}</span> received
                <span style={{ color: '#4ade80', fontWeight: 700 }}>৳{Number(p.amount).toLocaleString()}</span>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>· {timeAgo(p.at)}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TRUSTED-BY MARQUEE                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <BrandMarquee />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCROLL ANIMATION 1 — BRAND CREATES CAMPAIGN                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" ref={s1Ref} style={{ position: 'relative', zIndex: 10, padding: '120px 24px', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollSection>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <p style={{ fontSize: 11, color: '#7c3aed', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>Scene 01</p>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 16 }}>
                Brand Creates<br /><span className="shimmer-text">Campaign</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
                A brand launches a campaign. Creators receive product boxes. The ecosystem activates.
              </p>
            </div>
          </ScrollSection>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            {/* Campaign card */}
            <ScrollSection>
              <motion.div
                whileHover={{ y: -8, rotateY: 5 }}
                transition={{ type: 'spring', stiffness: 200 }}
                style={{ perspective: 1000 }}
              >
                <GlassCard style={{ padding: 40 }} glow="purple">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: '#000', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      <img src="/products/nike-logo.png" alt="Nike" style={{ width: 38, height: 38, objectFit: 'contain' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: '#fff', fontSize: 18 }}>Nike Campaign</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Live · 34 days left</p>
                    </div>
                    <div style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 100, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 10, color: '#22c55e', fontWeight: 700 }}>ACTIVE</div>
                  </div>

                  {/* Cashback big number */}
                  <div style={{ textAlign: 'center', padding: '32px 0', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 32 }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Cashback Rate</p>
                    <motion.p
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                    >70%</motion.p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
                      <p style={{ fontSize: 22, fontWeight: 900, color: '#a78bfa' }}>100</p>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>CREATORS</p>
                    </div>
                    <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
                      <p style={{ fontSize: 22, fontWeight: 900, color: '#67e8f9' }}>৳50K</p>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>BUDGET</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Beauty', 'Fashion', 'Lifestyle', 'Sports'].map(tag => (
                      <span key={tag} style={{ padding: '4px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{tag}</span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            </ScrollSection>

            {/* Product boxes flying out */}
            <ScrollSection>
              <div style={{ position: 'relative', height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {[
                  { img: '/products/nike-shoe.png', label: 'Air Max 270', delay: 0,   x: 0,    y: -120 },
                  { img: '/products/serum.png',     label: 'Glow Serum',  delay: 0.3, x: 110,  y: -40  },
                  { img: '/products/hoodie.png',    label: 'Hoodie XL',   delay: 0.6, x: -120, y: 20   },
                  { img: '/products/watch.png',     label: 'Watch Pro',   delay: 0.9, x: 70,   y: 110  },
                  { img: '/products/bag.png',       label: 'City Bag',    delay: 1.2, x: -80,  y: 140  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    whileInView={{ opacity: 1, scale: 1, x: item.x, y: item.y }}
                    viewport={{ once: false, margin: '-5%' }}
                    transition={{ duration: 0.8, delay: item.delay, type: 'spring', stiffness: 120 }}
                    style={{ position: 'absolute' }}
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
                      transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <GlassCard style={{ padding: '12px 16px', textAlign: 'center', minWidth: 90 }}>
                        <img src={item.img} alt={item.label} style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 6, borderRadius: 8 }} />
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{item.label}</p>
                        <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />
                        <p style={{ fontSize: 8, color: '#a78bfa' }}>📦 In Transit</p>
                      </GlassCard>
                    </motion.div>
                  </motion.div>
                ))}

                {/* Center glow */}
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)', boxShadow: '0 0 60px rgba(124,58,237,0.3)' }} />
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCROLL ANIMATION 2 — CREATOR JOURNEY                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section ref={s2Ref} style={{ position: 'relative', zIndex: 10, padding: '120px 24px', background: 'rgba(124,58,237,0.02)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollSection>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <p style={{ fontSize: 11, color: '#06b6d4', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>Scene 02</p>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 16 }}>
                Creator<br /><span style={{ color: '#06b6d4' }}>Journey</span>
              </h2>
            </div>
          </ScrollSection>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            {/* Journey steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { icon: '🛍️', step: 'Buy Product',      desc: 'Browse & order from verified brand catalog',  color: '#7c3aed', delay: 0 },
                { icon: '✅', step: 'Order Confirmed',   desc: 'Brand ships your product within 24 hours',    color: '#06b6d4', delay: 0.15 },
                { icon: '📦', step: 'Delivered',         desc: 'Product arrives at your doorstep',            color: '#ec4899', delay: 0.3 },
                { icon: '📱', step: 'Ready to Post',     desc: 'Create authentic content & share to socials', color: '#f59e0b', delay: 0.45 },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: s.delay }}
                  style={{ display: 'flex', gap: 20, position: 'relative' }}
                >
                  {/* Connector line */}
                  {i < 3 && (
                    <div style={{
                      position: 'absolute', left: 22, top: 52, bottom: -28,
                      width: 2, background: `linear-gradient(180deg, ${s.color}40, transparent)`,
                    }} />
                  )}
                  <div style={{ flexShrink: 0 }}>
                    <motion.div
                      whileInView={{ scale: [0, 1.2, 1] }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: s.delay + 0.1 }}
                      style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: `${s.color}20`,
                        border: `2px solid ${s.color}50`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, boxShadow: `0 0 20px ${s.color}30`,
                      }}
                    >{s.icon}</motion.div>
                  </div>
                  <div style={{ paddingBottom: 32 }}>
                    <p style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 4 }}>{s.step}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Phone with journey screen */}
            <ScrollSection>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <PhoneMockup>
                  <div style={{ padding: '30px 16px 16px', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 8 }}>My Order</p>
                    {/* Product preview */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(124,58,237,0.08))', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 14, padding: 10, textAlign: 'center', marginBottom: 4, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 100%, rgba(249,115,22,0.15) 0%, transparent 70%)' }} />
                      <img src="/products/nike-shoe.png" alt="Nike Air Max" style={{ width: 60, height: 60, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(249,115,22,0.4))' }} />
                      <p style={{ fontSize: 12, color: '#fff', fontWeight: 700, marginTop: 4 }}>Nike Air Max 270</p>
                      <p style={{ fontSize: 9, color: '#f97316' }}>Size 42 · Black/White</p>
                    </div>
                    {/* Order timeline */}
                    {['Order Placed', 'Processing', 'Shipped', 'Delivered'].map((step, i) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.3 + 0.5 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}
                      >
                        <motion.div
                          whileInView={{ scale: [0, 1.3, 1] }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.3 + 0.6 }}
                          style={{
                            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                            background: i <= 2 ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'rgba(255,255,255,0.1)',
                            border: i === 3 ? '2px dashed rgba(255,255,255,0.2)' : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {i <= 2 && <span style={{ fontSize: 9 }}>✓</span>}
                        </motion.div>
                        <span style={{ fontSize: 11, color: i <= 2 ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: i <= 2 ? 600 : 400 }}>{step}</span>
                        {i === 2 && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#22c55e', fontWeight: 700 }}>TODAY</span>}
                      </motion.div>
                    ))}
                    {/* CTA */}
                    <motion.button
                      animate={{ boxShadow: ['0 0 20px rgba(124,58,237,0.3)', '0 0 40px rgba(124,58,237,0.6)', '0 0 20px rgba(124,58,237,0.3)'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        marginTop: 'auto', padding: '10px', borderRadius: 12,
                        background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                        border: 'none', color: '#fff', fontWeight: 700,
                        fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}
                    >📱 Create Post Now</motion.button>
                  </div>
                </PhoneMockup>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCROLL ANIMATION 3 — INSTAGRAM REEL                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section ref={s3Ref} style={{ position: 'relative', zIndex: 10, padding: '120px 24px', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollSection>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <p style={{ fontSize: 11, color: '#ec4899', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>Scene 03</p>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 16 }}>
                Instagram<br /><span style={{ color: '#ec4899' }}>Reel Goes Viral</span>
              </h2>
            </div>
          </ScrollSection>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            {/* Reel phone */}
            <ScrollSection>
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                {/* Floating hearts */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0, x: rnd(i, 1) * 60 - 30 }}
                    whileInView={{
                      opacity: [0, 1, 0],
                      y: -200,
                      x: rnd(i, 2) * 100 - 50,
                    }}
                    viewport={{ once: false }}
                    transition={{ duration: 2.5, delay: i * 0.4, repeat: Infinity, ease: 'easeOut' }}
                    style={{ position: 'absolute', bottom: 100, fontSize: i % 3 === 0 ? 24 : 16, zIndex: 20 }}
                  >
                    {i % 3 === 0 ? '❤️' : i % 3 === 1 ? '💬' : '✨'}
                  </motion.div>
                ))}

                <motion.div
                  whileInView={{ rotateY: [0, 15, 0] }}
                  viewport={{ once: false }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                  style={{ perspective: 1000 }}
                >
                  <PhoneMockup>
                    {/* Actual Instagram Reels UI fills the entire screen */}
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 32, overflow: 'hidden' }}>
                      <img
                        src="/products/instagram-reel.png"
                        alt="Instagram Reel"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {/* Overlaid Instagram top bar */}
                      <div style={{ position: 'absolute', top: 28, left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Reels</span>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <span style={{ fontSize: 16, color: '#fff' }}>📷</span>
                          <span style={{ fontSize: 16, color: '#fff' }}>➕</span>
                        </div>
                      </div>
                      {/* Reel progress bar */}
                      <div style={{ position: 'absolute', top: 24, left: 12, right: 12, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: '65%' }}
                          viewport={{ once: false }}
                          transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
                          style={{ height: '100%', background: 'linear-gradient(90deg, #ec4899, #c026d3)', borderRadius: 1 }}
                        />
                      </div>
                      {/* Gradient overlay for bottom text */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', borderRadius: '0 0 32px 32px' }} />
                      {/* Creator info overlay */}
                      <div style={{ position: 'absolute', bottom: 52, left: 10, right: 42, zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff' }}>T</div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>@tasnim.creates</span>
                          <div style={{ padding: '1px 7px', borderRadius: 100, border: '1px solid #fff', fontSize: 8, color: '#fff', fontWeight: 600 }}>Follow</div>
                        </div>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>Nike Air Max 270 🔥 Obsessed! #FlexTag #NikeCampaign</p>
                      </div>
                      {/* Right action icons */}
                      <div style={{ position: 'absolute', bottom: 52, right: 6, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 10, alignItems: 'center' }}>
                        <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20 }}>❤️</div><p style={{ fontSize: 7, color: '#fff', fontWeight: 700 }}>24K</p>
                        </motion.div>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18 }}>💬</div><p style={{ fontSize: 7, color: '#fff', fontWeight: 700 }}>847</p></div>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18 }}>➤</div><p style={{ fontSize: 7, color: '#fff', fontWeight: 700 }}>1.2K</p></div>
                        <div style={{ width: 22, height: 22, borderRadius: 6, border: '1.5px solid #fff', overflow: 'hidden' }}>
                          <img src="/products/nike-shoe.png" alt="Nike" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                      {/* Home bar */}
                      <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: 60, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
                    </div>
                  </PhoneMockup>
                </motion.div>
              </div>
            </ScrollSection>

            {/* Follower stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <ScrollSection>
                <GlassCard style={{ padding: 32 }} glow="pink">
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Follower Growth</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {['1.2K', '8.4K', '24K', '50K+'].map((val, i) => (
                      <motion.div
                        key={val}
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.2 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 16 }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: `rgba(236,72,153,${0.1 + i * 0.08})`, border: '1px solid rgba(236,72,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#ec4899', fontWeight: 800 }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(i + 1) * 22}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, delay: i * 0.2 + 0.3 }}
                              style={{ height: '100%', background: 'linear-gradient(90deg, #ec4899, #7c3aed)', borderRadius: 2 }}
                            />
                          </div>
                        </div>
                        <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', minWidth: 55, textAlign: 'right' }}>{val}</p>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </ScrollSection>

              <ScrollSection>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { icon: '❤️', val: '24K', label: 'Total Likes', color: '#ec4899' },
                    { icon: '💬', val: '847', label: 'Comments', color: '#7c3aed' },
                    { icon: '↗️', val: '1.2K', label: 'Shares', color: '#06b6d4' },
                    { icon: '👁️', val: '120K', label: 'Reach', color: '#f59e0b' },
                  ].map(s => (
                    <motion.div key={s.label} whileHover={{ scale: 1.03 }}>
                      <GlassCard style={{ padding: 20, textAlign: 'center' }}>
                        <span style={{ fontSize: 24 }}>{s.icon}</span>
                        <p style={{ fontSize: 22, fontWeight: 900, color: s.color, marginTop: 8 }}>{s.val}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{s.label}</p>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </ScrollSection>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCROLL ANIMATION 4 — AI VERIFICATION                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section ref={s4Ref} style={{ position: 'relative', zIndex: 10, padding: '120px 24px', background: 'rgba(6,182,212,0.02)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollSection>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <p style={{ fontSize: 11, color: '#06b6d4', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>Scene 04</p>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 16 }}>
                AI<br /><span className="shimmer-text">Verification</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
                Our AI engine scans every post in real-time, ensuring authenticity before cashback releases.
              </p>
            </div>
          </ScrollSection>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            {/* AI scan phone */}
            <ScrollSection>
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                {/* AI beam effect */}
                <motion.div
                  animate={{ y: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                  style={{
                    position: 'absolute',
                    left: '50%', transform: 'translateX(-50%)',
                    width: 220, height: 4,
                    background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.8), transparent)',
                    boxShadow: '0 0 20px rgba(6,182,212,0.6)',
                    zIndex: 30, pointerEvents: 'none',
                  }}
                />
                <PhoneMockup style={{ boxShadow: '0 0 80px rgba(6,182,212,0.3), 0 0 40px rgba(124,58,237,0.2)' }}>
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '30px 16px 16px', gap: 10 }}>
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        style={{ display: 'inline-block' }}
                      >
                        <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(124,58,237,0.3))', border: '2px solid rgba(6,182,212,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto' }}>🤖</div>
                      </motion.div>
                      <p style={{ fontSize: 11, color: '#67e8f9', fontWeight: 700, marginTop: 6 }}>AI Scanner Active</p>
                    </div>

                    {/* Post preview */}
                    <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 12, padding: 8, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 100%, rgba(249,115,22,0.1) 0%, transparent 70%)' }} />
                      <img src="/products/nike-shoe.png" alt="Nike Air Max" style={{ width: 48, height: 48, objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(249,115,22,0.4))' }} />
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>@tasnim #NikeCampaign #FlexTag</p>
                    </div>

                    {/* Check items */}
                    {[
                      { label: 'Correct hashtag', delay: 0.5 },
                      { label: 'Tagged brand',    delay: 1.0 },
                      { label: 'Public post',     delay: 1.5 },
                      { label: 'Retention active', delay: 2.0 },
                    ].map((check, i) => (
                      <motion.div
                        key={check.label}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: check.delay }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                      >
                        <motion.span
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: check.delay + 0.1, type: 'spring' }}
                          style={{ fontSize: 14 }}
                        >✅</motion.span>
                        <span style={{ fontSize: 10, color: '#86efac', fontWeight: 600 }}>{check.label}</span>
                      </motion.div>
                    ))}

                    {/* Verified badge */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 2.5, type: 'spring', stiffness: 200 }}
                      style={{ marginTop: 'auto' }}
                    >
                      <div style={{
                        textAlign: 'center', padding: '14px', borderRadius: 14,
                        background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(124,58,237,0.2))',
                        border: '2px solid rgba(6,182,212,0.5)',
                        boxShadow: '0 0 30px rgba(6,182,212,0.3)',
                        animation: 'glowPulse 2s ease-in-out infinite',
                      }}>
                        <p style={{ fontSize: 20 }}>🏅</p>
                        <p style={{ fontSize: 12, fontWeight: 900, color: '#67e8f9' }}>VERIFIED</p>
                        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>Cashback releasing…</p>
                      </div>
                    </motion.div>
                  </div>
                </PhoneMockup>
              </div>
            </ScrollSection>

            {/* Check list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <ScrollSection>
                <GlassCard style={{ padding: 40 }} glow="cyan">
                  <div style={{ marginBottom: 28 }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>AI Verification Engine</p>
                    <h3 style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>Zero-fraud guarantee</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { check: '✔ Correct hashtag used', desc: 'Matches campaign requirements exactly' },
                      { check: '✔ Brand properly tagged', desc: 'Official brand handle verified' },
                      { check: '✔ Post is public',        desc: 'Accessible to all Instagram users' },
                      { check: '✔ Retention is active',   desc: 'Post remains live for 30 days' },
                      { check: '✔ Authentic engagement',  desc: 'No bot-generated interactions' },
                    ].map((item, i) => (
                      <motion.div
                        key={item.check}
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.12 }}
                        style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12 }}>✓</div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{item.check}</p>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </ScrollSection>

              <ScrollSection>
                <motion.div
                  animate={{ boxShadow: ['0 0 40px rgba(6,182,212,0.2)', '0 0 80px rgba(6,182,212,0.4)', '0 0 40px rgba(6,182,212,0.2)'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <GlassCard style={{ padding: 28, textAlign: 'center' }} glow="cyan">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      style={{ fontSize: 48, marginBottom: 12 }}
                    >🏅</motion.div>
                    <p style={{ fontSize: 22, fontWeight: 900, color: '#67e8f9', marginBottom: 4 }}>Verified Badge</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Unlocks automatic cashback transfer</p>
                  </GlassCard>
                </motion.div>
              </ScrollSection>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCROLL ANIMATION 5 — CASHBACK                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section ref={s5Ref} style={{ position: 'relative', zIndex: 10, padding: '120px 24px', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollSection>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <p style={{ fontSize: 11, color: '#f59e0b', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>Scene 05</p>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 16 }}>
                Cashback<br /><span style={{ color: '#f59e0b' }}>Hits Your Wallet</span>
              </h2>
            </div>
          </ScrollSection>

          {/* Coin burst center */}
          <div style={{ position: 'relative', textAlign: 'center', marginBottom: 80 }}>
            {/* Flying coins */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                whileInView={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0.5],
                  x: Math.cos((i / 12) * Math.PI * 2) * (120 + rnd(i, 3) * 80),
                  y: Math.sin((i / 12) * Math.PI * 2) * (100 + rnd(i, 4) * 60) - 60,
                }}
                viewport={{ once: false }}
                transition={{ duration: 2, delay: i * 0.15, repeat: Infinity, repeatDelay: 1 }}
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  marginLeft: -16, marginTop: -16,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b, #fcd34d)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, boxShadow: '0 0 12px rgba(245,158,11,0.5)',
                  zIndex: 5,
                }}
              >💰</motion.div>
            ))}

            {/* Glass wallet */}
            <ScrollSection>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <motion.div
                  animate={{
                    boxShadow: ['0 0 40px rgba(245,158,11,0.2)', '0 0 80px rgba(245,158,11,0.4)', '0 0 40px rgba(245,158,11,0.2)'],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ display: 'inline-block' }}
                >
                  <GlassCard style={{ padding: '48px 64px', textAlign: 'center', minWidth: 320 }} glow="cyan">
                    {/* Premium coin-stack icon built in SVG */}
                    <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 16px' }}>
                      <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, transparent 70%)', filter: 'blur(10px)' }} />
                      <svg viewBox="0 0 80 80" width="80" height="80" style={{ position: 'relative' }}>
                        {/* Bottom coin */}
                        <ellipse cx="40" cy="62" rx="28" ry="9" fill="#b45309" />
                        <rect x="12" y="52" width="56" height="10" fill="#d97706" rx="2" />
                        <ellipse cx="40" cy="52" rx="28" ry="9" fill="#f59e0b" />
                        {/* Middle coin */}
                        <ellipse cx="40" cy="48" rx="24" ry="8" fill="#92400e" />
                        <rect x="16" y="39" width="48" height="9" fill="#b45309" rx="2" />
                        <ellipse cx="40" cy="39" rx="24" ry="8" fill="#d97706" />
                        {/* Top coin */}
                        <ellipse cx="40" cy="35" rx="20" ry="7" fill="#78350f" />
                        <rect x="20" y="27" width="40" height="8" fill="#92400e" rx="2" />
                        <ellipse cx="40" cy="27" rx="20" ry="7" fill="#fbbf24" />
                        {/* Shine on top coin */}
                        <ellipse cx="33" cy="24" rx="7" ry="3" fill="rgba(255,255,255,0.2)" />
                        {/* ৳ symbol */}
                        <text x="40" y="30" textAnchor="middle" fontSize="10" fontWeight="900" fill="#78350f" fontFamily="serif">৳</text>
                      </svg>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Your Balance</p>
                    <div style={{ fontSize: 'clamp(48px, 6vw, 72px)', fontWeight: 900, color: '#f59e0b', lineHeight: 1, marginBottom: 16 }}>
                      <AnimCounter values={['৳0', '৳450', '৳980', '৳3,400']} interval={1000} />
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
                      {[{ l: 'Campaigns', v: '7' }, { l: 'Posts', v: '24' }, { l: 'Earned', v: '৳18K' }].map(s => (
                        <div key={s.l} style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{s.v}</p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s.l}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              </div>
            </ScrollSection>
          </div>

          {/* Withdrawal options */}
          <ScrollSection>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 800, margin: '0 auto' }}>
              {[
                { img: '/products/bkash-logo.svg',  method: 'bKash',         desc: 'Instant transfer · 24/7', color: '#e91e7a', border: 'rgba(233,30,122,0.35)', bg: 'rgba(233,30,122,0.06)' },
                { img: null,                         method: 'Bank Transfer', desc: 'All local banks · BEFTN', color: '#ef4444', border: 'rgba(239,68,68,0.35)',  bg: 'rgba(239,68,68,0.06)'  },
                { img: '/products/nagad-logo.svg',   method: 'Nagad',         desc: 'Instant transfer · 24/7', color: '#e53935', border: 'rgba(229,57,53,0.35)',  bg: 'rgba(229,57,53,0.06)'  },
              ].map(m => (
                <motion.div key={m.method} whileHover={{ scale: 1.04, y: -6 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <GlassCard style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: 80, height: 56, margin: '0 auto 14px' }}>
                      <div style={{ position: 'absolute', inset: -6, borderRadius: 16, background: `radial-gradient(circle, ${m.color}18 0%, transparent 70%)`, filter: 'blur(8px)' }} />
                      <div style={{ width: 80, height: 56, borderRadius: 14, background: m.img ? 'white' : m.bg, border: `1px solid ${m.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                        {m.img
                          ? <img src={m.img} alt={m.method} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
                          : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ fontSize: 20 }}>🏦</span>
                              <span style={{ fontSize: 8, color: m.color, fontWeight: 800, letterSpacing: '0.05em' }}>BRAC BANK</span>
                            </div>
                        }
                      </div>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.method}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{m.desc}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCROLL ANIMATION 6 — BRAND ANALYTICS                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section id="for-brands" ref={s6Ref} style={{ position: 'relative', zIndex: 10, padding: '120px 24px', background: 'rgba(124,58,237,0.02)', borderTop: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollSection>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <p style={{ fontSize: 11, color: '#7c3aed', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>Scene 06</p>
              <h2 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 16 }}>
                Brand<br /><span className="shimmer-text">Analytics Dashboard</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
                One campaign. Hundreds of authentic creators. A connected ecosystem of real ROI.
              </p>
            </div>
          </ScrollSection>

          {/* ── Live Campaign Badge ── */}
          <ScrollSection>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', borderRadius: 100, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
                <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Live Campaign · Nike Air Max 270</span>
              </div>
            </div>

            {/* ── Creator Cards Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
              {[
                { init: 'T', name: '@tasnim.creates', followers: '42K', reach: '120K', badge: '🔥 Top',    color: '#7c3aed', border: 'rgba(124,58,237,0.45)', bg: 'rgba(124,58,237,0.08)', metric: '+340%', stat: 'REACH',  bars: [40,55,35,70,60,85,100] },
                { init: 'R', name: '@rafi.lens',       followers: '18K', reach: '54K',  badge: '⭐ Rising', color: '#06b6d4', border: 'rgba(6,182,212,0.45)',  bg: 'rgba(6,182,212,0.08)',  metric: '+180%', stat: 'ENG.',   bars: [30,50,45,65,55,75,90]  },
                { init: 'S', name: '@sadia.vibes',     followers: '31K', reach: '88K',  badge: '💎 Elite',  color: '#ec4899', border: 'rgba(236,72,153,0.45)', bg: 'rgba(236,72,153,0.08)', metric: '+220%', stat: 'ROI',   bars: [50,40,60,55,80,70,95]  },
                { init: 'N', name: '@nadia.fits',      followers: '9K',  reach: '27K',  badge: '🚀 New',    color: '#f59e0b', border: 'rgba(245,158,11,0.45)', bg: 'rgba(245,158,11,0.08)', metric: '+60%',  stat: 'SALES', bars: [20,35,30,45,40,60,75]  },
              ].map((c, i) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  whileHover={{ y: -6 }}
                >
                  <div style={{
                    borderRadius: 20, padding: 20,
                    background: `linear-gradient(145deg, ${c.bg} 0%, rgba(5,8,22,0.95) 100%)`,
                    border: `1px solid ${c.border}`,
                    boxShadow: `0 16px 40px rgba(0,0,0,0.5), 0 0 20px ${c.color}10`,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {/* Shine */}
                    <div style={{ position: 'absolute', top: 0, left: '-40%', width: '30%', height: '100%', background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.04), transparent)', transform: 'skewX(-20deg)' }} />
                    {/* Avatar + badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${c.color}, ${c.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: '#fff', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>{c.init}</div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{c.name}</p>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{c.followers} followers</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 100, background: `${c.color}20`, border: `1px solid ${c.border}`, color: c.color, fontWeight: 700, whiteSpace: 'nowrap' }}>{c.badge}</span>
                    </div>
                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                        <p style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>{c.reach}</p>
                        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>REACH</p>
                      </div>
                      <div style={{ flex: 1, background: `${c.color}15`, borderRadius: 10, padding: '8px 10px', textAlign: 'center', border: `1px solid ${c.border}` }}>
                        <p style={{ fontSize: 15, fontWeight: 900, color: c.color }}>{c.metric}</p>
                        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>{c.stat}</p>
                      </div>
                    </div>
                    {/* Mini bar chart */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
                      {c.bars.map((h, j) => (
                        <motion.div
                          key={j}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h * 0.28}px` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: i * 0.1 + j * 0.05 }}
                          style={{ flex: 1, borderRadius: 3, background: j === 6 ? c.color : `${c.color}30` }}
                        />
                      ))}
                    </div>
                    {/* Status */}
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e', flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Post live · Cashback pending</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollSection>

          {/* Analytics charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {[
              { label: 'Reach',      value: '120K',  growth: '+340%', color: '#7c3aed', height: 70 },
              { label: 'Engagement', value: '8.4%',  growth: '+180%', color: '#06b6d4', height: 55 },
              { label: 'ROI',        value: '4.8×',  growth: '+220%', color: '#ec4899', height: 85 },
              { label: 'Campaigns',  value: '48',    growth: '+60%',  color: '#f59e0b', height: 45 },
              { label: 'Sales',      value: '৳340K', growth: '+410%', color: '#22c55e', height: 90 },
            ].map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <GlassCard style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 12, gap: 3 }}>
                    {[...Array(6)].map((_, j) => (
                      <motion.div
                        key={j}
                        initial={{ height: 0 }}
                        whileInView={{ height: Math.random() * metric.height + 10 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.1 + j * 0.06 }}
                        style={{ width: 8, borderRadius: 4, background: j === 5 ? metric.color : `${metric.color}40` }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 900, color: metric.color }}>{metric.value}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>{metric.label}</p>
                  <p style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginTop: 4 }}>{metric.growth}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FINAL CTA — FLEXTAG LOGO + DUAL PORTALS                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section ref={ctaRef} style={{ position: 'relative', zIndex: 10, padding: '160px 24px', overflow: 'hidden' }}>
        {/* Giant glow behind logo */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          {/* FlexTag Logo */}
          <ScrollSection>
            <div style={{ textAlign: 'center', marginBottom: 100 }}>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'inline-block', marginBottom: 32 }}
              >
                <h1 style={{
                  fontSize: 'clamp(72px, 12vw, 160px)',
                  fontWeight: 900,
                  letterSpacing: '-0.06em',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  fontStyle: 'italic',
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4, #ec4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 40px rgba(124,58,237,0.4))',
                }}>
                  FlexTag
                </h1>
              </motion.div>
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', maxWidth: 500, margin: '0 auto' }}>
                Where creators earn and brands grow. The future of authentic marketing.
              </p>
            </div>
          </ScrollSection>

          {/* Dual portals */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, maxWidth: 900, margin: '0 auto' }}>
            {/* Creator Portal */}
            <ScrollSection>
              <Link to="/register?role=creator" style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ scale: 1.03, rotateY: 3, y: -8 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  style={{ perspective: 1000, cursor: 'pointer' }}
                >
                  <GlassCard style={{ padding: 48 }} glow="purple">
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.5 }}
                        style={{ fontSize: 64, display: 'inline-block', marginBottom: 16, filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.5))' }}
                      >🎯</motion.div>
                      <h3 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Creator Portal</h3>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Join the earning ecosystem</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {['Browse campaigns', 'Earn cashback', 'Build your portfolio', 'Track analytics'].map((item, i) => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <motion.div
                      whileHover={{ x: 5 }}
                      style={{
                        marginTop: 32, padding: '14px', borderRadius: 14,
                        background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                        textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 14,
                      }}
                    >Start Earning →</motion.div>
                  </GlassCard>
                </motion.div>
              </Link>
            </ScrollSection>

            {/* Brand Portal */}
            <ScrollSection>
              <Link to="/register?role=brand" style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ scale: 1.03, rotateY: -3, y: -8 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  style={{ perspective: 1000, cursor: 'pointer' }}
                >
                  <GlassCard style={{ padding: 48 }} glow="cyan">
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                      <motion.div
                        whileHover={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                        style={{ fontSize: 64, display: 'inline-block', marginBottom: 16, filter: 'drop-shadow(0 0 20px rgba(6,182,212,0.5))' }}
                      >🏢</motion.div>
                      <h3 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Brand Portal</h3>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Scale with authentic creators</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {['Launch campaigns', 'Track ROI', 'Discover creators', 'Pay on results only'].map((item, i) => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <motion.div
                      whileHover={{ x: 5 }}
                      style={{
                        marginTop: 32, padding: '14px', borderRadius: 14,
                        background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                        textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 14,
                      }}
                    >Launch Campaign →</motion.div>
                  </GlassCard>
                </motion.div>
              </Link>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer id="contact" style={{ position: 'relative', background: 'linear-gradient(180deg, #060918 0%, #030611 100%)', borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>

        {/* Rainbow accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, #7c3aed 25%, #06b6d4 55%, #ec4899 80%, transparent 100%)' }} />

        {/* Background glow */}
        <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>

          {/* ── CTA Banner ── */}
          <div style={{
            padding: '48px 48px',
            margin: '48px 0 0',
            borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.06) 100%)',
            border: '1px solid rgba(124,58,237,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div>
              <p style={{ fontSize: 11, color: '#a78bfa', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Ready to start?</p>
              <h3 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Shop. Share. <span style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Earn.</span>
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>Join 10,000+ creators already earning cashback across Bangladesh.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/register?role=creator" style={{
                padding: '13px 28px', borderRadius: 12,
                background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                color: '#fff', fontWeight: 700, fontSize: 13,
                textDecoration: 'none', letterSpacing: '0.02em',
                boxShadow: '0 0 24px rgba(124,58,237,0.35)',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(124,58,237,0.55)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(124,58,237,0.35)' }}
              >Join as Creator →</a>
              <a href="/register?role=brand" style={{
                padding: '13px 28px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 13,
                textDecoration: 'none', letterSpacing: '0.02em',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)'; e.currentTarget.style.color = '#67e8f9' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              >Launch Campaign</a>
            </div>
          </div>

          {/* ── Main grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, padding: '56px 0 48px' }}>

            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 11, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', boxShadow: '0 0 16px rgba(124,58,237,0.5)' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16, fontStyle: 'italic' }}>F</div>
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 17, fontStyle: 'italic', color: '#fff', letterSpacing: '-0.02em' }}>FlexTag™</div>
                  <div style={{ fontSize: 9, letterSpacing: '0.16em', color: 'rgba(167,139,250,0.6)', textTransform: 'uppercase', marginTop: 1 }}>Shop · Share · Earn</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, marginBottom: 24, maxWidth: 260 }}>
                Bangladesh's first creator-to-brand cashback platform. Buy real products, post authentic content, earn real money.
              </p>
              {/* Social */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Facebook',  path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                  { label: 'Instagram', path: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M7.5 20.5h9A5.5 5.5 0 0022 15V9a5.5 5.5 0 00-5.5-5.5h-9A5.5 5.5 0 002 9v6a5.5 5.5 0 005.5 5.5z' },
                  { label: 'Twitter',   path: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
                  { label: 'LinkedIn',  path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z' },
                ].map(s => (
                  <a key={s.label} href="#" aria-label={s.label} style={{
                    width: 34, height: 34, borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'; e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={s.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Platform */}
            {[
              {
                heading: 'Platform',
                links: [
                  { label: 'How It Works',  href: '#' },
                  { label: 'For Creators',  href: '/register?role=creator' },
                  { label: 'For Brands',    href: '/register?role=brand' },
                  { label: 'Catalog',       href: '/creator/catalog' },
                  { label: 'Leaderboard',   href: '/creator/leaderboard' },
                ],
              },
              {
                heading: 'Company',
                links: [
                  { label: 'About Us',  href: '#' },
                  { label: 'Blog',      href: '#' },
                  { label: 'Careers',   href: '#' },
                  { label: 'Press',     href: '#' },
                  { label: 'Contact',   href: '#' },
                ],
              },
              {
                heading: 'Legal & Support',
                links: [
                  { label: 'Privacy Policy',   href: '#' },
                  { label: 'Terms of Service', href: '#' },
                  { label: 'Help Center',      href: '/support/faq' },
                  { label: 'Submit Ticket',    href: '/support/tickets' },
                  { label: 'Live Chat',        href: '/support/chat' },
                ],
              },
            ].map(col => (
              <div key={col.heading}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)', marginBottom: 20 }}>{col.heading}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {col.links.map(l => (
                    <a key={l.label} href={l.href} style={{
                      fontSize: 13, color: 'rgba(255,255,255,0.35)',
                      textDecoration: 'none', transition: 'color 0.2s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
                    >{l.label}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Divider ── */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 20%, rgba(255,255,255,0.07) 80%, transparent)' }} />

          {/* ── Bottom bar ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '24px 0' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
              © 2026 <span style={{ color: 'rgba(167,139,250,0.5)' }}>FlexTag™</span> · Made with ♥ in Bangladesh
            </p>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>All systems operational</span>
            </div>
          </div>

        </div>
      </footer>

      {/* Progress indicator */}
      <motion.div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 3, background: 'linear-gradient(90deg, #7c3aed, #06b6d4, #ec4899)',
          scaleX: scrollYProgress, transformOrigin: '0 0', zIndex: 9999,
        }}
      />
    </div>
  )
}
