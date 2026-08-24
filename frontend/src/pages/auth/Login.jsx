import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/AuthShell'

const Login = () => {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPass, setShowPass] = useState(false)

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

  return (
    <AuthShell tagline="Sign in to your account">
        {/* Card */}
        <div style={{
          background: 'rgba(var(--ink-rgb),0.04)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(var(--ink-rgb),0.08)',
          borderRadius: 24,
          padding: 36,
          boxShadow: '0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(var(--ink-rgb),0.06)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Card top glow */}
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(6,182,212,0.4), transparent)', pointerEvents: 'none' }} />

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="field-label">Email Address</label>
              <input
                id="login-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="field-input"
                autoComplete="email" required
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="field-input"
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password" required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(var(--ink-rgb),0.3)', padding: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {showPass
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>
              </div>
            )}

            <button id="login-submit" type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 13, marginTop: 4 }}>
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in…</>
              ) : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(var(--ink-rgb),0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.3)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}
                onMouseEnter={e => e.target.style.color = '#7c3aed'}
                onMouseLeave={e => e.target.style.color = '#a78bfa'}
              >Sign up free</Link>
            </p>
          </div>

        </div>
    </AuthShell>
  )
}

export default Login
