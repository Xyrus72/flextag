import { useState, useEffect } from 'react'
import Logo from './Logo'

/**
 * Full-screen intro shown once per session: the mark, a thin progress line,
 * a quiet fade. No fake percentage readout, no spinning chrome — the loader's
 * job is to hold the first second gracefully, not to perform.
 */
const PageLoader = ({ onDone }) => {
  const [phase, setPhase] = useState(0)  // 0=in, 2=out
  const [pct, setPct]     = useState(0)

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 1000
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      setPct(Math.round((1 - Math.pow(1 - p, 3)) * 100))
      if (p < 1) frame = requestAnimationFrame(tick)
      else {
        setTimeout(() => {
          setPhase(2)
          setTimeout(onDone, 500)
        }, 120)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'var(--bg)',
        transition: 'opacity 0.5s cubic-bezier(0.2,0,0,1)',
        opacity: phase === 2 ? 0 : 1,
        pointerEvents: phase === 2 ? 'none' : 'all',
      }}>

      {/* The same quiet aurora the app opens on */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 42%, rgba(124,58,237,0.08) 0%, transparent 55%)' }} />

      <div style={{ transform: 'scale(1.35)', marginBottom: 36 }}>
        <Logo />
      </div>

      <div className="w-40 h-px overflow-hidden relative rounded-full" style={{ background: 'rgba(var(--ink-rgb),0.07)' }}>
        <div className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: 'var(--purple)', transition: 'width 0.05s linear' }} />
      </div>
    </div>
  )
}

export default PageLoader
