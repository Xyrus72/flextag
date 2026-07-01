import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useTheme } from '../context/ThemeContext'

const MainLayout = () => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen flex flex-col relative overflow-x-hidden ${isDark ? 'bg-black' : 'bg-[#fafafa]'}`}>
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Ambient glow blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] glow-blue rounded-full pointer-events-none blur-3xl z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] glow-orange rounded-full pointer-events-none blur-3xl z-0" />

      <Navbar />
      <main className="flex-1 pt-20 relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default MainLayout
