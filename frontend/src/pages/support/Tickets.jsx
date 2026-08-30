import { useState } from 'react'
import { Plus } from 'lucide-react'

const existingTickets = [
  { id: 'T-201', subject: 'Payment not received', category: 'Payout', status: 'open', date: '2026-06-30', message: 'My cashback for GlowUp campaign was verified 5 days ago but not credited.' },
  { id: 'T-202', subject: 'Post wrongfully rejected', category: 'Verification', status: 'in_progress', date: '2026-06-28', message: 'All hashtags and tags were included in my post but it was rejected.' },
  { id: 'T-203', subject: 'Order not received', category: 'Shipping', status: 'resolved', date: '2026-06-20', message: 'Placed order 12 days ago, still no delivery.' },
]

const statusConfig = { open: 'warning', in_progress: 'info', resolved: 'success' }

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
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Support tickets</h1>
          <p className="page-subtitle">Submit and track your support requests</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary">
          <Plus size={15} strokeWidth={2} /> New ticket
        </button>
      </div>

      {showNew && (
        <div className="mb-6 space-y-4" style={{ padding: 24, borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.06)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>New support ticket</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Subject</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Brief description"
                className="field-input" />
            </div>
            <div>
              <label className="field-label">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="field-select">
                {['General', 'Payout', 'Verification', 'Shipping', 'Account', 'Bug Report'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Message</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={4} placeholder="Describe your issue in detail..."
              className="field-input" style={{ resize: 'none' }} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="btn-ghost">Cancel</button>
            <button onClick={submitTicket} className="btn-primary">Submit ticket</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} style={{ padding: 20, borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.06)' }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="tnum" style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{t.id}</span>
              <span className={`badge badge-${statusConfig[t.status]}`}>{t.status.replace('_', ' ')}</span>
              <span className="badge badge-neutral">{t.category}</span>
              <span className="tnum" style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>{t.date}</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{t.subject}</p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Tickets
