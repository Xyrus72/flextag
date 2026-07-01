import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const Footer = () => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <footer className={`py-12 px-6 relative z-20 border-t ${isDark ? 'border-white/10 bg-black' : 'border-black/5 bg-white'}`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <Link to="/" className="flex items-center gap-2 group">
          <span className={`text-xl font-medium tracking-tight italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>Flextag</span>
          <span className="text-[10px] font-normal uppercase tracking-widest text-orange-500 leading-tight">
            Shop · Share · Earn
          </span>
        </Link>

        <div className={`flex items-center gap-6 text-[10px] font-normal uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          <span className={`cursor-pointer transition-colors ${isDark ? 'hover:text-white' : 'hover:text-zinc-900'}`}>Privacy</span>
          <span className={`cursor-pointer transition-colors ${isDark ? 'hover:text-white' : 'hover:text-zinc-900'}`}>Terms</span>
          <span>© {new Date().getFullYear()} Flextag</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
