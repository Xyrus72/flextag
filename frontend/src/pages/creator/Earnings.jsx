import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyEarnings } from '../../services/users'
import { API_URL } from '../../config'

/**
 * "How much have I actually made, and where from?"
 *
 * Every number here is computed from the ledger and the orders at read time —
 * nothing is a stored counter that could quietly drift from the money. The
 * monthly series fills empty months on purpose: a chart that skips a quiet
 * month makes a flat run look like growth.
 */
const Earnings = () => {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [months, setMonths]   = useState(6)

  useEffect(() => {
    let alive = true
    getMyEarnings(months)
      .then(d => { if (alive) setData(d) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [months])

  const peak = Math.max(1, ...(data?.monthly || []).map(m => m.earned))
  const bestMonth = (data?.monthly || []).reduce((best, m) => (m.earned > (best?.earned || 0) ? m : best), null)

  const cards = [
    { label: 'Lifetime earned',   value: data?.lifetime ?? 0,        color: '#a78bfa', sub: 'Net of reversals' },
    { label: 'Available now',     value: data?.available ?? 0,       color: '#4ade80', sub: 'Ready to withdraw' },
    { label: 'Waiting on posts',  value: data?.waitingOnPosts ?? 0,  color: '#fbbf24', sub: `${data?.openOrders || 0} open order${data?.openOrders === 1 ? '' : 's'}` },
    { label: 'Reserved',          value: data?.reserved ?? 0,        color: '#67e8f9', sub: 'Payout in the queue' },
  ]

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>My Money</span></div>
        <h1 className="page-title">Earnings</h1>
        <p className="page-subtitle">Where your cashback came from, month by month and brand by brand.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 26 }}>
        {cards.map(c => (
          <div key={c.label} style={{ padding: 22, borderRadius: 20, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.4)', marginBottom: 8 }}>{c.label}</p>
            <p style={{ fontSize: 27, fontWeight: 900, color: c.color, letterSpacing: '-0.03em' }}>{loading ? '—' : `৳${c.value.toLocaleString()}`}</p>
            <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.3)', marginTop: 4 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr' }} className="lg:grid-cols-3">
        {/* Monthly chart */}
        <div style={{ background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 20, padding: 24, gridColumn: 'span 2' }} className="lg:col-span-2">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Cashback by month</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {[6, 12].map(m => (
                <button key={m} onClick={() => { setLoading(true); setMonths(m) }} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  background: months === m ? 'rgba(124,58,237,0.25)' : 'rgba(var(--ink-rgb),0.04)',
                  color: months === m ? '#a78bfa' : 'rgba(var(--ink-rgb),0.5)',
                  border: months === m ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(var(--ink-rgb),0.08)',
                }}>{m}m</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 190, padding: '0 4px' }}>
                {data.monthly.map(m => (
                  <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: m.earned ? '#a78bfa' : 'rgba(var(--ink-rgb),0.25)' }}>
                      {m.earned ? `৳${m.earned >= 1000 ? `${(m.earned / 1000).toFixed(1)}k` : m.earned}` : '—'}
                    </span>
                    <div title={`৳${m.earned.toLocaleString()}`} style={{
                      width: '100%', borderRadius: '8px 8px 0 0', minHeight: 4,
                      height: `${Math.max(2, (m.earned / peak) * 100)}%`,
                      background: m.earned ? 'linear-gradient(180deg,#7c3aed,#06b6d4)' : 'rgba(var(--ink-rgb),0.06)',
                      transition: 'height 0.4s ease',
                    }} />
                    <span style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),0.35)', whiteSpace: 'nowrap' }}>{m.label}</span>
                  </div>
                ))}
              </div>
              {bestMonth?.earned > 0 && (
                <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)', marginTop: 16 }}>
                  Best month so far: <strong style={{ color: 'var(--text)' }}>{bestMonth.label}</strong> at ৳{bestMonth.earned.toLocaleString()}.
                </p>
              )}
            </>
          )}
        </div>

        {/* By brand + export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 20, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}>Top brands</h2>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}><div className="spinner" /></div>
            ) : !data.byBrand.length ? (
              <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.4)', margin: 0 }}>
                No released cashback yet. <Link to="/creator/catalog" style={{ color: '#67e8f9' }}>Find a campaign →</Link>
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.byBrand.map(b => (
                  <div key={b.brand}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{b.brand}</span>
                      <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>৳{b.earned.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'rgba(var(--ink-rgb),0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (b.earned / (data.byBrand[0]?.earned || 1)) * 100)}%`, background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }} />
                    </div>
                    <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.3)', margin: '4px 0 0' }}>
                      {b.orders} order{b.orders === 1 ? '' : 's'}{b.discounts ? ` · ৳${b.discounts.toLocaleString()} off at checkout` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 20, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>Statement</h2>
            <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)', margin: '0 0 14px', lineHeight: 1.6 }}>
              Every transaction as a spreadsheet — useful for your own records, or for anyone asking where the money came from.
            </p>
            <a href={`${API_URL}/api/transactions/export.csv`} className="btn-primary"
              style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 20px', fontSize: 13 }}>
              Download CSV
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Earnings
