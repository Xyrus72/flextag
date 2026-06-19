import React, { useState } from 'react'
import { X, User, Building2, Stethoscope, ShieldCheck, ChevronRight, ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ROLES = [
  {
    id: 'patient',
    label: 'Patient',
    desc: 'Track prescriptions, doses & refills',
    icon: User,
    accent: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    glow: 'shadow-blue-500/20',
    route: '/dashboard/patient'
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    desc: 'Manage orders, inventory & fulfillment',
    icon: Building2,
    accent: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-emerald-500/20',
    route: '/dashboard/pharmacy'
  },
  {
    id: 'doctor',
    label: 'Doctor',
    desc: 'Issue prescriptions & monitor patients',
    icon: Stethoscope,
    accent: 'from-violet-500/20 to-violet-600/5',
    border: 'border-violet-500/40',
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    glow: 'shadow-violet-500/20',
    route: '/dashboard/doctor'
  },
  {
    id: 'admin',
    label: 'Admin',
    desc: 'Platform monitoring & system control',
    icon: ShieldCheck,
    accent: 'from-red-500/20 to-red-600/5',
    border: 'border-red-500/40',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    glow: 'shadow-red-500/20',
    route: '/dashboard/admin'
  }
]

const InputField = ({ icon: Icon, type, placeholder, value, onChange, rightSlot }) => (
  <div className="relative flex items-center">
    <Icon className="absolute left-4 w-4 h-4 text-zinc-600 pointer-events-none" />
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-11 pr-12 py-3.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors placeholder:text-zinc-700"
    />
    {rightSlot && <div className="absolute right-4">{rightSlot}</div>}
  </div>
)

const AuthModal = ({ onClose }) => {
  const navigate = useNavigate()
  const [mode, setMode] = useState('select')
  const [selectedRole, setSelectedRole] = useState(null)

  // Sign-in fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Register fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPw, setShowRegPw] = useState(false)

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    setMode('signin')
  }

  const handleSignIn = (e) => {
    e.preventDefault()
    if (!selectedRole) return
    onClose()
    navigate(selectedRole.route)
  }

  const handleRegister = (e) => {
    e.preventDefault()
    if (!selectedRole) return
    onClose()
    navigate(selectedRole.route)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top glow bar */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            {(mode === 'signin' || mode === 'register') && (
              <button
                onClick={() => { setMode('select'); setSelectedRole(null) }}
                className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center hover:border-white/30 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            )}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-red-500">MediTrack BD</p>
              <h2 className="text-base font-semibold text-white mt-0.5">
                {mode === 'select' && 'Choose Your Role'}
                {mode === 'signin' && `Sign In — ${selectedRole?.label}`}
                {mode === 'register' && `Register — ${selectedRole?.label}`}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:border-white/30 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="px-7 py-6">

          {/* ── STEP 1: Role Selector ── */}
          {mode === 'select' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Select your account type to access your personalized workspace.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {ROLES.map((role) => {
                  const Icon = role.icon
                  return (
                    <button
                      key={role.id}
                      onClick={() => handleRoleSelect(role)}
                      className={`group relative p-5 rounded-2xl border bg-gradient-to-br ${role.accent} ${role.border} hover:shadow-lg ${role.glow} transition-all duration-300 text-left cursor-pointer hover:-translate-y-0.5`}
                    >
                      <div className={`w-9 h-9 rounded-xl ${role.bg} border ${role.border} flex items-center justify-center mb-3`}>
                        <Icon className={`w-[18px] h-[18px] ${role.text}`} />
                      </div>
                      <p className={`text-sm font-semibold ${role.text}`}>{role.label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{role.desc}</p>
                      <ChevronRight className="absolute top-4 right-4 w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2: Sign In Panel ── */}
          {mode === 'signin' && selectedRole && (() => {
            const Icon = selectedRole.icon
            return (
              <form onSubmit={handleSignIn} className="space-y-5">
                {/* Role badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${selectedRole.border} ${selectedRole.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${selectedRole.text}`} />
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${selectedRole.text}`}>{selectedRole.label} Portal</span>
                </div>

                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Email Address</label>
                  <InputField
                    icon={Mail}
                    type="email"
                    placeholder="you@meditrack.bd"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Password</label>
                  <InputField
                    icon={Lock}
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    rightSlot={
                      <button type="button" onClick={() => setShowPw(!showPw)} className="text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <p className="text-[10px] text-zinc-600 text-right mt-1">No credentials required for prototype — just click Sign In</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-white text-black text-xs font-semibold uppercase tracking-widest py-4 rounded-xl hover:bg-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  Sign In <ChevronRight className="w-4 h-4" />
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                  <div className="relative flex justify-center">
                    <span className="bg-zinc-950 px-4 text-[10px] text-zinc-600 uppercase tracking-widest font-mono">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="w-full border border-white/10 text-zinc-500 text-xs font-medium py-3.5 rounded-xl hover:border-white/20 hover:text-white transition-all cursor-pointer"
                >
                  Don't have an account? <span className="text-white font-semibold">Register</span>
                </button>
              </form>
            )
          })()}

          {/* ── STEP 3: Register Panel ── */}
          {mode === 'register' && selectedRole && (() => {
            const Icon = selectedRole.icon
            return (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Role badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${selectedRole.border} ${selectedRole.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${selectedRole.text}`} />
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${selectedRole.text}`}>New {selectedRole.label} Account</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Full Name</label>
                  <InputField icon={User} type="text" placeholder="Adnan Rahman" value={regName} onChange={e => setRegName(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Email Address</label>
                  <InputField icon={Mail} type="email" placeholder="adnan@meditrack.bd" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Password</label>
                  <InputField
                    icon={Lock}
                    type={showRegPw ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    rightSlot={
                      <button type="button" onClick={() => setShowRegPw(!showRegPw)} className="text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer">
                        {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Phone (BD)</label>
                  <InputField icon={Mail} type="tel" placeholder="+880 1X XX XXX XXXX" value={regPhone} onChange={e => setRegPhone(e.target.value)} />
                </div>

                <p className="text-[10px] text-zinc-600 leading-relaxed">No credentials required for prototype — any input works.</p>

                <button
                  type="submit"
                  className="w-full bg-white text-black text-xs font-semibold uppercase tracking-widest py-4 rounded-xl hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  Create Account & Enter
                </button>

                <p className="text-center text-[10px] text-zinc-600">
                  Already registered?{' '}
                  <button type="button" onClick={() => setMode('signin')} className="text-white hover:underline cursor-pointer">
                    Sign In
                  </button>
                </p>
              </form>
            )
          })()}

        </div>
      </div>
    </div>
  )
}

export default AuthModal
