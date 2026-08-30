import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ShoppingBag, Camera, Banknote, ShieldCheck, AtSign, Hash,
  Clock, UserCheck, Eye, ArrowRight, Check, Play,
} from 'lucide-react'
import { API_URL } from '../config'
import { useT } from '../context/LanguageContext'

// WebGL hero scene — lazy so three.js never blocks first paint
const Hero3D = lazy(() => import('../components/Hero3D'))

/**
 * The landing page.
 *
 * Two rules govern every pixel here:
 *  1. Nothing invented. Every number is fetched live; every "example" card is a
 *     visibly generic illustration, never a fake brand or a fake viral post.
 *     A visitor who can disprove one claim distrusts all of them.
 *  2. One voice. Sentence case, one serif accent, one violet — the WebGL hero
 *     carries the drama so the type does not have to shout.
 */

const compactNum = (n) => {
  const v = Number(n) || 0
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(v)
}

const EASE = [0.22, 1, 0.36, 1]

/** Section reveal: one subtle rise, once. */
const Reveal = ({ children, delay = 0, ...rest }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.55, delay, ease: EASE }}
    {...rest}
  >
    {children}
  </motion.div>
)

/** Overline: the small label that opens every section. */
const Overline = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
    <span style={{ width: 16, height: 2, background: 'var(--purple)', borderRadius: 2, display: 'block' }} />
    <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--violet-ink)' }}>
      {children}
    </span>
  </div>
)

/** Section heading: calm weight, serif accent available via <em>. */
const H2 = ({ children, style }) => (
  <h2 style={{
    fontSize: 'clamp(28px, 3.6vw, 44px)', fontWeight: 700, letterSpacing: '-0.025em',
    lineHeight: 1.12, color: 'var(--text)', margin: '0 0 14px', textWrap: 'balance', ...style,
  }}>
    {children}
  </h2>
)

const Serif = ({ children }) => (
  <em className="font-display" style={{ fontStyle: 'italic', color: 'var(--violet-ink)', fontSize: '1.06em' }}>{children}</em>
)

/* ── Hero video (decorative; reduced-motion users never load it) ───────────── */
const HeroVideoBg = () => {
  const [ok, setOk] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const videoRef = useRef(null)

  useEffect(() => {
    if (!ok) return undefined
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
    <div className="hero-video" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
      <video
        ref={videoRef} src="/hero-bg.mp4" autoPlay muted loop playsInline preload="metadata"
        onError={() => setOk(false)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4, filter: 'saturate(1.1) hue-rotate(-8deg)' }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(5,8,22,0.25) 0%, rgba(5,8,22,0.72) 78%, var(--bg) 100%)' }} />
    </div>
  )
}

/* ── Small honest UI vignettes for the three steps ─────────────────────────── */

const VignetteShell = ({ children }) => (
  <div style={{
    borderRadius: 14, border: '1px solid rgba(var(--ink-rgb),0.09)',
    background: 'rgba(var(--ink-rgb),0.03)', padding: 16, marginTop: 22,
  }}>
    {children}
  </div>
)

