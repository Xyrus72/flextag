import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * AuthShell — shared split-panel layout for Login & Register.
 *
 * Left: animated brand panel (aurora, rotating beam, floating proof cards).
 * Right: the form column (children). Below 1024px the brand panel hides and
 * the form takes the full viewport.
 */

const VALUE_PROPS = [
  { icon: '💸', title: '30–70% cashback', desc: 'Real money back on every approved post' },
  { icon: '🛡️', title: 'Escrow-protected', desc: 'Funds locked before campaigns go live' },
  { icon: '⚡', title: '48h payouts', desc: 'bKash & Nagad withdrawals, no hassle' },
]

const AuthShell = ({ tagline = 'Sign in to your account', children }) => (
  <div style={{
    minHeight: '100vh', background: '#050816', position: 'relative',
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
      borderRight: '1px solid rgba(255,255,255,0.06)',
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
        <img src="/products/flextag-logo.png" alt="FlexTag" style={{ height: 44, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 16px rgba(124,58,237,0.4))' }} />
      </Link>

      {/* Headline + value props */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize: 'clamp(32px, 3.2vw, 46px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.08, color: '#fff', margin: '0 0 16px' }}
        >
          Turn influence into
          <br />
          <span className="gradient-text">real income.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 420, margin: '0 0 36px' }}
        >
          The creator-commerce platform trusted by nano & micro-influencers
          across Bangladesh. Shop products, share authentic content, earn cashback.
        </motion.p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>
          {VALUE_PROPS.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{v.icon}</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{v.title}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{v.desc}</p>
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
        <div style={{ display: 'flex' }}>
          {['S', 'M', 'R', 'T', 'A'].map((l, i) => (
            <div key={i} style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `linear-gradient(135deg, hsl(${262 + i * 18}, 75%, 58%), hsl(${195 + i * 12}, 80%, 52%))`,
              border: '2px solid #050816',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#fff',
              marginLeft: i > 0 ? -9 : 0,
            }}>{l}</div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          <span style={{ color: '#fff', fontWeight: 700 }}>12,400+</span> creators ·{' '}
          <span style={{ color: '#fff', fontWeight: 700 }}>340+</span> brands on FlexTag
        </p>
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
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 17, color: '#fff', fontStyle: 'italic', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}>F</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 900, fontSize: 21, color: '#fff', fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1 }}>FlexTag™</div>
              <div style={{ fontSize: 9, color: 'rgba(167,139,250,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>Shop · Share · Earn</div>
            </div>
          </Link>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginTop: 16, fontWeight: 300 }}>{tagline}</p>
        </div>

        {children}
      </div>
    </div>
  </div>
)

export default AuthShell
