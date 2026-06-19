import React, { useState, useEffect } from 'react'
import {
  User, Bell, LogOut, Upload, CheckCircle2, Clock, AlertCircle,
  Pill, Search, ChevronRight, Activity, Calendar, TrendingUp,
  X, Menu, Home, FileText, BarChart3, Settings, Heart, Sun, Moon, ShoppingCart
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext.jsx'

const medicines = [
  { name: 'Metformin 500mg', schedule: '1+0+1', nextDose: '8:00 PM', status: 'pending', adherence: 92 },
  { name: 'Amlodipine 5mg', schedule: '0+0+1', nextDose: '9:00 PM', status: 'pending', adherence: 88 },
  { name: 'Atorvastatin 20mg', schedule: '0+0+1', nextDose: 'Tomorrow 9 PM', status: 'taken', adherence: 95 },
]

const recentLogs = [
  { med: 'Metformin 500mg', time: '8:05 AM', date: 'Today', status: 'taken' },
  { med: 'Amlodipine 5mg', time: '9:00 PM', date: 'Yesterday', status: 'taken' },
  { med: 'Metformin 500mg', time: '—', date: 'Yesterday', status: 'missed' },
  { med: 'Atorvastatin 20mg', time: '9:15 PM', date: '2 days ago', status: 'taken' },
]

const prescriptions = [
  { id: 'RX-0049', doctor: 'Dr. Farhana Rahman', date: '14 Jun 2026', medicines: 3, status: 'active' },
  { id: 'RX-0032', doctor: 'Dr. Karim Hossain', date: '22 Mar 2026', medicines: 2, status: 'expired' },
]

const genericSearch = {
  Napa: { generic: 'Paracetamol 500mg', alternatives: ['Ace 500mg', 'Reset 500mg', 'Fast 500mg'], price: '৳2–৳5/tab' },
  Metformin: { generic: 'Metformin HCl', alternatives: ['Glucophage', 'Sumet', 'Fordia'], price: '৳1.5–৳4/tab' },
  Amlodipine: { generic: 'Amlodipine Besylate', alternatives: ['Amdocal', 'Norvasc', 'Amdin'], price: '৳3–৳8/tab' },
}

const NAV = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'reports', label: 'Medical Reports', icon: FileText },
  { id: 'prescriptions', label: 'Upload Rx', icon: Upload },
  { id: 'tracker', label: 'Dose Tracker', icon: Activity },
  { id: 'search', label: 'Med Search', icon: Search },
  { id: 'order', label: 'Order Medicine', icon: ShoppingCart },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const defaultOrders = [
  { id: 'ORD-4421', patient: 'Adnan Rahman', med: 'Metformin 500mg × 60', time: '10 min ago', status: 'new', amount: '৳240', pharmacy: 'Lazz Pharma — Uttara' },
  { id: 'ORD-4418', patient: 'Fatema Begum', med: 'Amlodipine 5mg × 30', time: '32 min ago', status: 'processing', amount: '৳180', pharmacy: 'Lazz Pharma — Uttara' },
  { id: 'ORD-4415', patient: 'Rahim Uddin', med: 'Atorvastatin 20mg × 30', time: '1h ago', status: 'fulfilled', amount: '৳390', pharmacy: 'Mediplex — Gulshan' },
  { id: 'ORD-4412', patient: 'Nusrat Islam', med: 'Metformin 500mg × 60', time: '2h ago', status: 'fulfilled', amount: '৳240', pharmacy: 'Lazz Pharma — Uttara' },
  { id: 'ORD-4408', patient: 'Karim Hossain', med: 'Napa 500mg × 20', time: '3h ago', status: 'fulfilled', amount: '৳60', pharmacy: 'DND Pharmacy — Mirpur' },
]

const defaultReports = [
  { id: 'REP-102', patientId: 'PT-001', patientName: 'Adnan Rahman', doctor: 'Dr. Farhana Rahman', date: '14 Jun 2026', title: 'Diabetes Follow-up Report', meds: 'Metformin 500mg, 1+0+1', notes: 'Blood sugar stable at 7.2 mmol/L. Continue Metformin dosage after lunch and dinner.' },
  { id: 'REP-101', patientId: 'PT-002', patientName: 'Fatema Begum', doctor: 'Dr. Farhana Rahman', date: '10 Jun 2026', title: 'Cardiovascular Assessment', meds: 'Amlodipine 5mg, 0+0+1', notes: 'Blood pressure slightly elevated (145/90). Advised low-salt diet.' },
]

