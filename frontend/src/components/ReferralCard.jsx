import { useState, useEffect } from 'react'
import { Gift, Check } from 'lucide-react'
import { getMyReferrals } from '../services/users'

/** Compact "refer & earn" card for the creator dashboard. */
const ReferralCard = () => {
  const [data, setData] = useState(null)
  const [copied, setCopied] = useState('')

  useEffect(() => { getMyReferrals().then(setData).catch(() => {}) }, [])
  if (!data?.code) return null

  const link = `${window.location.origin}/register?role=creator&ref=${data.code}`
  const copy = (text, what) => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(what); setTimeout(() => setCopied(''), 1500) }

  return (
    <div style={{
      padding: 18, borderRadius: 14, marginBottom: 20,
      background: 'rgba(124,58,237,0.06)',
      border: '1px solid rgba(124,58,237,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Gift size={18} strokeWidth={1.6} style={{ color: 'var(--violet-ink)', marginTop: 2, flexShrink: 0 }} />
          <div>
            <p className="tnum" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Refer a creator, both earn ৳{data.bonus}</p>
            <p className="tnum" style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(var(--ink-rgb),0.55)' }}>
              Paid when they complete their first campaign · {data.count} referred{data.rewarded ? ` · ${data.rewarded} earned` : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <code style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text)', background: 'rgba(var(--ink-rgb),0.06)', border: '1px solid rgba(var(--ink-rgb),0.12)', borderRadius: 10, padding: '8px 12px' }}>{data.code}</code>
          <button type="button" onClick={() => copy(data.code, 'code')} className="btn-ghost" style={{ padding: '8px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{copied === 'code' ? <Check size={13} strokeWidth={2}/> : 'Copy code'}</button>
          <button type="button" onClick={() => copy(link, 'link')} className="btn-primary" style={{ padding: '8px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{copied === 'link' ? <><Check size={13} strokeWidth={2}/> Copied</> : 'Copy invite link'}</button>
        </div>
      </div>
    </div>
  )
}

export default ReferralCard
