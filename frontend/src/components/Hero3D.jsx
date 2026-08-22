import React from 'react'

export default function Hero3D() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '20%', right: '10%', width: '450px', height: '450px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, rgba(6,182,212,0.08) 50%, transparent 70%)',
        filter: 'blur(60px)'
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', left: '5%', width: '350px', height: '350px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(124,58,237,0.05) 50%, transparent 70%)',
        filter: 'blur(50px)'
      }} />
    </div>
  )
}
