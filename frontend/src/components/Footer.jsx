import { Link } from 'react-router-dom'
import { useT } from '../context/LanguageContext'
import Logo from './Logo'

/**
 * The footer.
 *
 * Quiet by design: hairlines, muted type, and only links that go somewhere.
 * The old footer had a glowing logo, dead social icons that preventDefault'd,
 * and fake "Privacy Policy" spans that were cursor-pointer to nowhere — a
 * professional footer contains no controls that lie about being controls.
 */
const columnsFor = (t) => [
  {
    title: t('footer.platform'),
    links: [
      { label: t('footer.howItWorks'), href: '/#how-it-works' },
      { label: t('footer.catalog'), href: '/explore' },
      { label: t('footer.leaderboard'), href: '/creator/leaderboard' },
      { label: t('footer.creatorSignup'), href: '/register' },
    ],
  },
  {
    title: t('footer.forBrands'),
    links: [
      { label: t('footer.launchCampaign'), href: '/register?role=brand' },
      { label: t('footer.brandDashboard'), href: '/brand' },
      { label: t('footer.pricing'), href: '/#for-brands' },
    ],
  },
  {
    title: t('footer.support'),
    links: [
      { label: t('footer.faq'), href: '/support/faq' },
      { label: t('footer.liveChat'), href: '/support/chat' },
      { label: t('footer.ticket'), href: '/support/tickets' },
    ],
  },
]

const Footer = () => {
  const t = useT()
  const COLUMNS = columnsFor(t)

  return (
    <footer id="contact" style={{
      position: 'relative', zIndex: 20,
      borderTop: '1px solid rgba(var(--ink-rgb),0.07)',
      background: 'var(--footer-bg)',
      padding: '56px 24px 32px',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* ── Main grid ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 36, marginBottom: 44 }}>
          <div style={{ gridColumn: 'span 1', minWidth: 220 }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', marginBottom: 16 }}>
              <Logo size={26} />
            </Link>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '32ch', margin: 0, textWrap: 'pretty' }}>
              Bangladesh’s creator-commerce platform. Shop products, share authentic
              content, earn verified cashback — escrow-protected on both sides.
            </p>
          </div>

          {COLUMNS.map(col => (
            <div key={col.title}>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 14px', opacity: 0.65 }}>
                {col.title}
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {col.links.map(l => (
                  <li key={l.label}>
                    <a href={l.href} style={{
                      fontSize: 13.5, color: 'var(--text-muted)', textDecoration: 'none',
                      transition: 'color 150ms cubic-bezier(0.2,0,0,1)',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                    >{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          paddingTop: 20, borderTop: '1px solid rgba(var(--ink-rgb),0.06)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
            © {new Date().getFullYear()} FlexTag · Dhaka, Bangladesh
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
            Payouts via bKash · Nagad · Rocket · bank transfer
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
