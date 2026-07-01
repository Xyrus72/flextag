import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const Login = () => {
  const { login } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'dark'
  const [role, setRole] = useState('creator')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const user = await login(role)
    setLoading(false)
    const dest = { creator: '/creator', brand: '/brand', admin: '/admin' }[user.role]
    navigate(dest)
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-6 relative overflow-hidden ${isDark ? 'bg-black' : 'bg-[#fafafa]'}`}>
      {/* Noise */}
      <div className="noise-overlay" />
      {/* Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] glow-blue rounded-full pointer-events-none blur-3xl z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] glow-orange rounded-full pointer-events-none blur-3xl z-0" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <span className={`text-3xl font-medium tracking-tight italic ${isDark ? 'text-white group-hover:text-orange-400' : 'text-zinc-900 group-hover:text-orange-500'} transition-colors duration-500`}>Flextag</span>
            <span className="text-[10px] font-normal uppercase tracking-widest text-orange-500 leading-tight flex flex-col opacity-80">
              <span>Shop</span><span>Share · Earn</span>
            </span>
          </Link>
          <p className={`text-sm font-light mt-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Sign in to your account</p>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-6">
          {/* Role selector */}
          <div>
            <label className={`text-[10px] uppercase tracking-widest font-medium block mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Sign in as</label>
            <div className={`flex gap-2 p-1 rounded-xl border ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-black/[0.02]'}`}>
              {['creator', 'brand', 'admin'].map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium uppercase tracking-widest transition-all capitalize
                    ${role === r
                      ? 'bg-orange-500/90 text-white shadow-lg shadow-orange-500/20'
                      : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                    }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Email Address</label>
              <input type="email" defaultValue={`${role}@example.com`}
                className={`w-full bg-transparent border-b pb-2 text-sm focus:outline-none transition-colors placeholder:opacity-30 ${isDark ? 'border-white/10 text-white focus:border-white' : 'border-black/10 text-zinc-900 focus:border-black'}`}
                placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <label className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Password</label>
              <input type="password" defaultValue="••••••••"
                className={`w-full bg-transparent border-b pb-2 text-sm focus:outline-none transition-colors ${isDark ? 'border-white/10 text-white focus:border-white' : 'border-black/10 text-zinc-900 focus:border-black'}`} />
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50">
                {loading ? 'Signing in...' : `Continue as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
              </button>
            </div>
          </form>

          <p className={`text-center text-xs font-light ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-500 hover:text-orange-400 transition-colors">Sign up free</Link>
          </p>
        </div>

        <p className={`text-center text-[10px] mt-8 ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>
          Demo mode — click Continue to enter the platform
        </p>
      </div>
    </div>
  )
}

export default Login
