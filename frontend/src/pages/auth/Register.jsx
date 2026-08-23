import { Fragment, useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/AuthShell'
import { precheckInstagram } from '../../services/instagram'

const steps = ['Account Type', 'Personal Info', 'Profile Details', 'Verify Email', 'Done']

// ─── Instagram handle helpers ─────────────────────────────────────────────────
const HANDLE_RE = /^[a-z0-9._]{1,30}$/

/** "@Handle", "https://www.instagram.com/Handle/?x=y" → "handle" (lowercase, [a-z0-9._], ≤ 30 chars) */
const normalizeHandle = (raw = '') =>
  raw
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\//i, '')
    .split(/[/?#]/)[0]
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30)

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

// ─── Instagram precheck confirmation (shown on the OTP step for creators) ─────
const IgPrecheckCard = ({ data }) => {
  const [picFailed, setPicFailed] = useState(false)
  const username  = data.username || ''
  const followers = Number(data.followers) || 0
  const showPic   = !!data.profilePicUrl && !picFailed

  return (
    <div id="ig-precheck-card" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14,
      background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', fontWeight: 800, fontSize: 16,
      }}>
        {showPic
          ? <img src={data.profilePicUrl} alt="" referrerPolicy="no-referrer" onError={() => setPicFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (username[0] || '?').toUpperCase()}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{username}</span>
          {data.isVerified && <span className="badge badge-info" style={{ flexShrink: 0 }}>Verified</span>}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
          {followers.toLocaleString()} followers · <span style={{ color: '#4ade80', fontWeight: 600 }}>Public ✓</span>
        </p>
      </div>
    </div>
  )
}

const IgUnavailableNote = () => (
  <div id="ig-precheck-note" style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
    <p style={{ fontSize: 12, color: 'rgba(103,232,249,0.85)', margin: 0, lineHeight: 1.6 }}>
      We couldn't reach Instagram right now — we'll verify your account after signup.
    </p>
  </div>
)

// Advisory mode (admin setting): the account doesn't meet the bar, but signup is allowed and flagged for review.
const IgAdvisoryNote = ({ handle, text }) => (
  <div id="ig-precheck-advisory" style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
    <p style={{ fontSize: 12, color: '#fbbf24', margin: 0, lineHeight: 1.6 }}>
      Heads-up on @{handle}: {text} You can still sign up — an admin will review your account.
    </p>
  </div>
)

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

  // Instagram precheck (creators): null | precheck payload ({ ok, eligible, followers, … }) | { unavailable: true }
  const [precheck, setPrecheck] = useState(null)
  const [checking, setChecking] = useState(false)

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    instagramHandle: '', tiktokHandle: '',
    companyName: '', website: '', productCategory: 'Beauty',
  })

  const set = k => e => {
    const { value } = e.target
    setForm(f => ({ ...f, [k]: value }))
  }

  // Keep what the user types (so a pasted/typed profile URL survives); full normalization
  // happens on blur and again right before the check, never mid-keystroke.
  const onHandleChange = e => {
    const value = e.target.value.replace(/\s+/g, '')
    setForm(f => ({ ...f, instagramHandle: value }))
    setPrecheck(null)   // a changed handle invalidates any previous check
  }
  const onHandleBlur = () => setForm(f => ({ ...f, instagramHandle: normalizeHandle(f.instagramHandle) }))

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
    if (step === 2 && role === 'creator') {
      if (!HANDLE_RE.test(normalizeHandle(form.instagramHandle))) return 'Enter your Instagram handle.'
    }
    if (step === 3) {
      if (otp.length < 6) return 'Please enter the complete 6-digit code.'
    }
    return null
  }

  /**
   * Creator Instagram eligibility check (step 2).
   * Returns the precheck payload to carry into the OTP step, `{ unavailable: true }` for a soft pass
   * (Instagram or our checker is down — never block signup for that), or null when the user must
   * fix the handle (error already shown).
   */
  const runPrecheck = async (handle) => {
    setChecking(true)
    try {
      const res = await precheckInstagram(handle)
      if (res?.ok) {
        if (!res.exists) {
          setError(`We couldn't find @${handle} on Instagram. Check the spelling.`)
          return null
        }
        if (!res.eligible) {
          const reasonsText = res.reasons?.length ? res.reasons.join(' · ') : "This Instagram account isn't eligible for FlexTag yet."
          // Advisory mode: the server will let the signup through — warn instead of blocking.
          if (res.enforce === false) return { ...res, advisory: true, reasonsText }
          setError(reasonsText)
          return null
        }
        return res
      }
      if (res?.reason === 'not_found') {
        setError(res.message || `We couldn't find @${handle} on Instagram. Check the spelling.`)
        return null
      }
      return { unavailable: true }
    } catch (e) {
      const status = e.response?.status
      if (status === 429 || status === 400) {
        // Our own limiter / validation — not an outage, so don't soft-pass.
        setError(e.response?.data?.message || 'Too many checks — wait a minute and try again.')
        return null
      }
      return { unavailable: true }
    } finally {
      setChecking(false)
    }
  }

  const next = async () => {
    setError('')
    const err = validate()
    if (err) { setError(err); return }

    // Step 0 → 1 and Step 1 → 2: just advance
    if (step < 2) { setStep(step + 1); return }

    // Step 2 → 3: (creators) check the Instagram handle, then send OTP email
    if (step === 2) {
      let igResult = null
      if (role === 'creator') {
        const handle = normalizeHandle(form.instagramHandle)
        setForm(f => ({ ...f, instagramHandle: handle }))
        igResult = await runPrecheck(handle)
        if (igResult === null) return   // blocked — stay on step 2 so they can fix the handle
      }
      setPrecheck(igResult)
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
          followersCount: precheck?.followers ?? 0,
          tiktokHandle: form.tiktokHandle,
          companyName: form.companyName, website: form.website,
          productCategory: form.productCategory,
          referralCode: params.get('ref') || undefined,
        })
        setStep(4)
      } catch (e) {
        const data = e.response?.data
        if (e.response?.status === 403 && Array.isArray(data?.reasons)) {
          // Server-side Instagram enforcement — send the creator back to fix the handle
          // (the server message already includes the reasons)
          setError(data.message || data.reasons.join(' · '))
          setPrecheck(null)
          setStep(2)
        } else {
          setError(data?.message || 'Verification failed. Please try again.')
        }
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
    <AuthShell tagline="Create your free account">
        {/* Step progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <Fragment key={i}>
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
            </Fragment>
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
                  <label className="field-label">Instagram Handle</label>
                  <input
                    id="reg-instagram"
                    value={form.instagramHandle}
                    onChange={onHandleChange}
                    onBlur={onHandleBlur}
                    placeholder="@yourhandle"
                    className="field-input"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={80}
                  />
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '8px 0 0', lineHeight: 1.5 }}>
                    Must be a public account with 1,000+ followers
                  </p>
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

              {/* Instagram precheck outcome (creators only) */}
              {precheck?.ok && precheck.eligible && <IgPrecheckCard data={precheck} />}
              {precheck?.advisory && <IgAdvisoryNote handle={precheck.username || form.instagramHandle} text={precheck.reasonsText} />}
              {precheck?.unavailable && <IgUnavailableNote />}

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
            <button id="register-next" onClick={next} disabled={loading || checking} className="btn-primary" style={{ flex: 1, padding: '14px' }}>
              {loading || checking ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {checking ? `Checking @${form.instagramHandle} on Instagram…` : step === 2 ? 'Sending…' : step === 3 ? 'Verifying…' : 'Creating…'}</>
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
    </AuthShell>
  )
}

export default Register
