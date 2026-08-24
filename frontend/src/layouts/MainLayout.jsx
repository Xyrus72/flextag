import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const MainLayout = () => {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      {/* Noise grain overlay */}
      <div className="noise-overlay" />

      {/* Ambient glows — only on non-landing pages (landing manages its own) */}
      {!isLanding && (
      <>
          <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none blur-3xl z-0 opacity-25" style={{ background:'radial-gradient(circle,rgba(124,58,237,0.5) 0%,transparent 70%)' }} />
          <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none blur-3xl z-0 opacity-25" style={{ background:'radial-gradient(circle,rgba(6,182,212,0.4) 0%,transparent 70%)' }} />
        </>
      )}

      <Navbar />

      <main className={`flex-1 relative z-10 ${isLanding ? '' : 'pt-[72px]'}`}>
        <Outlet />
      </main>

      {/* Hide global footer on landing — it has its own built-in footer */}
      {!isLanding && <Footer />}
    </div>
  )
}

export default MainLayout
