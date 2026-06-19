import React, { useState } from 'react'
import {
  ShieldCheck, LogOut, Users, Building2, Stethoscope, User,
  TrendingUp, Activity, AlertCircle, CheckCircle2, BarChart3,
  Menu, Home, Settings, Database, Globe, Bell, ChevronRight, Sun, Moon
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext.jsx'

const platformStats = {
  totalPatients: 4812,
  activePharmacies: 47,
  doctorsOnboard: 23,
  rxProcessed: 1284,
  todayOrders: 138,
  avgAdherence: 87,
  revenueMonth: '৳2,41,680',
  alerts: 3,
}

const recentActivity = [
  { type: 'patient', text: 'New patient registered: Karim Hossain (Dhaka)', time: '5m ago' },
  { type: 'order', text: 'Order ORD-4421 fulfilled by Lazz Pharma — Uttara', time: '12m ago' },
  { type: 'rx', text: 'Rx RX-0049 issued by Dr. Farhana Rahman', time: '35m ago' },
  { type: 'alert', text: 'Low stock alert: Amlodipine 5mg at Lazz Pharma', time: '1h ago' },
  { type: 'pharmacy', text: 'New pharmacy onboarded: Mediplex — Gulshan', time: '2h ago' },
]

const pharmacyList = [
  { name: 'Lazz Pharma — Uttara', orders: 48, rating: 4.8, status: 'active' },
  { name: 'Mediplex — Gulshan', orders: 31, rating: 4.6, status: 'active' },
  { name: 'DND Pharmacy — Mirpur', orders: 22, rating: 4.3, status: 'active' },
  { name: 'Prime Pharma — Dhanmondi', orders: 12, rating: 3.9, status: 'review' },
]

const featureMatrix = [
  { feature: 'OCR Prescription Scan', patient: true, pharmacy: false, doctor: true },
  { feature: 'Dose Reminders (SMS)', patient: true, pharmacy: false, doctor: false },
  { feature: 'Generic Drug Finder', patient: true, pharmacy: false, doctor: true },
  { feature: 'Order Management', patient: false, pharmacy: true, doctor: false },
  { feature: 'Inventory Alerts', patient: false, pharmacy: true, doctor: false },
  { feature: 'Digital Rx Issuing', patient: false, pharmacy: false, doctor: true },
  { feature: 'Caregiver Access', patient: true, pharmacy: false, doctor: false },
  { feature: 'Platform Analytics', patient: false, pharmacy: true, doctor: false },
]

const NAV = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'users', label: 'User Roles', icon: Users },
  { id: 'pharmacies', label: 'Pharmacies', icon: Building2 },
  { id: 'features', label: 'Feature Matrix', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const activityIcon = {
    patient: <User className="w-3.5 h-3.5 text-blue-400" />,
    order: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
    rx: <Stethoscope className="w-3.5 h-3.5 text-violet-400" />,
    alert: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
    pharmacy: <Building2 className="w-3.5 h-3.5 text-emerald-400" />,
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex font-sans">
      <div className="fixed top-0 right-0 w-[50vw] h-[40vh] bg-red-600/8 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[30vw] h-[30vh] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-300 border-r border-white/5 bg-zinc-950/80 backdrop-blur-md flex flex-col relative z-20 flex-shrink-0`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {sidebarOpen && <span className="text-sm font-semibold text-white italic tracking-tight">MediTrack BD</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ml-auto">
            <Menu className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        <div className={`px-4 py-5 border-b border-white/5 flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
          <div className="w-9 h-9 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-red-400" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-xs font-semibold text-white">System Admin</p>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Administrator</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${activeTab === id ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'} ${!sidebarOpen && 'justify-center'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="text-xs font-medium">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="px-2 pb-4">
          <button onClick={() => navigate('/')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer ${!sidebarOpen && 'justify-center'}`}>
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span className="text-xs font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 relative z-10 overflow-auto">
        <div className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <h1 className="text-sm font-semibold text-white">{NAV.find(n => n.id === activeTab)?.label}</h1>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Admin Control Panel</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span className="text-[10px] text-red-400 font-mono uppercase">{platformStats.alerts} Alerts</span>
            </div>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors cursor-pointer text-zinc-400 hover:text-white"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 text-xs font-medium hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Patients', value: platformStats.totalPatients.toLocaleString(), icon: User, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  { label: 'Active Pharmacies', value: platformStats.activePharmacies, icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                  { label: 'Doctors Onboard', value: platformStats.doctorsOnboard, icon: Stethoscope, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
                  { label: 'Monthly Revenue', value: platformStats.revenueMonth, icon: TrendingUp, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                  <div key={label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${color}`}>{value}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Rx Processed', value: platformStats.rxProcessed.toLocaleString(), color: 'text-white' },
                  { label: 'Orders Today', value: platformStats.todayOrders, color: 'text-white' },
                  { label: 'Avg Adherence', value: `${platformStats.avgAdherence}%`, color: 'text-green-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Activity Feed */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-400" /> Live Platform Activity
                </h2>
                <div className="space-y-3">
                  {recentActivity.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        {activityIcon[item.type]}
                      </div>
                      <p className="text-xs text-zinc-400 flex-1">{item.text}</p>
                      <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold text-white">User Role Distribution</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { role: 'Patients', count: platformStats.totalPatients, icon: User, color: 'blue', desc: 'Registered medication users tracking prescriptions and dose logs' },
                  { role: 'Pharmacies', count: platformStats.activePharmacies, icon: Building2, color: 'emerald', desc: 'Active pharmacy branches fulfilling orders through the platform' },
                  { role: 'Doctors', count: platformStats.doctorsOnboard, icon: Stethoscope, color: 'violet', desc: 'Licensed physicians issuing digital prescriptions' },
                  { role: 'Admins', count: 2, icon: ShieldCheck, color: 'red', desc: 'Platform operators with full system access and control' },
                ].map(({ role, count, icon: Icon, color, desc }) => (
                  <div key={role} className={`bg-${color}-500/5 border border-${color}-500/20 rounded-2xl p-6`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 text-${color}-400`} />
                      </div>
                      <p className={`text-2xl font-bold text-${color}-400`}>{typeof count === 'number' ? count.toLocaleString() : count}</p>
                    </div>
                    <p className={`text-sm font-semibold text-${color}-300`}>{role}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PHARMACIES TAB */}
          {activeTab === 'pharmacies' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">Pharmacy Network</h2>
              {pharmacyList.map((ph, i) => (
                <div key={ph.name} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{ph.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{ph.orders} orders fulfilled &bull; ★ {ph.rating}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full border ${ph.status === 'active' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                      {ph.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FEATURE MATRIX TAB */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">Platform Feature Matrix</h2>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 font-mono uppercase tracking-widest text-[10px]">
                      <th className="text-left px-6 py-4">Feature</th>
                      <th className="text-center px-6 py-4 text-blue-400">Patient</th>
                      <th className="text-center px-6 py-4 text-emerald-400">Pharmacy</th>
                      <th className="text-center px-6 py-4 text-violet-400">Doctor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureMatrix.map(row => (
                      <tr key={row.feature} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3.5 text-zinc-300">{row.feature}</td>
                        {['patient', 'pharmacy', 'doctor'].map(role => (
                          <td key={role} className="px-6 py-3.5 text-center">
                            {row[role] ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                            ) : (
                              <span className="w-4 h-4 border border-white/10 rounded inline-block" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="text-base font-semibold text-white">Platform Configuration</h2>
              {[
                { label: 'Platform Version', value: 'v1.0.4-MVP (Prototype)' },
                { label: 'SMS Gateway', value: 'SSL Commerz BD — Active' },
                { label: 'WhatsApp API', value: 'Meta Cloud API — Connected' },
                { label: 'OCR Engine', value: 'Tesseract v5 + LLM Layer' },
                { label: 'Commission Rate (Default)', value: '12% per fulfilled order' },
                { label: 'Subscription Tier (Default)', value: '৳199/month — Premium' },
                { label: 'DGDA Compliance', value: 'Certificate Pending (2026)' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-5 py-4">
                  <div>
                    <p className="text-xs font-medium text-white">{item.label}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
