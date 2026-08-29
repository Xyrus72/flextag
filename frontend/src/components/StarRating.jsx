/**
 * Stars, read-only or clickable.
 *
 * One component for both so a rating always LOOKS the same whether it is being
 * given or read back — the only difference is whether the stars respond.
 */
const Star = ({ filled, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? color : 'transparent'} stroke={filled ? color : 'rgba(var(--ink-rgb),0.25)'} strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const StarRating = ({ value = 0, onChange = null, size = 16, color = '#fbbf24', label = '' }) => {
  const readOnly = !onChange
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {label && <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.45)', minWidth: 72 }}>{label}</span>}
      <span style={{ display: 'inline-flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(n => (
          readOnly ? (
            <Star key={n} filled={n <= Math.round(value)} size={size} color={color} />
          ) : (
            <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n === 1 ? '' : 's'}`}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}>
              <Star filled={n <= value} size={size} color={color} />
            </button>
          )
        ))}
      </span>
    </span>
  )
}

export default StarRating
