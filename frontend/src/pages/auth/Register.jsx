import { Fragment, useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/AuthShell'
import { precheckInstagram } from '../../services/instagram'
import { UserRound, Building2, Mail, PartyPopper, Check, ArrowLeft, ArrowRight } from 'lucide-react'

const steps = ['Account type', 'Personal info', 'Profile details', 'Verify email', 'Done']

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
          className="otp-digit"
          style={{
            width: 52, height: 60, borderRadius: 14, textAlign: 'center',
            fontSize: 24, fontWeight: 800, color: 'var(--text)', caretColor: '#7c3aed',
            background: digits[i] ? 'rgba(124,58,237,0.12)' : 'rgba(var(--ink-rgb),0.04)',
            border: digits[i] ? '2px solid rgba(124,58,237,0.5)' : '2px solid rgba(var(--ink-rgb),0.08)',
            transition: 'all 0.2s',
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
        background: 'var(--purple)', color: '#fff', fontWeight: 800, fontSize: 16,
      }}>
        {showPic
          ? <img src={data.profilePicUrl} alt="" referrerPolicy="no-referrer" onError={() => setPicFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (username[0] || '?').toUpperCase()}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{username}</span>
          {data.isVerified && <span className="badge badge-info" style={{ flexShrink: 0 }}>Verified</span>}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.45)', margin: '2px 0 0' }}>
          {followers.toLocaleString()} followers · <span style={{ color: 'var(--green-ink)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}>Public <Check size={11} strokeWidth={3} /></span>
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
    <p style={{ fontSize: 12, color: 'var(--amber-ink)', margin: 0, lineHeight: 1.6 }}>
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
  const [showPass, setShowPass] = useState(false)

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
        <style>{`
          .otp-digit { outline: none; }
          .otp-digit:focus { border-color: rgba(124,58,237,0.6); box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
        `}</style>
        {/* Step progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <Fragment key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, fontWeight: 800, transition: 'all 0.3s',
                  background: step > i ? 'var(--success)' : step === i ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.05)',
                  color: step > i || step === i ? '#fff' : 'rgba(var(--ink-rgb),0.2)',
                  border: step > i || step === i ? 'none' : '1px solid rgba(var(--ink-rgb),0.1)',
                }}>
                  {step > i ? <Check size={14} strokeWidth={3} /> : i + 1}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: step === i ? 'var(--violet-ink)' : 'rgba(var(--ink-rgb),0.2)',
                }} className="hidden sm:block">{s}</span>
              </div>
              {i < 4 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 6px', borderRadius: 1, transition: 'all 0.4s',
                  background: step > i ? 'var(--success)' : 'rgba(var(--ink-rgb),0.06)',
                }} />
              )}
            </Fragment>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(var(--ink-rgb),0.04)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 16,
          padding: 36, boxShadow: '0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(var(--ink-rgb),0.06)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(6,182,212,0.4), transparent)', pointerEvents: 'none' }} />

          {/* Step 0 — Account Type */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>Choose account type</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { r: 'creator', Icon: UserRound, title: 'Creator', desc: 'Shop products and earn cashback by sharing authentic content', color: '#7c3aed' },
                  { r: 'brand',   Icon: Building2, title: 'Brand',   desc: 'Launch performance-based campaigns with verified influencers', color: '#06b6d4' },
                ].map(o => (
                  <button key={o.r} id={`role-${o.r}`} onClick={() => setRole(o.r)} style={{
                    padding: 24, borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                    background: role === o.r ? `rgba(${o.r === 'creator' ? '124,58,237' : '6,182,212'},0.08)` : 'rgba(var(--ink-rgb),0.03)',
                    border: role === o.r ? `2px solid rgba(${o.r === 'creator' ? '124,58,237' : '6,182,212'},0.4)` : '2px solid rgba(var(--ink-rgb),0.07)',
                    transition: 'all 0.2s',
                  }}>
                    <o.Icon size={32} strokeWidth={1.75} style={{ display: 'block', marginBottom: 12, color: o.color }} />
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{o.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)', lineHeight: 1.6, margin: 0 }}>{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Personal Info */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>Personal info</h2>
              {[
                { label: 'Full name', key: 'name', type: 'text', placeholder: 'Your full name', id: 'reg-name' },
                { label: 'Email address', key: 'email', type: 'email', placeholder: 'you@example.com', id: 'reg-email' },
                { label: 'Password', key: 'password', type: 'password', placeholder: 'Min. 6 characters', id: 'reg-password', autoComplete: 'new-password' },
                { label: 'Phone number (optional)', key: 'phone', type: 'tel', placeholder: '+880 1700-000000', id: 'reg-phone' },
              ].map(f => (
                <div key={f.key}>
                  <label className="field-label">{f.label}</label>
                  {f.key === 'password' ? (
                    <div style={{ position: 'relative' }}>
                      <input
                        id={f.id} type={showPass ? 'text' : 'password'} value={form.password}
                        onChange={set('password')} placeholder={f.placeholder} className="field-input"
                        style={{ paddingRight: 44 }} autoComplete={f.autoComplete}
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
                  ) : (
                    <input id={f.id} type={f.type} value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder} className="field-input" autoComplete={f.autoComplete} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 2 — Profile Details */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
                {role === 'creator' ? 'Social profile' : 'Company info'}
              </h2>
              {role === 'creator' ? (
                <div>
                  <label className="field-label">Instagram handle</label>
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
                  <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)', margin: '8px 0 0', lineHeight: 1.5 }}>
                    Must be a public account with 1,000+ followers
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="field-label">Company name</label>
                    <input id="reg-company" value={form.companyName} onChange={set('companyName')} placeholder="Acme Ltd." className="field-input" />
                  </div>
                  <div>
                    <label className="field-label">Website</label>
                    <input id="reg-website" value={form.website} onChange={set('website')} placeholder="https://yourcompany.com" className="field-input" />
                  </div>
                  <div>
                    <label className="field-label">Product category</label>
                    <select id="reg-category" value={form.productCategory} onChange={set('productCategory')} className="field-select">
                      {['Beauty', 'Fashion', 'Tech', 'Lifestyle', 'Food & Grocery'].map(c => (
                        <option key={c} value={c} style={{ background: 'var(--bg-2)', color: 'var(--text)' }}>{c}</option>
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
                }}>
                  <Mail size={28} strokeWidth={1.75} style={{ color: 'var(--violet-ink)' }} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                  Check your inbox
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.4)', margin: 0, lineHeight: 1.7 }}>
                  We sent a 6-digit verification code to<br />
                  <strong style={{ color: 'var(--violet-ink)' }}>{form.email}</strong>
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
                  <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.3)', margin: 0 }}>
                    Resend code in <strong style={{ color: 'var(--violet-ink)' }}>{resendCooldown}s</strong>
                  </p>
                ) : (
                  <button
                    id="otp-resend"
                    onClick={handleResend}
                    disabled={loading}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--violet-ink)', fontWeight: 600, padding: 0,
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
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <PartyPopper size={36} strokeWidth={1.75} style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>You're all set!</h2>
                <p style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),0.4)', margin: 0, lineHeight: 1.6 }}>Your email is verified and account is ready. Let's get started!</p>
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
              <button onClick={() => { setError(''); setStep(step - 1) }} className="btn-ghost" style={{ flex: 1 }}><ArrowLeft size={15} strokeWidth={2} /> Back</button>
            )}
            <button id="register-next" onClick={next} disabled={loading || checking} className="btn-primary" style={{ flex: 1, padding: '14px' }}>
              {loading || checking ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {checking ? `Checking @${form.instagramHandle} on Instagram…` : step === 2 ? 'Sending…' : step === 3 ? 'Verifying…' : 'Creating…'}</>
              ) : step === 4 ? <>Enter dashboard <ArrowRight size={15} strokeWidth={2} /></> : step === 3 ? <>Verify and create account <ArrowRight size={15} strokeWidth={2} /></> : step === 2 ? <>Send verification code <ArrowRight size={15} strokeWidth={2} /></> : <>Continue <ArrowRight size={15} strokeWidth={2} /></>}
            </button>
          </div>

          {step === 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(var(--ink-rgb),0.3)', marginTop: 20 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--violet-ink)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
            </p>
          )}
        </div>
    </AuthShell>
  )
}

export default Register
