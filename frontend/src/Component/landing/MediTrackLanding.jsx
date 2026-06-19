import React, { useState } from 'react'
import { 
  ChevronRight, 
  Activity, 
  MessageSquare, 
  Cpu, 
  Send, 
  Users, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  Award, 
  Check, 
  X,
  PhoneCall,
  BellRing,
  Sun,
  Moon
} from 'lucide-react'
import AuthModal from '../auth/AuthModal.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

const MediTrackLanding = () => {
  const { theme, toggleTheme } = useTheme()
  // Interactive AI Assistant states
  const [activeStory, setActiveStory] = useState('founder')
  const [activeStoryMode, setActiveStoryMode] = useState('workout') // For mobile app preview
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', type: 'Consulting' })
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [chatLog, setChatLog] = useState([
    { role: 'assistant', content: "Hello! I am MediTrack's AI Assistant. Ask me about your medications or generic alternatives." }
  ])

  // Demo queries
  const demoQueries = [
    { q: 'What is Metformin?', a: 'Metformin is an oral diabetes medicine that helps control blood sugar levels for people with Type 2 diabetes. It works by improving insulin sensitivity and reducing glucose production by the liver.' },
    { q: 'Can I take Metformin after food?', a: 'Yes, Metformin is typically taken with meals to reduce gastrointestinal side effects (like stomach upset or nausea) and ensure proper glucose control during digestion.' },
    { q: 'Check interaction: Metformin + Insulin', a: 'Metformin + Insulin: High clinical efficacy when co-administered. However, combining them increases the risk of hypoglycemia (low blood sugar). Regular blood glucose monitoring is recommended.' },
    { q: 'What are generic alternatives for Napa?', a: 'Napa contains Paracetamol (Acetaminophen) as its active pharmaceutical ingredient. Popular generic alternatives in Bangladesh include Ace, Reset, and Fast.' }
  ]

  // Floating Chat Widget state
  const [showFloatingChat, setShowFloatingChat] = useState(false)
  const [floatingMessage, setFloatingMessage] = useState('')



  const handleDemoQuery = (q, a) => {
    if (isTyping) return
    setIsTyping(true)
    const newLog = [...chatLog, { role: 'user', content: q }]
    setChatLog(newLog)
    
    // Simulate typing
    setTimeout(() => {
      setIsTyping(false)
      setChatLog([...newLog, { role: 'assistant', content: a }])
    }, 1200)
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    setFormSubmitted(true)
    setTimeout(() => {
      setFormSubmitted(false)
      setFormData({ firstName: '', lastName: '', email: '', type: 'Consulting' })
    }, 3000)
  }

  const handleFloatingSend = (e) => {
    e.preventDefault()
    if (!floatingMessage.trim()) return
    const msg = floatingMessage
    setFloatingMessage('')
    
    const matched = demoQueries.find(item => item.q.toLowerCase().includes(msg.toLowerCase()))
    const reply = matched ? matched.a : "Thank you for the message! As an AI assistant, I recommend consulting a registered physician."
    
    const newLog = [...chatLog, { role: 'user', content: msg }]
    setChatLog(newLog)
    setIsTyping(true)
    
    setTimeout(() => {
      setIsTyping(false)
      setChatLog([...newLog, { role: 'assistant', content: reply }])
    }, 1000)
  }

  return (
    <div className="text-zinc-300 selection:bg-red-500/20 selection:text-red-400 relative overflow-x-hidden min-h-screen bg-black">
      
      {/* Noise Overlay - Pure inline data URI */}
      <div 
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.02]" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }}
      />

      {/* Ambient Background Glows - Pure Tailwind blur classes */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full pointer-events-none blur-[120px] z-0"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-500/10 rounded-full pointer-events-none blur-[120px] z-0"></div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/[0.02] backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <span className="text-2xl font-semibold tracking-tight text-white italic group-hover:text-red-400 transition-colors duration-500 font-geist">
              MediTrack BD
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-red-500 leading-tight flex flex-col opacity-80 border-l border-white/10 pl-2.5 font-mono">
              <span>National</span>
              <span>Healthcare Platform</span>
            </span>
          </a>
          
          <div className="hidden lg:flex items-center gap-8 bg-black/20 px-8 py-2.5 rounded-full border border-white/5 backdrop-blur-md">
            <a href="#home" className="text-xs font-normal text-zinc-400 hover:text-white transition-colors">Home</a>
            <a href="#features" className="text-xs font-normal text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#assistant" className="text-xs font-normal text-zinc-400 hover:text-white transition-colors">AI Assistant</a>
            <a href="#business" className="text-xs font-normal text-zinc-400 hover:text-white transition-colors">Business Model</a>
            <a href="#testimonials" className="text-xs font-normal text-zinc-400 hover:text-white transition-colors">Reviews</a>
            <a href="#contact" className="text-xs font-normal text-zinc-400 hover:text-white transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors cursor-pointer text-zinc-400 hover:text-white"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowModal(true)} className="relative inline-flex items-center justify-center px-6 py-2.5 text-xs font-semibold text-white transition-all duration-200 bg-red-600/90 border border-red-500/50 rounded-full hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:-translate-y-0.5 uppercase tracking-widest cursor-pointer">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header id="home" className="relative pt-40 pb-32 px-6 min-h-screen flex items-center overflow-hidden">
        {/* Pure Tailwind & Inline SVG Grid Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-30">
          <svg className="absolute top-0 left-0 w-full h-full stroke-white/[0.03]" xmlns="http://www.w3.org/2000/svg" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' }}>
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 w-full flex flex-col items-start px-6">
          <div className="w-full lg:w-4/5 space-y-10 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-xs font-normal text-zinc-300 uppercase tracking-widest font-mono">Platform Ecosystem</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight uppercase italic leading-[0.95] text-white font-geist">
              <span className="bg-gradient-to-br from-white via-white to-zinc-500 bg-clip-text text-transparent">MediTrack BD</span><br />
              <span className="text-3xl md:text-5xl lg:text-6xl text-zinc-500 not-italic font-light tracking-tight mt-4 block leading-tight">
                Medication Compliance<br />
                &amp; Pharmacy Ecosystem
              </span>
            </h1>
            
            <p className="text-sm md:text-base text-zinc-400 font-light leading-relaxed max-w-xl">
              A premium, dual-sided digital healthcare platform solving medication non-adherence in Bangladesh. Empowering patients with automated reminders and OCR prescriptions while connecting local pharmacies to verified order fulfillment structures.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button onClick={() => setShowModal(true)} className="bg-white text-black text-xs font-semibold uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-zinc-200 transition-all hover:scale-105 cursor-pointer">
                Access Platform
              </button>
              <a href="#features" className="bg-white/[0.02] backdrop-blur-md border border-white/5 text-white text-xs font-normal uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-white/10 transition-all flex items-center gap-2">
                Explore Features <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Services Bento Grid Section */}
      <section id="features" className="py-32 px-6 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-16">
            
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="space-y-4 text-left">
              <h2 className="text-sm font-normal tracking-widest text-red-500 uppercase">System Features</h2>
              <h3 className="text-3xl md:text-5xl font-medium tracking-tight text-white leading-tight">
                Pioneering Compliance <br />
                <span className="text-zinc-500">In the Bangladesh Healthcare Sector</span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400 font-light leading-relaxed max-w-md text-left">
              A comprehensive breakdown of features designed specifically to streamline medication delivery, prescription archiving, and dosage adherence.
            </p>
          </div>

          {/* Bento Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
            {/* OCR Scanner Card */}
            <div className="md:col-span-2 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-8 md:p-12 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-0.5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors"></div>
              <div className="relative z-10 h-full flex flex-col justify-between space-y-12 text-left">
                <Cpu className="text-4xl text-zinc-400" />
                <div className="space-y-4">
                  <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase">AI OCR technology</span>
                  <h4 className="text-2xl md:text-3xl font-medium tracking-tight text-white">Prescription Optical Character Recognition</h4>
                  <p className="text-sm text-zinc-400 font-light leading-relaxed max-w-lg">
                    Automatically parse hand-written and digital prescriptions from doctor checkups. System extracts drug names, exact dose timings, intervals, and refills to instantly bootstrap patient reminders, reducing manual entry friction.
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Reminders Card */}
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-8 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-0.5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
              <div className="relative z-10 h-full flex flex-col justify-between space-y-12 text-left">
                <BellRing className="text-4xl text-zinc-400" />
                <div className="space-y-4">
                  <span className="text-[10px] font-mono tracking-widest text-blue-500 uppercase">Alert Routing</span>
                  <h4 className="text-xl font-medium tracking-tight text-white">Smart Reminders &amp; Missed Dose Escalation</h4>
                  <p className="text-sm text-zinc-400 font-light leading-relaxed">
                    SMS, WhatsApp, and push alerts synchronized with prescription schedules. Missed doses trigger hierarchical warning updates at 15-minute and 1-hour milestones.
                  </p>
                </div>
              </div>
            </div>

            {/* Caregiver Alerts Card */}
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-8 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-0.5 relative overflow-hidden group">
              <div className="relative z-10 h-full flex flex-col justify-between space-y-12 text-left">
                <Users className="text-4xl text-zinc-400" />
                <div className="space-y-4">
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Collaborative Care</span>
                  <h4 className="text-xl font-medium tracking-tight text-white">Caregiver Access Control</h4>
                  <p className="text-sm text-zinc-400 font-light leading-relaxed">
                    Dedicated configuration dashboards for family members. Caregivers are automatically alerted via WhatsApp if elderly or chronic disease patients fail to log their vital dose compliance.
                  </p>
                </div>
              </div>
            </div>

            {/* Pharmacy Fulfillment Card */}
            <div className="md:col-span-2 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-2 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-0.5 relative overflow-hidden group flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2 aspect-video md:aspect-auto rounded-2xl overflow-hidden relative bg-black/40">
                <img 
                  src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg" 
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-80 group-hover:grayscale-0 transition-all duration-700" 
                  alt="Pharmacy Fulfillment"
                />
                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>
              </div>
              <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center space-y-4 text-left">
                <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase">Pharmacy Hub</span>
                <h4 className="text-2xl font-medium tracking-tight text-white">Real-Time Order &amp; Fulfillment Portal</h4>
                <p className="text-sm text-zinc-400 font-light leading-relaxed">
                  Pharmacies review confirmed compliance profiles and receive digital orders immediately. Integrated analytics forecast low-stock parameters and manage repeat patient schedules automatically.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* The Core: Simulated AI Health Assistant Chat Section */}
      <section id="assistant" className="py-40 px-6 relative overflow-hidden border-y border-white/5 bg-[#030303]">
        {/* Inline Grid background */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-20">
          <svg className="absolute top-0 left-0 w-full h-full stroke-white/[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern-2" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern-2)" />
          </svg>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Title and details */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-tight font-geist">
              Experience <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent italic">MediTrack AI</span><br />
              <span className="text-zinc-600">Compliance Assistant</span>
            </h2>
            
            <p className="text-sm text-zinc-400 font-light leading-relaxed">
              Test drive our AI Health Assistant (planned post-MVP release). Ask questions regarding medication usages, dosage guidelines, generic options, and potential drug-to-drug interactions instantly.
            </p>

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-xs text-zinc-400"><span className="text-white font-semibold">Generic Drug Checker</span>: Suggests cheaper, locally available paracetamol/metformin substitutes.</p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-xs text-zinc-400"><span className="text-white font-semibold">Interaction Safety Logs</span>: Prevents dangerous clinical errors before dose ingestion.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Simulated Chat Console */}
          <div className="lg:col-span-7">
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-6 bg-black/60 border border-white/10 relative overflow-hidden">
              
              {/* Console Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></div>
                  <span className="text-xs font-mono text-zinc-300 font-bold uppercase">MediTrack AI Terminal</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-600">v1.0.4-BETA</span>
              </div>

              {/* Chat Log */}
              <div className="h-64 overflow-y-auto space-y-4 pr-2 text-left text-xs font-mono my-2">
                {chatLog.map((log, idx) => (
                  <div key={idx} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl border ${log.role === 'user' ? 'bg-red-950/20 border-red-500/20 text-white' : 'bg-white/5 border-white/5 text-zinc-400'}`}>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{log.role === 'user' ? 'Patient Query' : 'System Assistant'}</p>
                      <p className="leading-relaxed">{log.content}</p>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/5 max-w-[85%] p-3 rounded-2xl text-zinc-500 animate-pulse">
                      Assistant is typing compliance log...
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] font-mono text-zinc-500 uppercase text-left mb-2.5">Click a quick inquiry prompt to test:</p>
                <div className="flex flex-wrap gap-2 text-left">
                  {demoQueries.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleDemoQuery(item.q, item.a)}
                      className="text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {item.q}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Public Health Partner Strip */}
        <div className="max-w-7xl mx-auto mt-32 relative z-10">
          <p className="text-center text-[10px] font-normal tracking-[0.3em] text-zinc-600 uppercase mb-8">Ecosystem &amp; Health Partners</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-30 hover:opacity-80 transition-opacity duration-500 text-xs font-semibold tracking-wider font-mono">
            <span>LAZZ PHARMA LTD</span>
            <span>SQUARE HOSPITALS</span>
            <span>PATHAO DELIVERY NETWORK</span>
            <span>BANGLADESH DGDA</span>
          </div>
        </div>
      </section>

      {/* Dual Content Section (Revenue Model & User Acquisition) */}
      <section id="business" className="py-32 px-6 relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto space-y-32">
            
          {/* Revenue Model Block */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Info details */}
            <div className="space-y-8 lg:pr-12 text-left">
              <div className="flex items-center gap-4">
                <span className="w-8 h-[1px] bg-red-500"></span>
                <h2 className="text-xs font-normal tracking-[0.2em] text-zinc-500 uppercase">Dual Monetization Model</h2>
              </div>

              <h3 className="text-3xl md:text-5xl font-medium tracking-tight text-white leading-tight font-geist">
                Dual Monetization &amp; <br />
                <span className="text-zinc-500 italic">Sustained Revenue Growth</span>
              </h3>
              
              <div className="space-y-6">
                {[
                  { title: 'Patient Subscriptions', desc: 'Monthly fees for premium features (advanced reminders, analytics, unlimited uploads). Includes a free trial month.' },
                  { title: 'Pharmacy Commision', desc: 'A percentage fee cut on every order and fulfillment delivery routed through the platform.' },
                  { title: 'Featured Placements', desc: 'Local pharmacies pay fees to rank high in search listings when patients request medication fulfillments.' },
                  { title: 'B2B Corporate Packages', desc: 'Stable, large-deal bulk subscriptions sold to corporate companies, factories, and NGOs for employees.' }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-red-950/20 border border-red-500/20 flex items-center justify-center text-red-500 mt-1 flex-shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{item.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Graphic mockup representing revenue */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-white/5 to-transparent rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="aspect-[4/3] rounded-[2rem] overflow-hidden bg-white/[0.02] backdrop-blur-md border border-white/5 p-2 flex flex-col justify-center items-center bg-black/40 border border-white/5">
                <div className="text-center space-y-6 p-6">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto animate-bounce">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold tracking-tight text-white font-geist">Platform Revenue Projection</h4>
                  <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                    Designed for early cash flow, MediTrack BD captures transactions from both supply-side pharmacies and demand-side patients.
                  </p>
                  <div className="flex gap-6 justify-center pt-2">
                    <div className="text-center">
                      <span className="text-2xl font-light text-white font-mono">15%</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-mono">Commission average</span>
                    </div>
                    <div className="text-center border-l border-white/10 pl-6">
                      <span className="text-2xl font-light text-white font-mono">৳199</span>
                      <span className="text-[10px] text-zinc-500 block uppercase font-mono">Premium Sub / Month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>

          {/* User Acquisition Strategy Block */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Graphic representing clinic integrations */}
            <div className="relative group order-2 lg:order-1">
              <div className="absolute -inset-4 bg-gradient-to-l from-white/5 to-transparent rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="aspect-[4/3] rounded-[2rem] overflow-hidden bg-white/[0.02] backdrop-blur-md border border-white/5 p-2 flex flex-col justify-center items-center bg-black/40 border border-white/5">
                <div className="text-center space-y-6 p-6">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mx-auto">
                    <Award className="w-8 h-8 animate-pulse" />
                  </div>
                  <h4 className="text-xl font-bold tracking-tight text-white font-geist">Physician Referral Loop</h4>
                  <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                    Direct integration in outpatient clinics. Doctors hand out prescriptions that automatically register patients inside MediTrack BD app, ensuring zero dropoffs.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Info list */}
            <div className="space-y-8 lg:pl-12 order-1 lg:order-2 text-left">
              <div className="flex items-center gap-4">
                <span className="w-8 h-[1px] bg-red-500"></span>
                <h2 className="text-xs font-normal tracking-[0.2em] text-zinc-500 uppercase">Growth Channels</h2>
              </div>

              <h3 className="text-3xl md:text-5xl font-medium tracking-tight text-white leading-tight font-geist">
                User Acquisition &amp; <br />
                <span className="text-zinc-500 italic">Clinical Network Alliances</span>
              </h3>
              
              <div className="space-y-6">
                {[
                  { title: 'Clinic & Hospital Partnerships', desc: 'Direct onboarding of outpatient departments. Free first month trial incentive for patients referred directly from partnering clinics.' },
                  { title: 'Chronic Disease Communities', desc: 'Co-marketing to diabetes, hypertension, and cardiac patient networks who have high, stable daily medication dependence.' },
                  { title: 'Facebook & WhatsApp Marketing', desc: 'Capitalize on dominant local social networks to address patient groups, share recommendations, and support caregiver referrals.' }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-950/20 border border-blue-500/20 flex items-center justify-center text-blue-500 mt-1 flex-shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{item.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-32 px-6 border-t border-white/5 relative bg-gradient-to-b from-transparent to-black">
        <div className="max-w-7xl mx-auto space-y-24">
            
          {/* Main Clinical Review Quote */}
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase border border-red-500/20 bg-red-500/5 px-3 py-1 rounded-full">Clinical Review Summary</span>
            <p className="text-xl md:text-3xl font-light leading-relaxed text-zinc-300 font-geist">
              "Solving medication non-adherence in developing markets requires matching basic SMS integrations with pharmacy stock controls. The automated caregiver alert loops minimize patient compliance failures by 84%."
            </p>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-white uppercase tracking-widest font-mono">Ahad Fazal, PharmD</p>
              <p className="text-[10px] text-zinc-600 font-normal tracking-[0.2em] uppercase">VCU Health Adherence Reviewer</p>
            </div>
          </div>

          {/* Interactive Card Reviews */}
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Review 1 */}
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:bg-white/5 transition-all duration-500 text-left flex flex-col justify-between h-52">
              <p className="text-xs text-zinc-400 leading-relaxed font-light italic">
                "No longer having to worry about if my elderly father took his daily cardiac pill is a huge relief. The caregiver access logs send me WhatsApp alerts if a dose is skipped."
              </p>
              <div className="flex justify-between items-center border-t border-white/5 pt-4">
                <div>
                  <p className="text-xs font-bold text-white">Adnan Chowdhury</p>
                  <p className="text-[9px] text-zinc-500 uppercase">Dhaka (Caregiver)</p>
                </div>
                <span className="text-[9px] font-mono uppercase bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">Patient Side</span>
              </div>
            </div>

            {/* Review 2 */}
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:bg-white/5 transition-all duration-500 text-left flex flex-col justify-between h-52">
              <p className="text-xs text-zinc-400 leading-relaxed font-light italic">
                "Real-time order dashboard and direct verification of hand-written prescriptions reduced our dispensary entry errors. Order volume from repeating chronic disease clients increased by 40%."
              </p>
              <div className="flex justify-between items-center border-t border-white/5 pt-4">
                <div>
                  <p className="text-xs font-bold text-white">Lazz Pharma Dispensary</p>
                  <p className="text-[9px] text-zinc-500 uppercase">Uttara Branch (Pharmacist)</p>
                </div>
                <span className="text-[9px] font-mono uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">Pharmacy Side</span>
              </div>
            </div>

            {/* Review 3 */}
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:bg-white/5 transition-all duration-500 text-left flex flex-col justify-between h-52">
              <p className="text-xs text-zinc-400 leading-relaxed font-light italic">
                "The integration of hand-written OCR and automated reminders simplifies medication compliance for chronic patients. This reduces the public health friction significantly."
              </p>
              <div className="flex justify-between items-center border-t border-white/5 pt-4">
                <div>
                  <p className="text-xs font-bold text-white">Dr. Farhana Rahman</p>
                  <p className="text-[9px] text-zinc-500 uppercase">Advising Physician (Dhaka Medical)</p>
                </div>
                <span className="text-[9px] font-mono uppercase bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Advisory</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 px-6 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-20"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[2rem] p-8 md:p-16">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            
            <div className="space-y-10 text-left">
              <div className="space-y-4">
                <h2 className="text-xs font-normal tracking-[0.2em] text-red-500 uppercase">Connect</h2>
                <h3 className="text-4xl md:text-5xl font-medium tracking-tight text-white leading-[1.1] font-geist">
                  Initiate a <span className="text-zinc-500 italic">Conversation</span>
                </h3>
                <p className="text-sm text-zinc-400 font-light leading-relaxed max-w-md">
                  Request a clinical trial pilot for your hospital, contact us for system integration details, or apply to join our verified pharmacy network.
                </p>
              </div>

              <div className="space-y-6 pt-8 font-mono">
                <div className="flex items-center gap-4 text-zinc-400">
                  <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="text-xs">info@meditrack.bd</span>
                </div>
                <div className="flex items-center gap-4 text-zinc-400">
                  <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <span className="text-xs">Central Outpost, Dhaka</span>
                </div>
              </div>
            </div>

            {/* Custom Input Form */}
            <div className="bg-black/40 rounded-3xl p-8 border border-white/5 text-left">
              
              {formSubmitted ? (
                <div className="py-16 text-center space-y-4 flex flex-col justify-center items-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center text-xl font-bold">✓</div>
                  <h4 className="text-lg font-bold text-white">Request Received</h4>
                  <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                    Thank you! Your submission has been captured in our partner database.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">First Name</label>
                      <input 
                        type="text" 
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full bg-transparent border-b border-white/10 pb-2 text-sm text-white focus:border-white focus:outline-none transition-colors placeholder:text-zinc-700" 
                        placeholder="Adnan"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Last Name</label>
                      <input 
                        type="text" 
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full bg-transparent border-b border-white/10 pb-2 text-sm text-white focus:border-white focus:outline-none transition-colors placeholder:text-zinc-700" 
                        placeholder="Rahman"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-transparent border-b border-white/10 pb-2 text-sm text-white focus:border-white focus:outline-none transition-colors placeholder:text-zinc-700" 
                      placeholder="adnan@meditrack.bd"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Inquiry Type</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-transparent border-b border-white/10 pb-2 text-sm text-zinc-400 focus:border-white focus:outline-none transition-colors appearance-none"
                    >
                      <option className="bg-black" value="Consulting">Clinical Trial Partnership</option>
                      <option className="bg-black" value="Speaking">Hospital Partner Pilot</option>
                      <option className="bg-black" value="Advisory">Pharmacy Network Application</option>
                      <option className="bg-black" value="Other">Corporate/NGO Bulk Package</option>
                    </select>
                  </div>

                  <div className="pt-8">
                    <button type="submit" className="w-full bg-white text-black text-xs font-semibold uppercase tracking-widest py-4 rounded-xl hover:bg-zinc-200 transition-all text-center cursor-pointer">
                      Submit Request
                    </button>
                  </div>
                </form>
              )}

            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 relative z-20 border-t border-white/10 bg-[#000]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            
          <a href="#" className="flex items-center gap-2 group">
            <span className="text-xl font-semibold tracking-tight text-white italic">MediTrack BD</span>
            <span className="text-[10px] font-normal uppercase tracking-widest text-red-500 leading-tight font-mono">
              Bangladesh Healthcare
            </span>
          </a>

          <div className="flex items-center gap-6 text-[10px] font-normal uppercase tracking-widest text-zinc-600 font-mono">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <span>© {new Date().getFullYear()}</span>
          </div>
            
        </div>
      </footer>

      {/* Premium Floating Widget: Live compliance chat session */}
      <div className="fixed bottom-6 right-6 z-50 group">
        <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        <div 
          onClick={() => setShowFloatingChat(!showFloatingChat)}
          className="relative bg-white/[0.02] backdrop-blur-md border border-white/5 bg-black/80 p-2 pr-6 rounded-full flex items-center gap-4 cursor-pointer hover:border-white/20 transition-all shadow-2xl"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 relative bg-neutral-900 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-red-500 animate-pulse" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black"></div>
          </div>
          <div className="space-y-0.5 text-left">
            <p className="text-[9px] font-normal text-zinc-300 uppercase tracking-widest font-mono">MEDITRACK AI</p>
            <div className="flex items-center gap-1.5 text-white">
              <MessageSquare className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold">Start Session</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Overlay */}
      {showFloatingChat && (
        <div className="fixed bottom-24 right-6 w-80 z-50 bg-white/[0.02] backdrop-blur-md border border-white/5 bg-black/95 border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col justify-between h-96">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2 text-left">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[10px] font-mono uppercase text-zinc-300 font-bold">MediTrack Compliance AI</span>
            </div>
            <button 
              onClick={() => setShowFloatingChat(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Logs */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left text-[11px] font-mono my-2 scrollbar-none">
            {chatLog.map((log, idx) => (
              <div key={idx} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-2 rounded-xl border ${log.role === 'user' ? 'bg-red-950/20 border-red-500/20 text-white' : 'bg-white/5 border-white/5 text-zinc-400'} max-w-[90%]`}>
                  <p className="leading-normal">{log.content}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <p className="text-zinc-600 animate-pulse text-[10px]">Assistant is processing generic check...</p>
            )}
          </div>

          {/* Form input */}
          <form onSubmit={handleFloatingSend} className="flex gap-2 border-t border-white/5 pt-2">
            <input 
              type="text" 
              placeholder="Type query (e.g. Napa, Metformin)..."
              value={floatingMessage}
              onChange={(e) => setFloatingMessage(e.target.value)}
              className="flex-1 bg-neutral-950 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
            />
            <button 
              type="submit"
              className="bg-white text-black p-1.5 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

      {/* Auth Modal */}
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}

    </div>
  )
}

export default MediTrackLanding
