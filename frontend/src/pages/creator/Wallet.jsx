import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { getWallet, requestWithdrawal, topUpWallet } from '../../services/wallet'
import { useT } from '../../context/LanguageContext'

const Wallet = () => {
  const t = useT()
  const [walletData, setWalletData]           = useState({ transactions:[], totalEarnings:0, pendingEscrow:0, available:0 })
  const [loading, setLoading]                 = useState(true)
  const [withdrawAmount, setWithdrawAmount]   = useState('')
  const [bkashNum, setBkashNum]               = useState('')
  const [payoutMethod, setPayoutMethod]       = useState('bkash')
  const [withdrawing, setWithdrawing]         = useState(false)
  const [withdrawError, setWithdrawError]     = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState('')
  
  const [topUpAmount, setTopUpAmount]         = useState('')
  const [toppingUp, setToppingUp]             = useState(false)
  const [topUpError, setTopUpError]           = useState('')
  const [topUpSuccess, setTopUpSuccess]       = useState('')
  
  const minThreshold = walletData.minWithdrawal || 500

  // `loading` starts true, so the first load needs no setState in the effect;
  // reloads after a withdrawal/top-up simply refresh the numbers in place.
  const load = () => {
    getWallet().then(d => setWalletData(d)).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleWithdraw = async () => {
    if (!withdrawAmount || !bkashNum) return
    setWithdrawing(true); setWithdrawError(''); setWithdrawSuccess('')
    try {
      const d = await requestWithdrawal({ amount: Number(withdrawAmount), account: bkashNum, method: payoutMethod })
      setWithdrawSuccess(d.message || 'Payout requested.')
      setWithdrawAmount(''); setBkashNum('')
      load()
    } catch (err) {
      setWithdrawError(err.response?.data?.message || 'Failed to submit withdrawal.')
    } finally { setWithdrawing(false) }
  }

  const handleTopUp = async () => {
    if (!topUpAmount || Number(topUpAmount) < 50) return
    setToppingUp(true); setTopUpError(''); setTopUpSuccess('')
    try {
      await topUpWallet({ amount: Number(topUpAmount), paymentMethod: 'Card / bKash Gateway' })
      setTopUpSuccess(`Successfully topped up ৳${topUpAmount}`)
      setTopUpAmount('')
      load()
    } catch (err) {
      setTopUpError(err.response?.data?.message || 'Failed to top up wallet.')
    } finally { setToppingUp(false) }
  }

  const { transactions, totalEarnings, pendingEscrow, available } = walletData
  const reserved = walletData.reserved || 0

  const PAYOUT_STATUS = {
    queued:     { label: 'Queued for payout',  cls: 'badge-warning' },
    processing: { label: 'Sending',            cls: 'badge-cyan' },
    paid:       { label: 'Paid',               cls: 'badge-success' },
    failed:     { label: 'Held',               cls: 'badge-error' },
    rejected:   { label: 'Returned to wallet', cls: 'badge-neutral' },
  }

  const balCards = [
    { label:t('wallet.totalEarnings'),    value:`৳${totalEarnings.toLocaleString()}`, sub:'Lifetime cashback earned',    text:'var(--violet-ink)' },
    { label:t('wallet.pendingEscrow'),    value:`৳${pendingEscrow.toLocaleString()}`,  sub:'Awaiting post verification',  text:'var(--amber-ink)' },
    { label:t('wallet.available'), value:`৳${available.toLocaleString()}`,      sub: reserved > 0 ? `৳${reserved.toLocaleString()} reserved for a payout in the queue` : 'Ready to withdraw — usually paid same day', text:'var(--green-ink)' },
  ]

  const txIcon = type => type === 'cashback' || type === 'top_up'
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>My earnings</span></div>
        <h1 className="page-title">{t('page.wallet.title')}</h1>
        <p className="page-subtitle">{t('page.wallet.subtitle')}</p>
      </div>

      {/* Balance cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
        {balCards.map(b => (
          <div key={b.label} style={{ padding:24, borderRadius:16, background:'rgba(var(--ink-rgb),0.03)', border:'1px solid rgba(var(--ink-rgb),0.08)' }}>
            <p style={{ fontSize:12, fontWeight:500, letterSpacing:0, textTransform:'none', color:'rgba(var(--ink-rgb),0.45)', marginBottom:10 }}>{b.label}</p>
            <p className="tnum" style={{ fontSize:30, fontWeight:800, color:b.text, letterSpacing:'-0.03em' }}>{loading ? '—' : b.value}</p>
            <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.3)', marginTop:6 }}>{b.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gap:20 }} className="lg:grid-cols-3">
        {/* Transactions */}
        <div style={{ background:'rgba(var(--ink-rgb),0.04)', border:'1px solid rgba(var(--ink-rgb),0.08)', borderRadius:16, padding:24, gridColumn:'span 2' }} className="lg:col-span-2">
          <h2 style={{ fontSize:16, fontWeight:700, color: 'var(--text)', margin:'0 0 20px' }}>{t('wallet.transactions')}</h2>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}><div className="spinner" /></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state"><p><CreditCard size={22} style={{ color: 'rgba(var(--ink-rgb),0.3)' }} strokeWidth={1.5} /></p><p>No transactions yet</p></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {transactions.map(t => (
                <div key={t._id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderRadius:12, transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--ink-rgb),0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width:38, height:38, borderRadius:10, background: t.type==='cashback' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {txIcon(t.type)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:500, color: 'var(--text)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.desc || t.type}</p>
                    <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.25)', marginTop:2 }}>{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p className="tnum" style={{ fontSize:14, fontWeight:700, color: (t.type==='cashback'||t.type==='top_up') ? 'var(--green-ink)' : '#f87171', margin:0 }}>
                      {(t.type==='cashback'||t.type==='top_up') ? '+' : '-'}৳{t.amount?.toLocaleString()}
                    </p>
                    <span className={`badge ${t.type === 'withdrawal' && PAYOUT_STATUS[t.payoutStatus]
                      ? PAYOUT_STATUS[t.payoutStatus].cls
                      : t.status==='pending' ? 'badge-warning' : t.status==='completed' ? 'badge-success' : 'badge-neutral'}`} style={{ marginTop:4, fontSize:9 }}>
                      {t.type === 'withdrawal' && PAYOUT_STATUS[t.payoutStatus] ? PAYOUT_STATUS[t.payoutStatus].label : t.status}
                    </span>
                    {t.type === 'withdrawal' && t.payoutRef && t.payoutStatus === 'paid' && (
                      <p style={{ fontSize:10, color:'rgba(var(--ink-rgb),0.3)', marginTop:3, fontFamily:'monospace' }}>{t.payoutRef}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls Column */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Add Cash */}
          <div style={{ background:'rgba(var(--ink-rgb),0.04)', border:'1px solid rgba(var(--ink-rgb),0.08)', borderRadius:16, padding:24 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color: 'var(--text)', margin:'0 0 20px' }}>{t('wallet.addCash')}</h2>
            
            {topUpSuccess && <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', marginBottom:14 }}><p style={{ fontSize:13, color:'var(--green-ink)', margin:0 }}>{topUpSuccess}</p></div>}
            {topUpError   && <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(239,68,68,0.1)',  border:'1px solid rgba(239,68,68,0.2)',  marginBottom:14 }}><p style={{ fontSize:13, color:'#f87171', margin:0 }}>{topUpError}</p></div>}

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label className="field-label">Amount (৳)</label>
                <input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)}
                  placeholder="Min ৳50" min={50} className="field-input" />
              </div>
              <button onClick={handleTopUp} className="btn-primary"
                disabled={!topUpAmount || Number(topUpAmount)<50 || toppingUp}
                style={{ width:'100%', padding:14, marginTop:4 }}>
                {toppingUp ? 'Processing…' : 'Top up wallet'}
              </button>
            </div>
          </div>

          {/* Withdraw */}
          <div style={{ background:'rgba(var(--ink-rgb),0.04)', border:'1px solid rgba(var(--ink-rgb),0.08)', borderRadius:16, padding:24 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color: 'var(--text)', margin:'0 0 20px' }}>{t('wallet.withdraw')}</h2>

            <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', marginBottom:16 }}>
              <p style={{ fontSize:12, color:'var(--violet-ink)', fontWeight:600, margin:'0 0 4px' }}>Minimum withdrawal: ৳{minThreshold}</p>
              <p style={{ fontSize:11, color:'rgba(var(--ink-rgb),0.3)', margin:0 }}>Reduces processing fees</p>
            </div>

            {withdrawSuccess && <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', marginBottom:14 }}><p style={{ fontSize:13, color:'var(--green-ink)', margin:0 }}>{withdrawSuccess}</p></div>}
            {withdrawError   && <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(239,68,68,0.1)',  border:'1px solid rgba(239,68,68,0.2)',  marginBottom:14 }}><p style={{ fontSize:13, color:'#f87171', margin:0 }}>{withdrawError}</p></div>}

            {available < minThreshold ? (
              <div style={{ padding:16, borderRadius:14, background:'rgba(var(--ink-rgb),0.03)', textAlign:'center' }}>
                <p style={{ fontSize:14, color:'rgba(var(--ink-rgb),0.4)', margin:'0 0 6px' }}>Insufficient balance</p>
                <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>Need <span className="tnum" style={{ color:'var(--text)' }}>৳{(minThreshold-available).toLocaleString()}</span> more</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label className="field-label">Amount (৳)</label>
                  <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                    placeholder={`Min ৳${minThreshold}`} max={available} className="field-input" />
                </div>
                <div>
                  <label className="field-label">{t('wallet.payoutMethod')}</label>
                  <div style={{ display:'flex', gap:6 }}>
                    {[['bkash','bKash'], ['nagad','Nagad'], ['rocket','Rocket']].map(([value, label]) => (
                      <button key={value} onClick={() => setPayoutMethod(value)} style={{
                        flex:1, padding:'8px 0', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                        background: payoutMethod === value ? 'rgba(124,58,237,0.25)' : 'rgba(var(--ink-rgb),0.04)',
                        color: payoutMethod === value ? 'var(--violet-ink)' : 'rgba(var(--ink-rgb),0.5)',
                        border: payoutMethod === value ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(var(--ink-rgb),0.08)',
                      }}>{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="field-label">{payoutMethod === 'bkash' ? 'bKash' : payoutMethod === 'nagad' ? 'Nagad' : 'Rocket'} Number</label>
                  <input type="tel" value={bkashNum} onChange={e => setBkashNum(e.target.value)}
                    placeholder="01XXXXXXXXX" className="field-input" />
                  <p style={{ fontSize:11, color:'rgba(var(--ink-rgb),0.3)', marginTop:6 }}>
                    Double-check the number — payouts go straight to it.
                  </p>
                </div>
                <button onClick={handleWithdraw} className="btn-primary"
                  disabled={!withdrawAmount || Number(withdrawAmount)<minThreshold || Number(withdrawAmount)>available || !bkashNum || withdrawing}
                  style={{ width:'100%', padding:14, marginTop:4 }}>
                  {withdrawing ? 'Submitting…' : t('wallet.requestWithdrawal')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Wallet
