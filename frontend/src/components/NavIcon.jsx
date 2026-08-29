
/**
 * NavIcon — wraps a Lucide icon with a glowing gradient tint.
 * Usage: <NavIcon icon={LayoutDashboard} color="#7c3aed" />
 */
const NavIcon = ({ icon: Icon, color = '#7c3aed', size = 17 }) => (
  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
    {/* glow backdrop */}
    <span style={{
      position: 'absolute',
      inset: -4,
      borderRadius: 8,
      background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
      pointerEvents: 'none',
    }} />
    <Icon
      size={size}
      strokeWidth={1.6}
      style={{
        color,
        filter: `drop-shadow(0 0 5px ${color}88)`,
        position: 'relative',
      }}
    />
  </span>
)

export default NavIcon
