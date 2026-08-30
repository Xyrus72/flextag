/**
 * NavIcon — a Lucide icon sized and weighted for the sidebar/nav rail.
 * Color is inherited (currentColor): the sidebar sets it per active/resting
 * state, so every icon dims and lights up together instead of carrying its
 * own fixed hue.
 */
const NavIcon = ({ icon: Icon, size = 17 }) => (
  <Icon size={size} strokeWidth={1.6} style={{ color: 'currentColor' }} />
)

export default NavIcon
