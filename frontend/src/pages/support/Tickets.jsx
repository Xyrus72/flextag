import React, { useState } from 'react'

const existingTickets = [
  { id: 'T-201', subject: 'Payment not received', category: 'Payout', status: 'open', date: '2026-06-30', message: 'My cashback for GlowUp campaign was verified 5 days ago but not credited.' },
  { id: 'T-202', subject: 'Post wrongfully rejected', category: 'Verification', status: 'in_progress', date: '2026-06-28', message: 'All hashtags and tags were included in my post but it was rejected.' },
  { id: 'T-203', subject: 'Order not received', category: 'Shipping', status: 'resolved', date: '2026-06-20', message: 'Placed order 12 days ago, still no delivery.' },
]

const statusConfig = { open: 'bg-yellow-500/10 text-yellow-400', in_progress: 'bg-blue-500/10 text-blue-400', resolved: 'bg-emerald-500/10 text-emerald-400' }

const Tickets = () => {
  const [tickets, setTickets] = useState(existingTickets)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ subject: '', category: 'General', message: '' })

  const submitTicket = () => {
    if (form.subject && form.message) {
      setTickets([{ id: `T-${204 + tickets.length}`, ...form, status: 'open', date: new Date().toISOString().split('T')[0] }, ...tickets])
      setForm({ subject: '', category: 'General', message: '' })
      setShowNew(false)
    }
  }

  return (
    <div className="page-root">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Support Tickets</h1>
          <p className="text-zinc-500 mt-1">Submit and track your support requests</p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all">
          + New Ticket
        </button>
      </div>

      {showNew && (
        <div className="mb-6 p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">New Support Ticket</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Subject</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Brief description"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none placeholder:text-zinc-600" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none">
                {['General', 'Payout', 'Verification', 'Shipping', 'Account', 'Bug Report'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Message</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Describe your issue in detail..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-violet-500 outline-none resize-none placeholder:text-zinc-600" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="px-6 py-3 rounded-xl bg-white/5 text-zinc-400 font-semibold border border-white/5 hover:bg-white/10 transition-all">Cancel</button>
            <button onClick={submitTicket} className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all">Submit Ticket</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-zinc-500">{t.id}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusConfig[t.status]}`}>{t.status.replace('_', ' ')}</span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 text-[10px] font-medium">{t.category}</span>
              <span className="text-xs text-zinc-600 ml-auto">{t.date}</span>
            </div>
            <p className="text-sm font-semibold text-white mb-1">{t.subject}</p>
            <p className="text-sm text-zinc-400">{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Tickets