const ShopVignette = () => (
  <VignetteShell>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ShoppingBag size={18} strokeWidth={1.75} style={{ color: 'var(--violet-ink)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Vitamin C Serum</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Skincare · 50% cashback</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p className="tnum" style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: 0, textDecoration: 'line-through' }}>৳1,200</p>
        <p className="tnum" style={{ fontSize: 15, fontWeight: 700, color: 'var(--green-ink)', margin: 0 }}>৳600</p>
      </div>
    </div>
  </VignetteShell>
)

const PostVignette = () => (
  <VignetteShell>
    {[['Required hashtags found', true], ['Brand account mentioned', true], ['Posted from the verified account', true]].map(([label, done]) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, background: done ? 'rgba(34,197,94,0.15)' : 'rgba(var(--ink-rgb),0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={11} strokeWidth={3} style={{ color: 'var(--green-ink)' }} />
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{label}</span>
      </div>
    ))}
  </VignetteShell>
)

const PaidVignette = () => (
  <VignetteShell>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Banknote size={18} strokeWidth={1.75} style={{ color: 'var(--green-ink)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Cashback released</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Post verified · sent to bKash</p>
      </div>
      <p className="tnum" style={{ fontSize: 15, fontWeight: 700, color: 'var(--green-ink)', margin: 0 }}>+৳600</p>
    </div>
  </VignetteShell>
)

/* ── The page ──────────────────────────────────────────────────────────────── */

const CATEGORIES = ['Beauty', 'Skincare', 'Fashion', 'Lifestyle', 'Food', 'Tech', 'Fitness', 'Hair care', 'Home', 'Accessories', 'Wellness', 'Gadgets']

const CHECKS = [
  { Icon: UserCheck, title: 'Account ownership', desc: 'The creator proves the Instagram account is theirs — a bio code, or one-tap OAuth.' },
  { Icon: Hash, title: 'Required hashtags', desc: 'The exact tags the campaign asked for, read from the live post — Bangla tags included.' },
  { Icon: AtSign, title: 'Brand mention', desc: 'Your handle, actually tagged. Not claimed — found in the caption.' },
  { Icon: Eye, title: 'Fake-follower screening', desc: 'Follower samples are analysed before a creator can even register.' },
  { Icon: Clock, title: 'Retention re-check', desc: 'The post must still be live days later. Deleted early means clawed back.' },
  { Icon: ShieldCheck, title: 'Escrowed budget', desc: 'Rewards come from funds the brand has already committed — never IOUs.' },
]

const Landing = () => {
  const t = useT()
  const heroRef = useRef(null)
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroOpacity = useTransform(heroScroll, [0, 0.75], [1, 0])
  const heroY = useTransform(heroScroll, [0, 1], [0, -90])

  // Live numbers — real counts, or nothing. No invented figures anywhere on this page.
  const [stats, setStats] = useState(null)
  useEffect(() => {
    let ok = true
    fetch(`${API_URL}/api/stats/public`).then(r => r.json())
      .then(d => { if (ok && d && !d.message) setStats(d) }).catch(() => {})
    return () => { ok = false }
  }, [])

  // Deep links like /#for-brands arrive from other pages — jump once on mount.
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    const el = document.querySelector(hash)
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, [])

  const statItems = stats ? [
    { value: compactNum(stats.creators), label: 'Creators' },
    { value: compactNum(stats.brands), label: 'Brand partners' },
    { value: compactNum(stats.approvedPosts), label: 'Verified posts' },
    { value: stats.cashbackPaid > 0 ? `৳${compactNum(stats.cashbackPaid)}` : compactNum(stats.activeCampaigns), label: stats.cashbackPaid > 0 ? 'Cashback paid' : 'Live campaigns' },
  ] : []

  return (
    <div style={{ background: 'var(--bg)', overflowX: 'clip' }}>

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <HeroVideoBg />
        <div className="hero-fx" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <Suspense fallback={null}>
            <Hero3D />
          </Suspense>
        </div>

        <motion.div style={{ opacity: heroOpacity, y: heroY, position: 'relative', zIndex: 10, width: '100%', maxWidth: 980, padding: '96px 24px 0', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100,
              background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.1)',
              marginBottom: 30, backdropFilter: 'blur(12px)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>{t('hero.badge')}</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.22, ease: EASE }}
            style={{
              fontSize: 'clamp(44px, 7.6vw, 92px)', fontWeight: 700, lineHeight: 1.02,
              letterSpacing: '-0.035em', color: 'var(--text)', margin: '0 0 26px', textWrap: 'balance',
            }}
          >
            {t('hero.title1')}<br />
            <span className="font-display" style={{ fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em', fontSize: '1.06em', background: 'linear-gradient(115deg, #b7a5f7, #7c3aed 55%, #22d3ee)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('hero.title2')}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
            style={{ fontSize: 'clamp(15px, 1.5vw, 17.5px)', color: 'rgba(var(--ink-rgb),0.55)', lineHeight: 1.65, maxWidth: 520, margin: '0 auto 34px', textWrap: 'pretty' }}
          >
            {t('hero.subtitle', { rate: '30–70%' })}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.55, ease: EASE }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 34 }}
          >
            <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', padding: '13px 26px', fontSize: 14.5 }}>
              {t('hero.cta')}
            </Link>
            <a href="#how-it-works" className="btn-ghost" style={{ textDecoration: 'none', padding: '13px 24px', fontSize: 14.5, backdropFilter: 'blur(10px)' }}>
              <Play size={14} strokeWidth={2} />
              {t('hero.secondary')}
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}
            className="tnum" style={{ fontSize: 12.5, color: 'rgba(var(--ink-rgb),0.42)', margin: 0 }}
          >
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats ? compactNum(stats.creators) : '—'}</span> {t('hero.creators')} ·{' '}
            {stats && stats.cashbackPaid > 0
              ? <><span style={{ color: 'var(--text)', fontWeight: 600 }}>৳{compactNum(stats.cashbackPaid)}</span> {t('hero.cashbackPaid')}</>
              : <><span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats ? compactNum(stats.brands) : '—'}</span> {t('hero.brandPartners')}</>}
          </motion.p>
        </motion.div>

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 140, background: 'linear-gradient(180deg, transparent, var(--bg) 88%)', zIndex: 9, pointerEvents: 'none' }} />
      </section>

      {/* ══ LIVE NUMBERS ═══════════════════════════════════════════════════ */}
      {statItems.length > 0 && (
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '8px 24px 0' }}>
          <Reveal>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 16, overflow: 'hidden',
              background: 'rgba(var(--ink-rgb),0.02)',
            }}>
              {statItems.map((item, i) => (
                <div key={item.label} style={{ padding: '26px 20px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(var(--ink-rgb),0.07)' : 'none' }}>
                  <p className="tnum" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>{item.value}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '5px 0 0' }}>{item.label}</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-dim)', margin: '10px 0 0' }}>
              Live platform numbers — counted, not claimed.
            </p>
          </Reveal>
        </section>
      )}

      {/* ══ CATEGORY MARQUEE ═══════════════════════════════════════════════ */}
      <section style={{ margin: '72px 0 0', borderTop: '1px solid rgba(var(--ink-rgb),0.06)', borderBottom: '1px solid rgba(var(--ink-rgb),0.06)', padding: '18px 0', overflow: 'hidden' }} aria-hidden="true">
        <div className="brand-marquee" style={{ maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)' }}>
          <div className="brand-marquee-track">
            {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.3)', whiteSpace: 'nowrap' }}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ maxWidth: 1080, margin: '0 auto', padding: '104px 24px 0', scrollMarginTop: 80 }}>
        <Reveal style={{ maxWidth: 560 }}>
          <Overline>How it works</Overline>
          <H2>Three steps between a product and <Serif>real money.</Serif></H2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0, textWrap: 'pretty' }}>
            No pitching, no invoicing, no negotiating rates. Buy something you would post about anyway — the rest is automatic.
          </p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 44 }}>
          {[
            { n: '01', Icon: ShoppingBag, title: 'Shop at a discount', desc: 'Order from the catalog. Part of your reward comes off the price at checkout — the rest waits on your post.', V: ShopVignette },
            { n: '02', Icon: Camera, title: 'Post about it', desc: 'Put the reel up with the campaign tags. FlexTag usually spots it on its own and verifies it against the rules.', V: PostVignette },
            { n: '03', Icon: Banknote, title: 'Get paid', desc: 'The moment verification passes, the remaining cashback lands in your wallet — withdrawable to bKash or Nagad.', V: PaidVignette },
          ].map((step, i) => (
            <Reveal key={step.n} delay={i * 0.1}>
              <div style={{
                height: '100%', padding: 26, borderRadius: 16,
                background: 'rgba(var(--ink-rgb),0.025)', border: '1px solid rgba(var(--ink-rgb),0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <span style={{
                    width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.18)',
                  }}>
                    <step.Icon size={17} strokeWidth={1.75} style={{ color: 'var(--violet-ink)' }} />
                  </span>
                  <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>{step.n}</span>
                </div>
                <h3 style={{ fontSize: 17.5, fontWeight: 650, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.015em' }}>{step.title}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, textWrap: 'pretty' }}>{step.desc}</p>
                <step.V />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ VERIFICATION ═══════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '112px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'start' }}>
          <Reveal>
            <Overline>Trust, engineered</Overline>
            <H2>Money moves on <Serif>proof,</Serif> nothing else.</H2>
            <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 18px', textWrap: 'pretty' }}>
              Every post is fetched from Instagram and checked by machine before a single taka of reward is released.
              Brands never pay for posts that do not exist; creators never chase invoices for posts that do.
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.7, margin: 0 }}>
              The same engine screens accounts at signup, watches for deleted posts after payout,
              and claws rewards back when an order is returned — in both directions, the rules are the rules.
            </p>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {CHECKS.map((check, i) => (
              <Reveal key={check.title} delay={i * 0.06}>
                <div style={{ padding: 18, borderRadius: 14, background: 'rgba(var(--ink-rgb),0.025)', border: '1px solid rgba(var(--ink-rgb),0.08)', height: '100%' }}>
                  <check.Icon size={17} strokeWidth={1.75} style={{ color: 'var(--violet-ink)', marginBottom: 10 }} />
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{check.title}</p>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0, textWrap: 'pretty' }}>{check.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TWO SIDES ══════════════════════════════════════════════════════ */}
      <section id="for-brands" style={{ maxWidth: 1080, margin: '0 auto', padding: '112px 24px 0', scrollMarginTop: 80 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          <Reveal>
            <div style={{ padding: 30, borderRadius: 16, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.18)', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Overline>For creators</Overline>
              <H2 style={{ fontSize: 'clamp(22px, 2.4vw, 30px)' }}>From 1,000 followers, your feed pays.</H2>
              <div style={{ flex: 1, margin: '10px 0 22px' }}>
                {['30–70% cashback on real products', 'Instant discount at checkout, bonus on verification', 'Payouts to bKash, Nagad or Rocket', 'A public portfolio of verified collaborations'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
                    <Check size={15} strokeWidth={2.5} style={{ color: 'var(--violet-ink)', marginTop: 3, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
                Start earning <ArrowRight size={15} strokeWidth={2} />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div style={{ padding: 30, borderRadius: 16, background: 'rgba(var(--ink-rgb),0.025)', border: '1px solid rgba(var(--ink-rgb),0.09)', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Overline>For brands</Overline>
              <H2 style={{ fontSize: 'clamp(22px, 2.4vw, 30px)' }}>Pay for posts that verifiably exist.</H2>
              <div style={{ flex: 1, margin: '10px 0 22px' }}>
                {['Budgets held in escrow, spent only on delivered rewards', 'Every post machine-checked before money moves', 'Fake-follower screening on every creator', 'A shareable performance report per campaign'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
                    <Check size={15} strokeWidth={2.5} style={{ color: 'var(--cyan-ink)', marginTop: 3, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/register?role=brand" className="btn-ghost" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
                Launch a campaign <ArrowRight size={15} strokeWidth={2} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ PAYOUTS ════════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '112px 24px 0' }}>
        <Reveal style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <Overline>Payouts</Overline>
          <H2>Withdrawn the way Bangladesh <Serif>actually pays.</Serif></H2>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', margin: '22px 0 0' }}>
            {['bKash', 'Nagad', 'Rocket', 'Bank transfer'].map(m => (
              <span key={m} style={{
                padding: '9px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                color: 'var(--text)', background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.1)',
              }}>{m}</span>
            ))}
          </div>
        </Reveal>

        {/* Real payout ticker — renders only when real payouts exist */}
        {stats?.recentPayouts?.length > 0 && (
          <Reveal delay={0.1} style={{ marginTop: 30, overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)' }}>
            <div className="brand-marquee">
              <div className="brand-marquee-track" style={{ gap: 12 }}>
                {[...stats.recentPayouts, ...stats.recentPayouts].map((p, i) => (
                  <span key={i} className="tnum" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10,
                    background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                    fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap',
                  }}>
                    <Banknote size={13} strokeWidth={2} style={{ color: 'var(--green-ink)' }} />
                    {p.name} earned <strong style={{ color: 'var(--green-ink)', fontWeight: 700 }}>৳{Number(p.amount).toLocaleString()}</strong>
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </section>

      {/* ══ FINAL CTA ══════════════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '112px 24px 120px' }}>
        <Reveal>
          <div style={{
            position: 'relative', overflow: 'hidden', textAlign: 'center', padding: 'clamp(44px, 7vw, 80px) 24px',
            borderRadius: 20, border: '1px solid rgba(124,58,237,0.22)',
            background: 'linear-gradient(160deg, rgba(124,58,237,0.12), rgba(6,182,212,0.05) 70%)',
          }}>
            <div aria-hidden="true" style={{ position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)', width: 520, height: 320, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.28), transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <H2 style={{ fontSize: 'clamp(30px, 4.4vw, 52px)' }}>
                Your next post could <Serif>pay for itself.</Serif>
              </H2>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '0 auto 30px', maxWidth: 460, lineHeight: 1.65, textWrap: 'pretty' }}>
                {stats
                  ? <>Join the {compactNum(stats.creators)} creators and {compactNum(stats.brands)} brands already on FlexTag.</>
                  : 'Creators and brands across Bangladesh are already on FlexTag.'}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', padding: '13px 26px', fontSize: 14.5 }}>
                  Join as a creator <ArrowRight size={15} strokeWidth={2} />
                </Link>
                <Link to="/explore" className="btn-ghost" style={{ textDecoration: 'none', padding: '13px 24px', fontSize: 14.5 }}>
                  Browse live campaigns
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Marquee keyframes — the one animation this page defines itself */}
      <style>{`
        @keyframes marqueeX { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .brand-marquee-track { display: flex; align-items: center; gap: 56px; width: max-content; animation: marqueeX 40s linear infinite; }
        .brand-marquee:hover .brand-marquee-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .brand-marquee-track { animation: none; } }
      `}</style>
    </div>
  )
}

export default Landing
