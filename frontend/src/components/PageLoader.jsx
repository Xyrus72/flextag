import React, { useState, useEffect } from 'react'

/**
 * Full-screen animated intro loader shown once per session.
 * Fades out after ~1.8s, letting the page animate in.
 */
const PageLoader = ({ onDone }) => {
  const [phase, setPhase] = useState(0)  // 0=in, 1=hold, 2=out
  const [pct, setPct]     = useState(0)

  useEffect(() => {
    // Counter up
    let frame
    const start = performance.now()
    const duration = 1200
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setPct(Math.round(eased * 100))
      if (p < 1) frame = requestAnimationFrame(tick)
      else {
        setTimeout(() => {
          setPhase(2)
          setTimeout(onDone, 600)
        }, 150)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#030303] overflow-hidden"
      style={{
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        opacity:   phase === 2 ? 0 : 1,
        transform: phase === 2 ? 'scale(1.04)' : 'scale(1)',
        pointerEvents: phase === 2 ? 'none' : 'all',
      }}>

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,107,53,0.07) 0%, transparent 60%)' }} />

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      {/* 3D ring */}
      <div className="relative w-32 h-32 mb-10" style={{ perspective: '500px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i}
            className="absolute inset-0 rounded-full border border-orange-500/30"
            style={{
              animation: `spin3d ${6 + i * 2}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
              transform: `rotateX(${55 + i * 20}deg)`,
            }} />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white text-3xl font-black italic shadow-2xl shadow-orange-500/40"
            style={{ animation: 'floatY 2s ease-in-out infinite' }}>
            F
          </div>
        </div>
      </div>

      {/* Brand name */}
      <h1 className="text-4xl font-black italic tracking-tighter text-white mb-1">
        FlexTag<span className="text-orange-500">™</span>
      </h1>
      <p className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] mb-10">Shop · Share · Earn</p>

      {/* Progress bar */}
      <div className="w-48 h-px bg-white/5 rounded-full overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 rounded-full grad-animate"
          style={{ width: `${pct}%`, transition: 'width 0.05s linear' }} />
      </div>
      <p className="text-[10px] text-zinc-700 mt-3 font-mono tabular-nums">{pct}%</p>
    </div>
  )
}

export default PageLoader
