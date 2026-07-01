import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const steps = ['Account Type', 'Personal Info', 'Social Profile', 'Done']

const Register = () => {
  const { login } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'dark'
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('creator')
  const [form, setForm] = useState({ name: '', email: '', phone: '', instagram: '', followers: '' })

  const set = k => e => setForm({ ...form, [k]: e.target.value })

  const next = async () => {
    if (step < 3) { setStep(step + 1); return }
    const user = await login(role)
    navigate({ creator: '/creator', brand: '/brand' }[role] || '/creator')
  }

  const inputClass = `w-full bg-transparent border-b pb-2 text-sm focus:outline-none transition-colors placeholder:opacity-30 ${isDark ? 'border-white/10 text-white focus:border-white' : 'border-black/10 text-zinc-900 focus:border-black'}`
  const labelClass = `text-[10px] uppercase tracking-widest block mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`

  return (
    <div className={`min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden ${isDark ? 'bg-black' : 'bg-[#fafafa]'}`}>
      <div className="noise-overlay" />
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] glow-blue rounded-full pointer-events-none blur-3xl z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] glow-orange rounded-full pointer-events-none blur-3xl z-0" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <span className={`text-3xl font-medium tracking-tight italic ${isDark ? 'text-white group-hover:text-orange-400' : 'text-zinc-900 group-hover:text-orange-500'} transition-colors duration-500`}>Flextag</span>
            <span className="text-[10px] font-normal uppercase tracking-widest text-orange-500 leading-tight flex flex-col opacity-80">
              <span>Shop</span><span>Share · Earn</span>
            </span>
          </Link>
          <p className={`text-sm font-light mt-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Create your free account</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                  ${step > i ? 'bg-emerald-500 text-white' : step === i ? 'bg-orange-500 text-white' : isDark ? 'bg-white/5 text-zinc-600 border border-white/5' : 'bg-black/5 text-zinc-400 border border-black/5'}`}>
                  {step > i ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block uppercase tracking-widest ${step === i ? (isDark ? 'text-white' : 'text-zinc-900') : (isDark ? 'text-zinc-700' : 'text-zinc-400')}`}>{s}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-px transition-all ${step > i ? 'bg-emerald-500' : isDark ? 'bg-white/5' : 'bg-black/5'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-6">
          {step === 0 && (
            <div className="space-y-6">
              <h2 className={`text-xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Account Type</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { r: 'creator', icon: '🎯', title: 'Creator', desc: 'Shop products and earn cashback by sharing authentic content' },
                  { r: 'brand', icon: '🏢', title: 'Brand', desc: 'Launch performance-based campaigns with verified influencers' },
                ].map(o => (
                  <button key={o.r} onClick={() => setRole(o.r)}
                    className={`p-6 rounded-2xl border text-left transition-all ${
                      role === o.r
                        ? 'border-orange-500/40 bg-orange-500/5 ring-1 ring-orange-500/20'
                        : isDark ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]' : 'border-black/5 bg-black/[0.02] hover:bg-black/[0.04]'
                    }`}>
                    <span className="text-3xl block mb-4">{o.icon}</span>
                    <p className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{o.title}</p>
                    <p className={`text-xs font-light leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className={`text-xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Personal Info</h2>
              <div className="space-y-6">
                <div><label className={labelClass}>Full Name</label><input value={form.name} onChange={set('name')} placeholder="Tasnim Rahman" className={inputClass} /></div>
                <div><label className={labelClass}>Email Address</label><input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" className={inputClass} /></div>
                <div><label className={labelClass}>Phone Number</label><input value={form.phone} onChange={set('phone')} placeholder="+880 1700-000000" className={inputClass} /></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className={`text-xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{role === 'creator' ? 'Social Profile' : 'Company Info'}</h2>
              {role === 'creator' ? (
                <div className="space-y-6">
                  <div><label className={labelClass}>Instagram Handle</label><input value={form.instagram} onChange={set('instagram')} placeholder="@yourhandle" className={inputClass} /></div>
                  <div><label className={labelClass}>Followers Count</label><input type="number" value={form.followers} onChange={set('followers')} placeholder="10000" className={inputClass} /></div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-black/[0.02] border border-black/5'}`}>
                    <p className={`text-[10px] uppercase tracking-widest font-medium mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Minimum requirement</p>
                    <p className={`text-xs font-light ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>1,000+ public followers on Instagram or TikTok to qualify as a creator.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div><label className={labelClass}>Company Name</label><input placeholder="Acme Ltd." className={inputClass} /></div>
                  <div><label className={labelClass}>Website</label><input placeholder="https://yourcompany.com" className={inputClass} /></div>
                  <div><label className={labelClass}>Product Category</label>
                    <select className={`w-full bg-transparent border-b pb-2 text-sm focus:outline-none transition-colors appearance-none ${isDark ? 'border-white/10 text-zinc-400 focus:border-white' : 'border-black/10 text-zinc-500 focus:border-black'}`}>
                      {['Beauty', 'Fashion', 'Tech', 'Lifestyle', 'Food & Grocery'].map(c => <option key={c} className="bg-black">{c}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 py-4">
              <div className="text-6xl">🎉</div>
              <div>
                <h2 className={`text-2xl font-medium tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>You're all set!</h2>
                <p className={`text-sm font-light mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Your account is ready. Let's get you started on the platform.</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {step > 0 && step < 3 && (
              <button onClick={() => setStep(step - 1)} className={`flex-1 py-3.5 rounded-xl text-xs font-medium uppercase tracking-widest transition-all border ${isDark ? 'border-white/10 text-zinc-400 hover:bg-white/5' : 'border-black/10 text-zinc-500 hover:bg-black/5'}`}>
                ← Back
              </button>
            )}
            <button onClick={next} className="flex-1 py-3.5 rounded-xl bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-zinc-200 transition-all">
              {step === 3 ? 'Enter Dashboard →' : step === 2 ? 'Create Account →' : 'Continue →'}
            </button>
          </div>

          {step === 0 && (
            <p className={`text-center text-xs font-light ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Already have an account?{' '}
              <Link to="/login" className="text-orange-500 hover:text-orange-400 transition-colors">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Register
