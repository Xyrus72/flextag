import React, { useState, useEffect } from 'react'
import {
  Stethoscope, LogOut, Users, FileText, ClipboardList, Activity,
  ChevronRight, Plus, Calendar, CheckCircle2, Clock,
  Menu, Home, Settings, Search, Bell, Sun, Moon
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext.jsx'

const patients = [
  { id: 'PT-001', name: 'Adnan Rahman', age: 45, condition: 'Type 2 Diabetes', lastVisit: '14 Jun 2026', adherence: 92 },
  { id: 'PT-002', name: 'Fatema Begum', age: 62, condition: 'Hypertension + Cardiac', lastVisit: '10 Jun 2026', adherence: 78 },
  { id: 'PT-003', name: 'Rahim Uddin', age: 55, condition: 'Hyperlipidemia', lastVisit: '5 Jun 2026', adherence: 95 },
  { id: 'PT-004', name: 'Nusrat Islam', age: 38, condition: 'Type 2 Diabetes', lastVisit: '1 Jun 2026', adherence: 85 },
]

const appointments = [
  { patient: 'Adnan Rahman', time: '10:00 AM', type: 'Follow-up', status: 'upcoming' },
  { patient: 'Fatema Begum', time: '11:30 AM', type: 'Prescription Review', status: 'upcoming' },
  { patient: 'Rahim Uddin', time: '2:00 PM', type: 'Initial Consult', status: 'completed' },
]

const rxHistory = [
  { id: 'RX-0049', patient: 'Adnan Rahman', date: '14 Jun 2026', meds: 'Metformin 500mg, 1+0+1' },
  { id: 'RX-0048', patient: 'Fatema Begum', date: '10 Jun 2026', meds: 'Amlodipine 5mg, 0+0+1 | Atorvastatin 20mg, 0+0+1' },
  { id: 'RX-0047', patient: 'Rahim Uddin', date: '5 Jun 2026', meds: 'Atorvastatin 20mg, 0+0+1' },
]

const NAV = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'prescribe', label: 'Issue Rx', icon: FileText },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const defaultReports = [
  { id: 'REP-102', patientId: 'PT-001', patientName: 'Adnan Rahman', doctor: 'Dr. Farhana Rahman', date: '14 Jun 2026', title: 'Diabetes Follow-up Report', meds: 'Metformin 500mg, 1+0+1', notes: 'Blood sugar stable at 7.2 mmol/L. Continue Metformin dosage after lunch and dinner.' },
  { id: 'REP-101', patientId: 'PT-002', patientName: 'Fatema Begum', doctor: 'Dr. Farhana Rahman', date: '10 Jun 2026', title: 'Cardiovascular Assessment', meds: 'Amlodipine 5mg, 0+0+1', notes: 'Blood pressure slightly elevated (145/90). Advised low-salt diet.' },
]

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [rxForm, setRxForm] = useState({ patient: '', patientId: '', title: '', med: '', dose: '', schedule: '', notes: '' })
  const [rxSubmitted, setRxSubmitted] = useState(false)

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

  const handleIssueRx = (e) => {
    e.preventDefault()
    const newReport = {
      id: `REP-${Math.floor(Math.random() * 900) + 100}`,
      patientId: rxForm.patientId || 'PT-001',
      patientName: rxForm.patient,
      doctor: 'Dr. Farhana Rahman',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      title: rxForm.title || 'General Checkup Report',
      meds: `${rxForm.med} ${rxForm.dose ? `(${rxForm.dose})` : ''}, ${rxForm.schedule}`,
      notes: rxForm.notes || 'Take medication on schedule.'
    }
    setReportsList(prev => [newReport, ...prev])
    setRxSubmitted(true)
    setTimeout(() => {
      setRxSubmitted(false)
      setRxForm({ patient: '', patientId: '', title: '', med: '', dose: '', schedule: '', notes: '' })
    }, 2500)
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex font-sans">
      <div className="fixed top-0 left-1/2 w-[40vw] h-[40vh] bg-violet-600/8 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[30vw] h-[30vh] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-300 border-r border-white/5 bg-zinc-950/80 backdrop-blur-md flex flex-col relative z-20 flex-shrink-0`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {sidebarOpen && <span className="text-sm font-semibold text-white italic tracking-tight">MediTrack BD</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ml-auto">
            <Menu className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        <div className={`px-4 py-5 border-b border-white/5 flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
          <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-4 h-4 text-violet-400" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-xs font-semibold text-white">Dr. Farhana Rahman</p>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Physician</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${activeTab === id ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'} ${!sidebarOpen && 'justify-center'}`}
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
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Doctor Console</p>
          </div>
          <div className="flex items-center gap-3">
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

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Active Patients', value: patients.length, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
                  { label: "Today's Appts", value: appointments.length, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  {label: 'Rx Issued', value: reportsList.length, icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                  { label: 'Avg Adherence', value: `${Math.round(patients.reduce((s, p) => s + p.adherence, 0) / patients.length)}%`, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
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

              {/* Today's schedule */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-400" /> Today's Appointments
                </h2>
                <div className="space-y-3">
                  {appointments.map((appt, i) => (
                    <div key={i} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-xl px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold">
                          {appt.patient[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{appt.patient}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{appt.type} &bull; {appt.time}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full border ${appt.status === 'upcoming' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                        {appt.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Rx */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-4">Recent Prescriptions Issued</h2>
                <div className="space-y-3">
                  {reportsList.slice(0, 3).map(rep => (
                    <div key={rep.id} className="flex items-start justify-between py-3 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-xs font-mono text-zinc-500">{rep.id} &bull; {rep.date}</p>
                        <p className="text-sm font-medium text-white mt-0.5">{rep.patientName} <span className="text-zinc-500 font-mono text-[10px]">({rep.patientId})</span></p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{rep.title} — {rep.meds}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* PATIENTS TAB */}
          {activeTab === 'patients' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">Patient Registry</h2>
              <div className="space-y-3">
                {patients.map(pt => (
                  <div
                    key={pt.id}
                    onClick={() => setSelectedPatient(selectedPatient?.id === pt.id ? null : pt)}
                    className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold">
                          {pt.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{pt.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{pt.id} &bull; Age {pt.age} &bull; {pt.condition}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${pt.adherence >= 90 ? 'text-green-400' : pt.adherence >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                          {pt.adherence}%
                        </p>
                        <p className="text-[10px] text-zinc-600 font-mono">Adherence</p>
                      </div>
                    </div>
                    {selectedPatient?.id === pt.id && (
                      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-zinc-600 font-mono text-[10px] uppercase">Last Visit</p>
                          <p className="text-zinc-300 mt-0.5">{pt.lastVisit}</p>
                        </div>
                        <div>
                          <p className="text-zinc-600 font-mono text-[10px] uppercase">Condition</p>
                          <p className="text-zinc-300 mt-0.5">{pt.condition}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTab('prescribe'); setRxForm(f => ({ ...f, patient: pt.name, patientId: pt.id, title: `${pt.condition} Follow-up` })) }}
                          className="col-span-2 mt-2 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-mono uppercase tracking-wider rounded-xl hover:bg-violet-500/20 transition-colors cursor-pointer"
                        >
                          Issue Prescription →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ISSUE RX TAB */}
          {activeTab === 'prescribe' && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-base font-semibold text-white">Issue Digital Prescription</h2>

              {rxSubmitted ? (
                <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-8 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
                  <p className="text-base font-semibold text-white">Prescription Issued</p>
                  <p className="text-xs text-zinc-500">Patient has been notified via SMS & WhatsApp with dose reminders.</p>
                </div>
              ) : (
                <form onSubmit={handleIssueRx} className="space-y-4">
                  {[
                    { label: 'Patient Name', key: 'patient', placeholder: 'Adnan Rahman' },
                    { label: 'Patient ID (e.g. PT-001)', key: 'patientId', placeholder: 'PT-001' },
                    { label: 'Report / Diagnosis Title', key: 'title', placeholder: 'Diabetes Follow-up Report' },
                    { label: 'Medicine Name', key: 'med', placeholder: 'Metformin 500mg' },
                    { label: 'Dosage', key: 'dose', placeholder: '500mg' },
                    { label: 'Schedule (e.g. 1+0+1)', key: 'schedule', placeholder: '1+0+1 (Breakfast / Dinner)' },
                    { label: 'Doctor Notes / Reports Text', key: 'notes', placeholder: 'Take after meals. Monitor blood sugar weekly.' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">{label}</label>
                      <input
                        type="text"
                        required={key !== 'notes' && key !== 'dose'}
                        value={rxForm[key]}
                        onChange={e => setRxForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-colors placeholder:text-zinc-700"
                      />
                    </div>
                  ))}

                  <button
                    type="submit"
                    className="w-full bg-white text-black text-xs font-semibold uppercase tracking-widest py-4 rounded-xl hover:bg-zinc-200 transition-all cursor-pointer mt-4 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Issue Report & Prescription
                  </button>
                </form>
              )}

              {reportsList.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-semibold text-white">Issued Prescriptions & Reports</p>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {reportsList.map(rep => (
                      <div key={rep.id} className="py-2.5 border-b border-white/5 last:border-0 text-xs">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-white">{rep.patientName} &bull; <span className="text-zinc-500 font-mono">{rep.patientId}</span></p>
                          <span className="text-[10px] text-zinc-500 font-mono">{rep.id}</span>
                        </div>
                        <p className="text-zinc-400 mt-1"><span className="text-zinc-500">Title:</span> {rep.title}</p>
                        <p className="text-zinc-400 mt-0.5"><span className="text-zinc-500">Meds:</span> {rep.meds}</p>
                        <p className="text-[10px] text-zinc-600 mt-1 font-mono">{rep.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-white">Schedule — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })}</h2>
              <div className="space-y-3">
                {appointments.map((appt, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center gap-5">
                    <div className="text-center min-w-[60px]">
                      <p className="text-base font-bold text-violet-400">{appt.time.split(' ')[0]}</p>
                      <p className="text-[10px] text-zinc-600 font-mono">{appt.time.split(' ')[1]}</p>
                    </div>
                    <div className="flex-1 border-l border-white/5 pl-5">
                      <p className="text-sm font-semibold text-white">{appt.patient}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{appt.type}</p>
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full border ${appt.status === 'upcoming' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="text-base font-semibold text-white">Doctor Profile</h2>
              {[
                { label: 'Full Name', value: 'Dr. Farhana Rahman, MBBS' },
                { label: 'Specialization', value: 'General Medicine / Endocrinology' },
                { label: 'License No.', value: 'BMDC-BD-28471' },
                { label: 'Affiliated Hospital', value: 'Dhaka Medical College Hospital' },
                { label: 'Prescription Alerts', value: 'SMS + Dashboard — Active' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-5 py-4">
                  <div>
                    <p className="text-xs font-medium text-white">{item.label}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{item.value}</p>
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
