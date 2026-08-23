import { useState, useEffect } from 'react'
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
      padding: 18, borderRadius: 18, marginBottom: 20,
      background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08))',
      border: '1px solid rgba(124,58,237,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>🎁 Refer a creator, both earn ৳{data.bonus}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            Paid when they complete their first campaign · {data.count} referred{data.rewarded ? ` · ${data.rewarded} earned` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <code style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', color: '#fff', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px' }}>{data.code}</code>
          <button type="button" onClick={() => copy(data.code, 'code')} className="btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>{copied === 'code' ? '✓' : 'Copy code'}</button>
          <button type="button" onClick={() => copy(link, 'link')} className="btn-primary" style={{ padding: '8px 12px', fontSize: 12 }}>{copied === 'link' ? '✓ Copied' : 'Copy invite link'}</button>
        </div>
      </div>
    </div>
  )
}

export default ReferralCard
