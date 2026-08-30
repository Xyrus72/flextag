import { useState, useEffect, useCallback } from 'react'
import { Shield } from 'lucide-react'
import { getFraudQueue, getFraudDetail, blockUser, unblockUser, vouchUser, rescanFraud } from '../../services/admin'

/**
 * Fraud review — the queue of creators the risk engine has something on.
 *
 * The score is deliberately NOT a verdict: every row expands into the exact
 * evidence (shared payout number, same signup IP, self-referral ring, order
 * burst…) so an admin can tell a family sharing a wifi router from a ring
 * draining a brand's budget. Blocking and vouching are both one click, and both
 * are reversible.
 */

const LEVEL_STYLE = {
  high:   { label: 'High risk',   color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)', badge: 'error' },
  medium: { label: 'Medium risk', color: 'var(--amber-ink)', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', badge: 'warning' },
  low:    { label: 'Low risk',    color: 'var(--cyan-ink)', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.3)', badge: 'cyan' },
  clear:  { label: 'Clear',       color: 'var(--green-ink)', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)', badge: 'success' },
}

const FraudReview = () => {
  const [users, setUsers]       = useState([])
  const [counts, setCounts]     = useState({})
  const [thresholds, setThresholds] = useState(null)
  const [level, setLevel]       = useState('flagged')
  const [loading, setLoading]   = useState(true)
  const [openId, setOpenId]     = useState(null)
  const [detail, setDetail]     = useState({})       // id -> assessment
  const [busyId, setBusyId]     = useState(null)
  const [banner, setBanner]     = useState(null)

  const load = useCallback((lvl = level) => (
    getFraudQueue({ level: lvl })
      .then(d => {
        setUsers(d.users || [])
        setCounts(d.counts || {})
        setThresholds(d.thresholds || null)
      })
      .catch(err => setBanner({ kind: 'err', text: err.response?.data?.message || 'Could not load the fraud queue.' }))
      .finally(() => setLoading(false))
  ), [level])

  useEffect(() => { load(level) }, [level, load])

  const changeLevel = (l) => { setLoading(true); setLevel(l) }

  const toggleDetail = async (id) => {
    if (openId === id) { setOpenId(null); return }
    setOpenId(id)
    if (detail[id]) return
    try {
      const d = await getFraudDetail(id)
      setDetail(prev => ({ ...prev, [id]: d.assessment }))
    } catch {
      setDetail(prev => ({ ...prev, [id]: { signals: [], error: true } }))
    }
  }

  const act = async (id, fn, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusyId(id); setBanner(null)
    try {
      const d = await fn()
      setBanner({ kind: 'ok', text: d.message || 'Done.' })
      setDetail(prev => ({ ...prev, [id]: undefined }))
      await load(level)
    } catch (err) {
      setBanner({ kind: 'err', text: err.response?.data?.message || 'That did not go through.' })
    } finally {
      setBusyId(null)
    }
  }

  const handleBlock = (u) => {
    const reason = window.prompt(`Block ${u.name}? They will see this reason when they try to order or withdraw:`, 'Account under review for suspicious activity.')
    if (reason === null) return
    return act(u._id, () => blockUser(u._id, reason))
  }

  const handleVouch = (u) => {
    if (u.riskWhitelisted) return act(u._id, () => vouchUser(u._id, { whitelisted: false }))
    const note = window.prompt(`Vouch for ${u.name} — why are these flags fine? (internal note)`, '')
    if (note === null) return
    return act(u._id, () => vouchUser(u._id, { note, whitelisted: true }))
  }

  const handleRescan = () => act('scan', () => rescanFraud(), 'Re-score every creator now?')

  const tabs = [
    { key: 'flagged', label: 'Flagged' },
    { key: 'high',    label: `High (${counts.high || 0})` },
    { key: 'medium',  label: `Medium (${counts.medium || 0})` },
    { key: 'low',     label: `Low (${counts.low || 0})` },
    { key: 'blocked', label: `Blocked (${counts.blocked || 0})` },
    { key: 'all',     label: 'All creators' },
  ]

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Risk &amp; Abuse</span></div>
        <h1 className="page-title">Fraud Review</h1>
        <p className="page-subtitle">
          Shared payout numbers, self-referral rings and order bursts — the ways a cashback budget actually leaks.
        </p>
      </div>

      {thresholds && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 20,
          padding: '12px 16px', borderRadius: 14,
          background: thresholds.enforce ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.07)',
          border: `1px solid ${thresholds.enforce ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.25)'}`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: thresholds.enforce ? 'var(--green-ink)' : 'var(--amber-ink)' }}>
            {thresholds.enforce ? 'Rules enforced' : 'Scoring only — nothing is blocked'}
          </span>
          <span style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.45)' }}>
            Orders blocked at {thresholds.blockScore} · payouts held at {thresholds.holdPayoutScore} · manual post review at {thresholds.reviewScore} · burst limit {thresholds.maxOrdersPerDay}/day. Tune these in Commission &amp; Settings.
          </span>
          <button onClick={handleRescan} disabled={busyId === 'scan'} style={{
            marginLeft: 'auto', padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer',
            fontFamily: 'inherit', background: 'rgba(124,58,237,0.15)', color: 'var(--violet-ink)', border: '1px solid rgba(124,58,237,0.3)',
          }}>{busyId === 'scan' ? 'Scanning…' : 'Re-scan everyone'}</button>
        </div>
      )}

      {banner && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 16, fontSize: 13,
          background: banner.kind === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${banner.kind === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: banner.kind === 'ok' ? 'var(--green-ink)' : '#f87171',
        }}>{banner.text}</div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => changeLevel(t.key)} style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', border: 'none',
            background: level === t.key ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.04)',
            color: level === t.key ? '#fff' : 'rgba(var(--ink-rgb),0.45)',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <Shield size={28} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 10 }} />
          <p>Nothing flagged here — the ledger looks clean.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {users.map(u => {
            const st = LEVEL_STYLE[u.riskLevel] || LEVEL_STYLE.clear
            const open = openId === u._id
            const assessment = detail[u._id]
            return (
              <div key={u._id} style={{
                borderRadius: 14, background: 'rgba(var(--ink-rgb),0.03)',
                border: `1px solid ${u.blocked ? 'rgba(239,68,68,0.35)' : 'rgba(var(--ink-rgb),0.07)'}`,
                overflow: 'hidden',
              }}>
                <div style={{ padding: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{u.name}</p>
                      <span className={`badge badge-${st.badge}`}>{st.label} · {u.riskScore || 0}</span>
                      {u.blocked && <span className="badge badge-error" style={{ fontSize: 9 }}>BLOCKED</span>}
                      {u.riskWhitelisted && <span className="badge badge-success" style={{ fontSize: 9 }}>VOUCHED</span>}
                      {u.igVerified && <span className="badge badge-neutral" style={{ fontSize: 9 }}>IG verified</span>}
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)', margin: '0 0 10px' }}>
                      {u.email}{u.instagramHandle ? ` · @${String(u.instagramHandle).replace(/^@/, '')}` : ''}
                      {u.phone ? ` · ${u.phone}` : ''} · joined {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(u.riskFlags || []).map(f => (
                        <span key={f} style={{
                          padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                          background: 'rgba(var(--ink-rgb),0.05)', color: 'rgba(var(--ink-rgb),0.55)',
                          border: '1px solid rgba(var(--ink-rgb),0.08)',
                        }}>{f.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                    {u.blocked && u.blockReason && (
                      <p style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>Blocked: {u.blockReason}</p>
                    )}
                    {u.riskNote && <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)', marginTop: 8, fontStyle: 'italic' }}>Note: {u.riskNote}</p>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 150 }}>
                    <button onClick={() => toggleDetail(u._id)} style={{
                      padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                      background: 'rgba(var(--ink-rgb),0.05)', color: 'rgba(var(--ink-rgb),0.7)', border: '1px solid rgba(var(--ink-rgb),0.1)',
                    }}>{open ? 'Hide evidence' : 'Why flagged?'}</button>
                    {u.blocked ? (
                      <button onClick={() => act(u._id, () => unblockUser(u._id))} disabled={busyId === u._id} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                        {busyId === u._id ? 'Working…' : 'Unblock'}
                      </button>
                    ) : (
                      <button onClick={() => handleBlock(u)} disabled={busyId === u._id} style={{
                        padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                        background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)',
                      }}>Block account</button>
                    )}
                    <button onClick={() => handleVouch(u)} disabled={busyId === u._id} style={{
                      padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                      background: 'rgba(34,197,94,0.1)', color: 'var(--green-ink)', border: '1px solid rgba(34,197,94,0.25)',
                    }}>{u.riskWhitelisted ? 'Revoke vouch' : 'Vouch for them'}</button>
                    <p className="tnum" style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.3)', margin: 0, textAlign: 'center' }}>
                      ৳{(u.totalEarnings || 0).toLocaleString()} earned · {u.completedCampaigns || 0} campaigns
                    </p>
                  </div>
                </div>

                {open && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(var(--ink-rgb),0.06)' }}>
                    {!assessment ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}><div className="spinner" /></div>
                    ) : assessment.error ? (
                      <p style={{ fontSize: 13, color: '#f87171', marginTop: 16 }}>Could not recompute the score.</p>
                    ) : assessment.signals?.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.4)', marginTop: 16 }}>No signals on a fresh check — the score is stale and will clear on the next scan.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                        {assessment.signals.map(sig => (
                          <div key={sig.code} style={{ padding: 14, borderRadius: 12, background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{sig.label}</p>
                              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--amber-ink)', whiteSpace: 'nowrap' }}>+{sig.weight}</span>
                            </div>
                            <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.45)', margin: 0 }}>{sig.detail}</p>
                          </div>
                        ))}
                        {assessment.whitelisted && (
                          <p style={{ fontSize: 12, color: 'var(--green-ink)', margin: 0 }}>
                            Vouched by an admin — these signals stay visible but do not score.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FraudReview
