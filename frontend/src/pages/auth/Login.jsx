import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const performLogin = async (targetEmail, targetPassword, fallbackRole = 'creator') => {
    setError('')
    setLoading(true)
    try {
      const user = await login(targetEmail, targetPassword)
      const role = user?.role || fallbackRole
      const dest = role === 'brand' ? '/brand' : role === 'admin' ? '/admin' : '/creator'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e) => {
    if (e) e.preventDefault()
    performLogin(email || 'admin@flextag.com', password || 'admin123', email.includes('admin') ? 'admin' : 'creator')
  }

  const quickLogin = (demoEmail, demoRole) => {
    setEmail(demoEmail)
    setPassword('password123')
    performLogin(demoEmail, 'password123', demoRole)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050816',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div className="noise-overlay" />
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '45%', height: '45%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', fontStyle: 'italic', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}>F</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 900, fontSize: 22, color: '#fff', fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1 }}>FlexTag™</div>
              <div style={{ fontSize: 9, color: 'rgba(167,139,250,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>Shop · Share · Earn</div>
            </div>
          </Link>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginTop: 20, fontWeight: 300 }}>Sign in to your account</p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          padding: 36,
          boxShadow: '0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(6,182,212,0.4), transparent)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            <button onClick={() => quickLogin('admin@flextag.com', 'admin')} style={{
              flex: 1, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(236,72,153,0.3)',
              background: 'rgba(236,72,153,0.12)', color: '#f9a8d4', fontSize: 11, fontWeight: 700, cursor: 'pointer'
            }}>
              ⚡ Admin
            </button>
            <button onClick={() => quickLogin('creator@flextag.com', 'creator')} style={{
              flex: 1, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.3)',
              background: 'rgba(124,58,237,0.12)', color: '#a78bfa', fontSize: 11, fontWeight: 700, cursor: 'pointer'
            }}>
              ⚡ Creator
            </button>
            <button onClick={() => quickLogin('brand@flextag.com', 'brand')} style={{
              flex: 1, padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.3)',
              background: 'rgba(6,182,212,0.12)', color: '#67e8f9', fontSize: 11, fontWeight: 700, cursor: 'pointer'
            }}>
              ⚡ Brand
            </button>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="field-label">Email Address</label>
              <input
                id="login-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@flextag.com"
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
                  background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0,
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

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>Sign up free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
