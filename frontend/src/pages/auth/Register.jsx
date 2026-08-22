import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const steps = ['Account Type', 'Personal Info', 'Profile Details', 'Verify Email', 'Done']

// ─── 6-digit OTP input component ──────────────────────────────────────────────
const OtpInput = ({ value, onChange }) => {
  const inputRefs = useRef([])
  const digits = value.split('')

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = [...digits]
        next[i] = ''
        onChange(next.join(''))
      } else if (i > 0) {
        inputRefs.current[i - 1]?.focus()
      }
    }
  }

  const handleChange = (i, e) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1)
    if (!ch) return
    const next = [...digits]
    next[i] = ch
    onChange(next.join(''))
    if (i < 5) inputRefs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length) {
      onChange(pasted.padEnd(6, '').slice(0, 6))
      inputRefs.current[Math.min(pasted.length, 5)]?.focus()
    }
    e.preventDefault()
  }

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }} onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          id={`otp-digit-${i}`}
          ref={el => { inputRefs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onFocus={e => e.target.select()}
          style={{
            width: 52, height: 60, borderRadius: 14, textAlign: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff', caretColor: '#7c3aed',
            background: digits[i] ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)',
            border: digits[i] ? '2px solid rgba(124,58,237,0.5)' : '2px solid rgba(255,255,255,0.08)',
            outline: 'none', transition: 'all 0.2s',
            boxShadow: digits[i] ? '0 0 16px rgba(124,58,237,0.2)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

// ─── Register page ─────────────────────────────────────────────────────────────
const Register = () => {
  const { sendOtp, verifyOtp } = useAuth()
  const navigate     = useNavigate()
  const [params]     = useSearchParams()
  const defaultRole  = params.get('role') === 'brand' ? 'brand' : 'creator'

  const [step, setStep]       = useState(0)
  const [role, setRole]       = useState(defaultRole)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [otp, setOtp]         = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    instagramHandle: '', followersCount: '', tiktokHandle: '',
    companyName: '', website: '', productCategory: 'Beauty',
  })

  const set = k => e => setForm({ ...form, [k]: e.target.value })

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const validate = () => {
    if (step === 1) {
      if (!form.name.trim())  return 'Full name is required.'
      if (!form.email.trim()) return 'Email address is required.'
      if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters.'
    }
    if (step === 3) {
      if (otp.length < 6) return 'Please enter the complete 6-digit code.'
    }
    return null
  }

  const next = async () => {
    setError('')
    const err = validate()
    if (err) { setError(err); return }

    // Step 0 → 1 and Step 1 → 2: just advance
    if (step < 2) { setStep(step + 1); return }

    // Step 2 → 3: send OTP email
    if (step === 2) {
      setLoading(true)
      try {
        await sendOtp(form.email)
        setOtp('')
        setResendCooldown(60)
        setStep(3)
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to send OTP. Please try again.')
      } finally {
        setLoading(false)
      }
      return
    }

    // Step 3 → 4: verify OTP + create account
    if (step === 3) {
      setLoading(true)
      try {
        await verifyOtp({
          otp,
          name: form.name, email: form.email, password: form.password,
          phone: form.phone, role,
          instagramHandle: form.instagramHandle,
          followersCount: form.followersCount ? Number(form.followersCount) : 0,
          tiktokHandle: form.tiktokHandle,
          companyName: form.companyName, website: form.website,
          productCategory: form.productCategory,
        })
        setStep(4)
      } catch (e) {
        setError(e.response?.data?.message || 'Verification failed. Please try again.')
      } finally {
        setLoading(false)
      }
      return
    }

    // Step 4 (Done): go to dashboard
    if (step === 4) {
      navigate({ creator: '/creator', brand: '/brand' }[role] || '/', { replace: true })
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await sendOtp(form.email)
      setOtp('')
      setResendCooldown(60)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to resend OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050816',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div className="noise-overlay" />
      <div style={{ position: 'fixed', top: '-10%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-10%', width: '45%', height: '45%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div style={{ width: '100%', maxWidth: 500, position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', fontStyle: 'italic', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}>F</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 900, fontSize: 22, color: '#fff', fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1 }}>FlexTag™</div>
              <div style={{ fontSize: 9, color: 'rgba(167,139,250,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>Create free account</div>
            </div>
          </Link>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, fontWeight: 800, transition: 'all 0.3s',
                  background: step > i ? 'linear-gradient(135deg,#22c55e,#16a34a)' : step === i ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.05)',
                  color: step > i || step === i ? '#fff' : 'rgba(255,255,255,0.2)',
                  border: step > i || step === i ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: step === i ? '0 0 16px rgba(124,58,237,0.4)' : 'none',
                }}>
                  {step > i ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: step === i ? '#fff' : 'rgba(255,255,255,0.2)',
                  display: 'none',
                }} className="sm:block">{s}</span>
              </div>
              {i < 4 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 6px', borderRadius: 1, transition: 'all 0.4s',
                  background: step > i ? 'linear-gradient(90deg,#22c55e,#7c3aed)' : 'rgba(255,255,255,0.06)',
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24,
          padding: 36, boxShadow: '0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(6,182,212,0.4), transparent)', pointerEvents: 'none' }} />

          {/* Step 0 — Account Type */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>Choose Account Type</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { r: 'creator', icon: '🎯', title: 'Creator', desc: 'Shop products and earn cashback by sharing authentic content', color: '#7c3aed' },
                  { r: 'brand',   icon: '🏢', title: 'Brand',   desc: 'Launch performance-based campaigns with verified influencers', color: '#06b6d4' },
                ].map(o => (
                  <button key={o.r} id={`role-${o.r}`} onClick={() => setRole(o.r)} style={{
                    padding: 24, borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                    background: role === o.r ? `rgba(${o.r === 'creator' ? '124,58,237' : '6,182,212'},0.08)` : 'rgba(255,255,255,0.03)',
                    border: role === o.r ? `2px solid rgba(${o.r === 'creator' ? '124,58,237' : '6,182,212'},0.4)` : '2px solid rgba(255,255,255,0.07)',
                    transition: 'all 0.2s', boxShadow: role === o.r ? `0 0 24px rgba(${o.r === 'creator' ? '124,58,237' : '6,182,212'},0.15)` : 'none',
                  }}>
                    <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>{o.icon}</span>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{o.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Personal Info */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>Personal Info</h2>
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your full name', id: 'reg-name' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'you@example.com', id: 'reg-email' },
                { label: 'Password', key: 'password', type: 'password', placeholder: 'Min. 6 characters', id: 'reg-password', autoComplete: 'new-password' },
                { label: 'Phone Number (optional)', key: 'phone', type: 'tel', placeholder: '+880 1700-000000', id: 'reg-phone' },
              ].map(f => (
                <div key={f.key}>
                  <label className="field-label">{f.label}</label>
                  <input id={f.id} type={f.type} value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder} className="field-input" autoComplete={f.autoComplete} />
                </div>
              ))}
            </div>
          )}

          {/* Step 2 — Profile Details */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
                {role === 'creator' ? 'Social Profile' : 'Company Info'}
              </h2>
              {role === 'creator' ? (
                <div>
                  <label className="field-label">Instagram Handle (optional)</label>
                  <input id="reg-instagram" value={form.instagramHandle} onChange={set('instagramHandle')} placeholder="@yourhandle" className="field-input" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="field-label">Company Name</label>
                    <input id="reg-company" value={form.companyName} onChange={set('companyName')} placeholder="Acme Ltd." className="field-input" />
                  </div>
                  <div>
                    <label className="field-label">Website</label>
                    <input id="reg-website" value={form.website} onChange={set('website')} placeholder="https://yourcompany.com" className="field-input" />
                  </div>
                  <div>
                    <label className="field-label">Product Category</label>
                    <select id="reg-category" value={form.productCategory} onChange={set('productCategory')} className="field-select">
                      {['Beauty', 'Fashion', 'Tech', 'Lifestyle', 'Food & Grocery'].map(c => (
                        <option key={c} value={c} style={{ background: '#0d0d20', color: '#fff' }}>{c}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3 — Verify Email (OTP) */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Icon */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                  background: 'rgba(124,58,237,0.1)', border: '2px solid rgba(124,58,237,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, boxShadow: '0 0 32px rgba(124,58,237,0.2)',
                }}>✉️</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                  Check your inbox
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.7 }}>
                  We sent a 6-digit verification code to<br />
                  <strong style={{ color: 'rgba(167,139,250,0.8)' }}>{form.email}</strong>
                </p>
              </div>

              {/* OTP Inputs */}
              <OtpInput value={otp} onChange={setOtp} />

              {/* Resend */}
              <div style={{ textAlign: 'center' }}>
                {resendCooldown > 0 ? (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                    Resend code in <strong style={{ color: 'rgba(167,139,250,0.6)' }}>{resendCooldown}s</strong>
                  </p>
                ) : (
                  <button
                    id="otp-resend"
                    onClick={handleResend}
                    disabled={loading}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: '#a78bfa', fontWeight: 600, padding: 0,
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    Didn't receive it? Resend code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 36, boxShadow: '0 0 40px rgba(34,197,94,0.2)' }}>🎉</div>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>You're all set!</h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>Your email is verified and account is ready. Let's get started!</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', marginTop: 8 }}>
              <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            {step > 0 && step < 4 && (
              <button onClick={() => { setError(''); setStep(step - 1) }} className="btn-ghost" style={{ flex: 1 }}>← Back</button>
            )}
            <button id="register-next" onClick={next} disabled={loading} className="btn-primary" style={{ flex: 1, padding: '14px' }}>
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {step === 2 ? 'Sending…' : step === 3 ? 'Verifying…' : 'Creating…'}</>
              ) : step === 4 ? 'Enter Dashboard →' : step === 3 ? 'Verify & Create Account →' : step === 2 ? 'Send Verification Code →' : 'Continue →'}
            </button>
          </div>

          {step === 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 20 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Register
