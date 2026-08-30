import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useT } from '../context/LanguageContext'
import Logo from './Logo'
import { Banknote, ShieldCheck, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { API_URL } from '../config'

/**
 * AuthShell — shared split-panel layout for Login & Register.
 *
 * Left: animated brand panel (aurora, rotating beam, floating proof cards).
 * Right: the form column (children). Below 1024px the brand panel hides and
 * the form takes the full viewport.
 */

const VALUE_PROPS = [
  { Icon: Banknote, key: 'perk1' },
  { Icon: ShieldCheck, key: 'perk2' },
  { Icon: Zap, key: 'perk3' },
]

const AuthShell = ({ tagline, children }) => {
  const t = useT()
  const [stats, setStats] = useState(null)
  useEffect(() => {
    let ok = true
    fetch(`${API_URL}/api/stats/public`).then(r => r.json())
      .then(d => { if (ok && d && !d.message) setStats(d) }).catch(() => {})
    return () => { ok = false }
  }, [])

  return (
  <div style={{
    minHeight: '100vh', background: 'var(--bg)', position: 'relative',
    overflow: 'hidden', fontFamily: 'Inter, sans-serif',
    display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
  }} className="auth-shell">
    <style>{`
      @media (max-width: 1023px) {
        .auth-shell { grid-template-columns: 1fr !important; }
        .auth-brand-panel { display: none !important; }
      }
      @keyframes authBeamSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    `}</style>

    <div className="noise-overlay" />
    <div className="aurora-bg" />

    {/* ── LEFT — Brand panel ─────────────────────────────────────────────── */}
    <div className="auth-brand-panel" style={{
      position: 'relative', overflow: 'hidden',
      borderRight: '1px solid rgba(var(--ink-rgb),0.06)',
      background: 'linear-gradient(160deg, rgba(124,58,237,0.08) 0%, rgba(5,8,22,0) 45%, rgba(6,182,212,0.05) 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '48px 56px',
    }}>
      {/* Rotating conic beam behind content */}
      <div style={{
        position: 'absolute', width: 900, height: 900, top: '50%', left: '50%',
        marginTop: -450, marginLeft: -450, borderRadius: '50%',
        background: 'conic-gradient(from 0deg, transparent 0deg, rgba(124,58,237,0.08) 40deg, transparent 90deg, transparent 180deg, rgba(6,182,212,0.06) 220deg, transparent 270deg)',
        animation: 'authBeamSpin 24s linear infinite',
        pointerEvents: 'none',
      }} />
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
      }} />

      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 2, width: 'fit-content' }}>
        <Logo size={30} />
      </Link>

      {/* Headline + value props */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize: 'clamp(32px, 3.2vw, 46px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.12, color: 'var(--text)', margin: '0 0 16px', textWrap: 'balance' }}
        >
          {t('auth.headline1')}
          <br />
          <span className="font-display" style={{ fontStyle: 'italic', color: 'var(--violet-ink)', fontSize: '1.12em' }}>{t('auth.headline2')}</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={{ fontSize: 15, color: 'rgba(var(--ink-rgb),0.45)', lineHeight: 1.7, maxWidth: 420, margin: '0 0 36px' }}
        >
          {t('auth.blurb')}
        </motion.p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>
          {VALUE_PROPS.map((v, i) => (
            <motion.div
              key={v.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', borderRadius: 12,
                background: 'rgba(var(--ink-rgb),0.03)',
                border: '1px solid rgba(var(--ink-rgb),0.07)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)',
              }}>
                <v.Icon size={17} strokeWidth={2} style={{ color: 'var(--violet-ink)' }} />
              </span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t(`auth.${v.key}.title`)}</p>
                <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)', margin: '2px 0 0' }}>{t(`auth.${v.key}.desc`)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Social proof footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.8 }}
        style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 14 }}
      >
        {/* Real numbers or nothing — invented social proof costs more trust than it buys. */}
        {stats && (
          <p className="tnum" style={{ fontSize: 12.5, color: 'rgba(var(--ink-rgb),0.4)', margin: 0 }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.creators}</span> creators ·{' '}
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.brands}</span> brands on FlexTag today
          </p>
        )}
      </motion.div>
    </div>

    {/* ── RIGHT — Form column ────────────────────────────────────────────── */}
    <div style={{
      position: 'relative', zIndex: 2,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', minHeight: '100vh',
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Compact logo header (shows on all sizes; primary branding on mobile) */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            <Logo size={32} />
          </Link>
          <p style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),0.35)', marginTop: 16, fontWeight: 300 }}>{tagline || t('auth.tagline')}</p>
        </div>

        {children}
      </div>
    </div>
  </div>
  )
}

export default AuthShell