export default function PatientDashboard() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [doseLog, setDoseLog] = useState(recentLogs)
  const [notifications, setNotifications] = useState(2)
  const [selectedReport, setSelectedReport] = useState(null)

  // Orders State & LocalStorage Sync
  const [ordersList, setOrdersList] = useState(() => {
    const saved = localStorage.getItem('mtrack-orders')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
    return defaultOrders
  })

  useEffect(() => {
    localStorage.setItem('mtrack-orders', JSON.stringify(ordersList))
  }, [ordersList])

  // Reports State & LocalStorage Sync
  const [reportsList, setReportsList] = useState(() => {
    const saved = localStorage.getItem('mtrack-reports')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
    return defaultReports
  })

  useEffect(() => {
    localStorage.setItem('mtrack-reports', JSON.stringify(reportsList))
  }, [reportsList])

  // Order Form States
  const [orderMedicine, setOrderMedicine] = useState('')
  const [orderQty, setOrderQty] = useState(30)
  const [orderPharmacy, setOrderPharmacy] = useState('Lazz Pharma — Uttara')

  const triggerDirectOrder = (medName) => {
    setOrderMedicine(medName)
    setActiveTab('order')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const key = Object.keys(genericSearch).find(k => searchQuery.toLowerCase().includes(k.toLowerCase()))
    setSearchResult(key ? genericSearch[key] : null)
  }

  const markTaken = (medName) => {
    setDoseLog(prev => [{ med: medName, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: 'Today', status: 'taken' }, ...prev])
    setNotifications(n => Math.max(0, n - 1))
  }

  const adherenceAvg = Math.round(medicines.reduce((s, m) => s + m.adherence, 0) / medicines.length)

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex font-sans">
      {/* Ambient */}
      <div className="fixed top-0 left-0 w-[40vw] h-[40vh] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[30vw] h-[30vh] bg-red-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-300 border-r border-white/5 bg-zinc-950/80 backdrop-blur-md flex flex-col relative z-20 flex-shrink-0`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {sidebarOpen && (
            <span className="text-sm font-semibold text-white italic tracking-tight">MediTrack BD</span>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ml-auto">
            <Menu className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* User avatar */}
        <div className={`px-4 py-5 border-b border-white/5 flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
          <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-blue-400" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-xs font-semibold text-white">Adnan Rahman</p>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Patient</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${activeTab === id ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'} ${!sidebarOpen && 'justify-center'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="text-xs font-medium">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 pb-4">
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span className="text-xs font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 relative z-10 overflow-auto">
        {/* Top bar */}
        <div className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <h1 className="text-sm font-semibold text-white">
              {NAV.find(n => n.id === activeTab)?.label}
            </h1>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Patient Workspace</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors cursor-pointer">
                <Bell className="w-4 h-4 text-zinc-400" />
              </button>
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{notifications}</span>
              )}
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Adherence Rate', value: `${adherenceAvg}%`, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  { label: 'Active Meds', value: '3', icon: Pill, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                  { label: 'Doses Today', value: '2/4', icon: CheckCircle2, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
                  { label: 'Next Refill', value: '8 days', icon: Calendar, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                  <div key={label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
                    </div>
                    <div>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Today's Meds */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-400" /> Today's Medications
                </h2>
                <div className="space-y-3">
                  {medicines.map((med) => (
                    <div key={med.name} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-xl px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${med.status === 'taken' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                        <div>
                          <p className="text-sm font-medium text-white">{med.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">Schedule: {med.schedule} &nbsp;|&nbsp; Next: {med.nextDose}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-zinc-400">{med.adherence}%</p>
                          <p className="text-[9px] text-zinc-600 font-mono">Adherence</p>
                        </div>
                        {med.status === 'pending' ? (
                          <button
                            onClick={() => markTaken(med.name)}
                            className="px-4 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-mono uppercase tracking-wider hover:bg-blue-500/20 transition-colors cursor-pointer"
                          >
                            Mark Taken
                          </button>
                        ) : (
                          <span className="px-4 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-mono uppercase tracking-wider">
                            Taken ✓
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adherence Chart (simple bar) */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-400" /> Weekly Adherence
                </h2>
                <div className="flex items-end gap-2 h-24">
                  {[80, 100, 75, 100, 100, 50, 92].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-700 ${h >= 90 ? 'bg-blue-500/60' : h >= 70 ? 'bg-amber-500/60' : 'bg-red-500/60'}`}
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[9px] text-zinc-600 font-mono">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* MEDICAL REPORTS TAB */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Medical Reports & Digital Rx</h2>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Patient ID: PT-001 (Adnan Rahman)</p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  Synced with Doctor Database
                </div>
              </div>

              {/* Reports list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* List Column */}
                <div className="space-y-3">
                  {reportsList.filter(r => r.patientId === 'PT-001').map(rep => (
                    <div
                      key={rep.id}
                      onClick={() => setSelectedReport(rep)}
                      className={`bg-white/[0.02] border rounded-2xl p-5 hover:border-white/20 transition-all group cursor-pointer text-left ${selectedReport?.id === rep.id ? 'border-blue-500/40 bg-blue-500/[0.02]' : 'border-white/5'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-mono text-xs font-bold">
                            Rx
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{rep.title}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{rep.doctor} &bull; {rep.date}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono uppercase">{rep.id}</span>
                      </div>
                    </div>
                  ))}
                  {reportsList.filter(r => r.patientId === 'PT-001').length === 0 && (
                    <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl text-zinc-600 text-xs font-mono">
                      No medical reports issued for PT-001 yet.
                    </div>
                  )}
                </div>

                {/* Detail View Column */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative min-h-[300px]">
                  {selectedReport ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start border-b border-white/5 pb-4">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-blue-400 mb-1">Prescription & Report Details</p>
                          <h3 className="text-lg font-bold text-white">{selectedReport.title}</h3>
                          <p className="text-xs text-zinc-500 mt-1">{selectedReport.doctor} &bull; {selectedReport.date}</p>
                        </div>
                        <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-mono uppercase">
                          {selectedReport.id}
                        </span>
                      </div>

                      <div className="space-y-4 text-xs">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Prescribed Medications</p>
                          <div className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-white font-medium">
                            {selectedReport.meds}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Clinical Notes / Report Text</p>
                          <div className="bg-black/30 border border-white/5 rounded-xl px-4 py-4 text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {selectedReport.notes}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex gap-3">
                          <button
                            onClick={() => triggerDirectOrder(selectedReport.meds.split(',')[0].split('(')[0].trim())}
                            className="flex-1 py-3 bg-white text-black hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                          >
                            Order Meds Directly
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                      <FileText className="w-8 h-8 text-zinc-700 mb-2.5 animate-pulse" />
                      <p className="text-xs text-zinc-500">Select a report from the list on the left to view prescription, diagnosis details, and clinical notes.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PRESCRIPTIONS TAB */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Prescription Vault</h2>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono uppercase tracking-wider hover:bg-blue-500/20 transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Upload Prescription
                </button>
              </div>

              <div className="space-y-3">
                {prescriptions.map(rx => (
                  <div key={rx.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{rx.id}</p>
                          <p className="text-xs text-zinc-500">{rx.doctor} &bull; {rx.date}</p>
                          <p className="text-[10px] text-zinc-600 font-mono mt-1">{rx.medicines} medications</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full border ${rx.status === 'active' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-zinc-800/50 border-white/5 text-zinc-500'}`}>
                          {rx.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload zone */}
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-blue-500/30 transition-colors">
                <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 font-medium">Drop a prescription image here</p>
                <p className="text-xs text-zinc-600 mt-1">Supports JPG, PNG, PDF &bull; OCR auto-extraction</p>
              </div>
            </div>
          )}

          {/* DOSE TRACKER TAB */}
          {activeTab === 'tracker' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Taken Today', value: '2', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                  { label: 'Missed', value: '1', icon: X, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                  { label: 'Pending', value: '2', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                  <div key={label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-center">
                    <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center mx-auto mb-3`}>
                      <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
                    </div>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-4">Dose Log History</h2>
                <div className="space-y-2">
                  {doseLog.map((log, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${log.status === 'taken' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-xs font-medium text-white">{log.med}</p>
                          <p className="text-[10px] text-zinc-600 font-mono">{log.date} {log.time !== '—' ? `· ${log.time}` : ''}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${log.status === 'taken' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MEDICINE SEARCH TAB */}
          {activeTab === 'search' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">Generic Drug Finder</h2>
                <p className="text-xs text-zinc-500">Search by brand name to find cheaper generic alternatives available in Bangladesh.</p>
              </div>

              <form onSubmit={handleSearch} className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g. Napa, Metformin, Amlodipine..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors placeholder:text-zinc-700"
                />
                <button type="submit" className="px-6 py-3 bg-white text-black text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer">
                  Search
                </button>
              </form>

              {searchResult && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-blue-500 mb-1">Generic Name</p>
                      <p className="text-lg font-semibold text-white">{searchResult.generic}</p>
                    </div>
                    <button
                      onClick={() => triggerDirectOrder(searchResult.generic)}
                      className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono uppercase tracking-wider rounded-lg hover:bg-blue-500/20 transition-colors cursor-pointer"
                    >
                      Order Generic
                    </button>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Available Alternatives in BD</p>
                    <div className="flex flex-wrap gap-2">
                      {searchResult.alternatives.map(alt => (
                        <div key={alt} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-zinc-300">
                          <span>{alt}</span>
                          <button
                            onClick={() => triggerDirectOrder(alt)}
                            className="text-[9px] font-semibold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider pl-1.5 border-l border-white/10 cursor-pointer"
                          >
                            Order
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-[10px] font-mono text-zinc-500">Est. Market Price &nbsp;<span className="text-white">{searchResult.price}</span></p>
                  </div>
                </div>
              )}

              {searchQuery && !searchResult && (
                <div className="text-center py-8 text-zinc-600 text-xs font-mono">
                  No results for "{searchQuery}". Try: Napa, Metformin, Amlodipine
                </div>
              )}
            </div>
          )}

          {/* ORDER MEDICINE TAB */}
          {activeTab === 'order' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Card */}
              <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-400" /> Place New Order
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Medicine Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Napa 500mg, Ace 500mg..."
                      value={orderMedicine}
                      onChange={e => setOrderMedicine(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors placeholder:text-zinc-700"
                    />
                    {/* Helper shortcuts */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[9px] text-zinc-500 font-mono self-center">Shortcuts:</span>
                      {['Napa 500mg', 'Ace 500mg', 'Metformin 500mg', 'Amlodipine 5mg'].map(m => (
                        <button
                          key={m}
                          onClick={() => setOrderMedicine(m)}
                          className="text-[9px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Quantity (tabs)</label>
                      <input
                        type="number"
                        min="1"
                        value={orderQty}
                        onChange={e => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">Select Pharmacy</label>
                      <select
                        value={orderPharmacy}
                        onChange={e => setOrderPharmacy(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
                      >
                        <option value="Lazz Pharma — Uttara">Lazz Pharma (Uttara)</option>
                        <option value="Mediplex — Gulshan">Mediplex (Gulshan)</option>
                        <option value="DND Pharmacy — Mirpur">DND Pharmacy (Mirpur)</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Estimated Unit Price:</span>
                      <span className="text-white font-mono">৳4.00</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Delivery Charge:</span>
                      <span className="text-white font-mono">৳40.00</span>
                    </div>
                    <div className="border-t border-white/5 pt-2 flex justify-between text-xs font-semibold">
                      <span className="text-zinc-300">Total Price:</span>
                      <span className="text-blue-400 font-mono">৳{orderQty * 4 + 40}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!orderMedicine.trim()) return
                      const newOrder = {
                        id: `ORD-${Math.floor(Math.random() * 9000) + 1000}`,
                        patient: 'Adnan Rahman',
                        med: `${orderMedicine} × ${orderQty}`,
                        time: 'Just now',
                        status: 'new',
                        amount: `৳${orderQty * 4 + 40}`,
                        pharmacy: orderPharmacy
                      }
                      setOrdersList(prev => [newOrder, ...prev])
                      setOrderMedicine('')
                    }}
                    disabled={!orderMedicine.trim()}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:hover:bg-blue-500 text-black text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                  >
                    Place Order
                  </button>
                </div>
              </div>

              {/* History Card */}
              <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-4">Your Orders History</h2>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {ordersList.map(order => {
                    const statusColors = {
                      new: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                      processing: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                      fulfilled: 'bg-green-500/10 border-green-500/20 text-green-400',
                    }
                    return (
                      <div key={order.id} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-xl px-5 py-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-zinc-400 font-bold">{order.id}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">&bull; {order.pharmacy || 'Lazz Pharma'}</span>
                          </div>
                          <p className="text-sm font-medium text-white">{order.med}</p>
                          <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{order.time}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1.5">
                          <p className="text-sm font-semibold text-white font-mono">{order.amount}</p>
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-mono uppercase border ${statusColors[order.status] || 'bg-zinc-800 text-zinc-400 border-white/5'}`}>
                            {order.status === 'new' ? 'pending' : order.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-base font-semibold text-white">Account Settings</h2>
              <div className="space-y-3">
                {[
                  { label: 'Reminder Channel', value: 'SMS & WhatsApp', note: 'Active' },
                  { label: 'Caregiver Access', value: 'Enabled (1 linked)', note: 'Family' },
                  { label: 'Language', value: 'English / বাংলা', note: 'Bilingual' },
                  { label: 'Refill Alert', value: '7 days before empty', note: 'On' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-5 py-4">
                    <div>
                      <p className="text-xs font-medium text-white">{item.label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{item.value}</p>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full">
                      {item.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
