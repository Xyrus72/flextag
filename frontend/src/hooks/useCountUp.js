import { useEffect, useRef, useState } from 'react'

/**
 * Counts from 0 up to `value`, once — the first time a real (non-zero) value
 * arrives, e.g. the loading -> loaded transition on a dashboard. Any later
 * change (a range toggle, a refetch, a live socket update) swaps the display
 * straight to the new value with no animation: recounting a number the user
 * is comparing would imply the money moved, which it didn't.
 */
export function useCountUp(value, { duration = 600 } = {}) {
  const target = Number(value) || 0
  const [display, setDisplay] = useState(target)
  const animatedOnce = useRef(false)

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (animatedOnce.current || target <= 0 || reduced) {
      if (target > 0) animatedOnce.current = true
      setDisplay(target)
      return undefined
    }
    animatedOnce.current = true
    let frame
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      setDisplay(Math.round((1 - (1 - p) ** 3) * target))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return display
}
