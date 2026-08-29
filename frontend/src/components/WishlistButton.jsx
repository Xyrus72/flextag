import { useState } from 'react'
import { addToWishlist, removeFromWishlist } from '../services/users'

/**
 * Save-for-later heart.
 *
 * Optimistic: the heart fills the instant it is tapped and only rolls back if
 * the server refuses — a saved product is a low-stakes action and waiting a
 * round-trip to see it register feels broken.
 *
 * Sits inside product cards that are themselves links, so it stops the click
 * from navigating.
 */
const WishlistButton = ({ productId, saved = false, onChange = null, size = 20, floating = false }) => {
  const [isSaved, setIsSaved] = useState(saved)
  const [busy, setBusy] = useState(false)

  const toggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    const next = !isSaved
    setIsSaved(next)
    setBusy(true)
    try {
      const d = next ? await addToWishlist(productId) : await removeFromWishlist(productId)
      onChange?.(d.ids || [], next)
    } catch {
      setIsSaved(!next)   // server said no — put the heart back
    } finally {
      setBusy(false)
    }
  }

  return (
    <button onClick={toggle} title={isSaved ? 'Remove from wishlist' : 'Save for later'}
      aria-label={isSaved ? 'Remove from wishlist' : 'Save for later'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size + 16, height: size + 16, borderRadius: 999, cursor: 'pointer', lineHeight: 0,
        background: floating ? 'rgba(0,0,0,0.35)' : 'rgba(var(--ink-rgb),0.05)',
        border: `1px solid ${isSaved ? 'rgba(236,72,153,0.45)' : 'rgba(var(--ink-rgb),0.1)'}`,
        backdropFilter: floating ? 'blur(6px)' : 'none',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
        transform: busy ? 'scale(0.92)' : 'scale(1)',
      }}>
      <svg width={size} height={size} viewBox="0 0 24 24"
        fill={isSaved ? '#ec4899' : 'transparent'}
        stroke={isSaved ? '#ec4899' : (floating ? '#fff' : 'rgba(var(--ink-rgb),0.45)')} strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}

export default WishlistButton
