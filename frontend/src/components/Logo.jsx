/**
 * The FlexTag mark.
 *
 * Replaces the old gradient PNG. A wordmark set tight in the UI face plus a
 * small geometric monogram: an "F" built from two bars with the lower bar
 * kicked forward — motion, without a swoosh cliché. Being SVG it is crisp at
 * every size, themes itself (currentColor + one accent), and weighs nothing.
 */
const Monogram = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#7c3aed" />
    <rect x="9" y="8" width="14" height="3.5" rx="1.75" fill="#fff" />
    <rect x="9" y="14.5" width="10" height="3.5" rx="1.75" fill="#fff" fillOpacity="0.85" />
    <path d="M9 21h5.5a1.75 1.75 0 1 1 0 3.5H9a1.75 1.75 0 1 1 0-3.5z" fill="#67e8f9" />
  </svg>
)

const Logo = ({ size = 28, withWordmark = true, wordmarkColor = 'var(--text)' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, lineHeight: 1 }}>
    <Monogram size={size} />
    {withWordmark && (
      <span style={{
        fontSize: size * 0.68,
        fontWeight: 700,
        letterSpacing: '-0.03em',
        color: wordmarkColor,
        fontFamily: 'Inter, sans-serif',
      }}>
        FlexTag
      </span>
    )}
  </span>
)

export { Monogram }
export default Logo
