import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const Login = () => {
  const { login } = useAuth()
  const { theme } = useTheme()
  const navigate  = useNavigate()
  const isDark    = theme === 'dark'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please enter your email and password.'); return }

    setLoading(true)
    try {
      const user = await login(email, password)
      const dest = { creator: '/creator', brand: '/brand', admin: '/admin' }[user.role] || '/'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `w-full bg-transparent border-b pb-2 text-sm focus:outline-none transition-colors placeholder:opacity-30 ${
    isDark ? 'border-white/10 text-white focus:border-white' : 'border-black/10 text-zinc-900 focus:border-black'
  }`
  const labelClass = `text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`

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
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className={labelClass}>Email Address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </div>
          </form>

          <p className={`text-center text-xs font-light ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-500 hover:text-orange-400 transition-colors">Sign up free</Link>
          </p>

          {/* Quick hint for admin */}
          <p className={`text-center text-[10px] ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`}>
            Admin: admin@flextag.com / admin123
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
