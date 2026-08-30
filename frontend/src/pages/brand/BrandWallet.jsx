import { useState, useEffect, useCallback } from 'react'
import { Landmark } from 'lucide-react'
import { getBrandWallet, initBrandFunding, declareBankTransfer } from '../../services/brandWallet'

/**
 * Campaign balance — the brand side of the money loop.
 *
 * Until this existed, a "budget" was a number in a form while the cashback it
 * promised came out of nowhere. This is the real account: fund it by card or
 * bank transfer, watch every reward FlexTag releases on your behalf draw it
 * down, and see exactly what is left before a campaign stalls.
 */

const TYPE_STYLE = {
  funding: { label: 'Top-up',  color: 'var(--green-ink)', sign: '+' },
  refund:  { label: 'Refund',  color: 'var(--cyan-ink)', sign: '+' },
  spend:   { label: 'Reward',  color: '#f87171', sign: '−' },
  fee:     { label: 'Fee',     color: 'var(--amber-ink)', sign: '−' },
}

const bannerFromUrl = () => {
  const state = new URLSearchParams(window.location.search).get('funded')
  switch (state) {
    case 'ok':                return { kind: 'ok',  text: 'Payment received — your balance is updated.' }
    case 'failed':            return { kind: 'err', text: 'The payment did not go through. Nothing was charged.' }
    case 'validation_failed': return { kind: 'err', text: 'We could not validate that payment with the gateway. Contact support if you were charged.' }
    case 'missing_data':
    case 'error':             return { kind: 'err', text: 'Something went wrong finishing that payment.' }
    default:                  return null
  }
}

const BrandWallet = () => {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount]   = useState('5000')
  const [reference, setReference] = useState('')
  const [mode, setMode]       = useState('card')     // card | bank
  const [busy, setBusy]       = useState(false)
  const [banner, setBanner]   = useState(bannerFromUrl)

  const load = useCallback(() => (
    getBrandWallet()
      .then(setData)
      .catch(err => setBanner({ kind: 'err', text: err.response?.data?.message || 'Could not load your balance.' }))
      .finally(() => setLoading(false))
  ), [])

  useEffect(() => {
    load()
    if (new URLSearchParams(window.location.search).get('funded')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [load])

  const fund = async () => {
    const value = Number(amount)
    if (!value) return
    setBusy(true); setBanner(null)
    try {
      if (mode === 'card') {
        const d = await initBrandFunding(value)
        window.location.href = d.url
      } else {
        const d = await declareBankTransfer(value, reference)
        setBanner({ kind: 'ok', text: d.message })
        setReference('')
        await load()
      }
    } catch (err) {
      setBanner({ kind: 'err', text: err.response?.data?.message || 'Could not start that top-up.' })
    } finally {
      setBusy(false)
    }
  }

  const balance = data?.balance ?? 0
  const low = !loading && balance <= (data?.lowBalanceAlert ?? 2000)

  const cards = [
    { label: 'Available balance', value: balance, color: low ? 'var(--amber-ink)' : 'var(--green-ink)', grad: low ? 'linear-gradient(135deg,#f59e0b22,#fbbf2422)' : 'linear-gradient(135deg,#22c55e22,#4ade8022)', border: low ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)', sub: 'Funds creator rewards' },
    { label: 'Total funded',      value: data?.funded ?? 0,  color: 'var(--violet-ink)', grad: 'linear-gradient(135deg,#7c3aed22,#a78bfa22)', border: 'rgba(124,58,237,0.3)', sub: 'Money you put in' },
    { label: 'Rewards paid',      value: data?.spent ?? 0,   color: 'var(--cyan-ink)', grad: 'linear-gradient(135deg,#06b6d422,#67e8f922)', border: 'rgba(6,182,212,0.3)', sub: 'Released to creators' },
    { label: 'Awaiting confirmation', value: data?.pendingFunding ?? 0, color: 'rgba(var(--ink-rgb),0.55)', grad: 'rgba(var(--ink-rgb),0.03)', border: 'rgba(var(--ink-rgb),0.1)', sub: 'Declared transfers' },
  ]

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Campaign Money</span></div>
        <h1 className="page-title">Campaign Balance</h1>
        <p className="page-subtitle">
          Every reward FlexTag releases to a creator is drawn from here. Keep it funded and your campaigns keep running.
        </p>
      </div>

      {banner && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 16, fontSize: 13,
          background: banner.kind === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${banner.kind === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: banner.kind === 'ok' ? 'var(--green-ink)' : '#f87171',
        }}>{banner.text}</div>
      )}

      {low && !loading && (
        <div style={{ padding: '12px 16px', borderRadius: 16, marginBottom: 20, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber-ink)', margin: '0 0 2px' }}>
            {balance <= 0 ? 'Your balance is empty' : 'Running low'}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.5)', margin: 0 }}>
            {data?.enforce
              ? 'Creators cannot order from your campaigns until you top up.'
              : 'Top up to stay ahead of the rewards your live campaigns owe.'}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 26 }}>
        {cards.map(c => (
          <div key={c.label} style={{ padding: 22, borderRadius: 16, background: c.grad, border: `1px solid ${c.border}` }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>{c.label}</p>
            <p className="tnum" style={{ fontSize: 28, fontWeight: 800, color: c.color, letterSpacing: '-0.03em' }}>{loading ? '—' : `৳${c.value.toLocaleString()}`}</p>
            <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.3)', marginTop: 4 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Ledger */}
        <div style={{ background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 16, padding: 24 }} className="lg:col-span-2">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 18px' }}>Account activity</h2>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><div className="spinner" /></div>
          ) : !data?.entries?.length ? (
            <div className="empty-state"><Landmark size={28} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 8 }} /><p>Nothing yet — add funds to launch a campaign that can actually pay.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.entries.map(e => {
                const st = TYPE_STYLE[e.type] || TYPE_STYLE.spend
                return (
                  <div key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{e.desc || st.label}</p>
                      <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.25)', marginTop: 2 }}>
                        {new Date(e.createdAt).toLocaleDateString()} · {st.label}{e.method ? ` · ${e.method.replace(/_/g, ' ')}` : ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p className="tnum" style={{ fontSize: 14, fontWeight: 700, color: st.color, margin: 0 }}>{st.sign}৳{e.amount?.toLocaleString()}</p>
                      {e.status !== 'completed' && (
                        <span className={`badge ${e.status === 'pending' ? 'badge-warning' : 'badge-error'}`} style={{ marginTop: 4, fontSize: 9 }}>{e.status}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Add funds */}
        <div style={{ background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 16, padding: 24, height: 'fit-content' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}>Add funds</h2>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[['card', 'Card / bKash'], ['bank', 'Bank transfer']].map(([value, label]) => (
              <button key={value} onClick={() => setMode(value)} className="btn-ghost" style={{
                flex: 1, padding: '8px 0', fontSize: 12,
                ...(mode === value ? { background: 'rgba(124,58,237,0.25)', color: 'var(--violet-ink)', borderColor: 'rgba(124,58,237,0.4)' } : {}),
              }}>{label}</button>
            ))}
          </div>

          <label className="field-label">Amount (৳)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="field-input"
            min={data?.minFunding || 1000} placeholder={`Min ৳${(data?.minFunding || 1000).toLocaleString()}`} />

          <div style={{ display: 'flex', gap: 6, margin: '10px 0 4px' }}>
            {[5000, 10000, 25000].map(v => (
              <button key={v} onClick={() => setAmount(String(v))} className="btn-ghost" style={{ flex: 1, padding: '6px 0', fontSize: 11 }}>৳{(v / 1000)}k</button>
            ))}
          </div>

          {mode === 'bank' && (
            <div style={{ marginTop: 12 }}>
              <label className="field-label">Transfer reference</label>
              <input value={reference} onChange={e => setReference(e.target.value)} className="field-input" placeholder="e.g. TRX-8891 / slip number" />
              <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', marginTop: 6, lineHeight: 1.5 }}>
                Send the transfer first, then record it here. It becomes spendable once FlexTag matches it to the statement.
              </p>
            </div>
          )}

          {mode === 'card' && data && !data.gatewayReady && (
            <p style={{ fontSize: 11, color: 'var(--amber-ink)', marginTop: 10, lineHeight: 1.5 }}>
              Card payment is not switched on for this deployment yet — use a bank transfer.
            </p>
          )}

          <button onClick={fund} disabled={busy || !amount || (mode === 'card' && data && !data.gatewayReady)}
            className="btn-primary" style={{ width: '100%', padding: 14, marginTop: 16 }}>
            {busy ? 'Working…' : mode === 'card' ? `Pay ৳${Number(amount || 0).toLocaleString()}` : 'Record transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BrandWallet
