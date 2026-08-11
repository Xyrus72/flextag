import React, { useState, useEffect } from 'react'
import { getWallet, requestWithdrawal, topUpWallet } from '../../services/wallet'

const Wallet = () => {
  const [walletData, setWalletData]           = useState({ transactions:[], totalEarnings:0, pendingEscrow:0, available:0 })
  const [loading, setLoading]                 = useState(true)
  const [withdrawAmount, setWithdrawAmount]   = useState('')
  const [bkashNum, setBkashNum]               = useState('')
  const [withdrawing, setWithdrawing]         = useState(false)
  const [withdrawError, setWithdrawError]     = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState('')
  
  const [topUpAmount, setTopUpAmount]         = useState('')
  const [toppingUp, setToppingUp]             = useState(false)
  const [topUpError, setTopUpError]           = useState('')
  const [topUpSuccess, setTopUpSuccess]       = useState('')
  
  const minThreshold = 500

  const load = () => {
    setLoading(true)
    getWallet().then(d => setWalletData(d)).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleWithdraw = async () => {
    if (!withdrawAmount || !bkashNum) return
    setWithdrawing(true); setWithdrawError(''); setWithdrawSuccess('')
    try {
      await requestWithdrawal({ amount: Number(withdrawAmount), bkashNumber: bkashNum })
      setWithdrawSuccess('Withdrawal request submitted! Pending admin approval.')
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

  const balCards = [
    { label:'Total Earnings',    value:`৳${totalEarnings.toLocaleString()}`, sub:'Lifetime cashback earned',    grad:'linear-gradient(135deg,#7c3aed44,#06b6d444)', border:'rgba(124,58,237,0.3)',  text:'#a78bfa' },
    { label:'Pending Escrow',    value:`৳${pendingEscrow.toLocaleString()}`,  sub:'Awaiting post verification',  grad:'linear-gradient(135deg,#f59e0b22,#fbbf2422)', border:'rgba(245,158,11,0.3)', text:'#fbbf24' },
    { label:'Available Balance', value:`৳${available.toLocaleString()}`,      sub:'Ready for withdrawal',        grad:'linear-gradient(135deg,#22c55e22,#4ade8022)', border:'rgba(34,197,94,0.3)', text:'#4ade80' },
  ]

  const txIcon = type => type === 'cashback' || type === 'top_up'
    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>My Earnings</span></div>
        <h1 className="page-title">Wallet</h1>
        <p className="page-subtitle">Track your cashback earnings and withdraw anytime</p>
      </div>

      {/* Balance cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
        {balCards.map(b => (
          <div key={b.label} style={{ padding:24, borderRadius:20, background:b.grad, border:`1px solid ${b.border}`, backdropFilter:'blur(20px)' }}>
            <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:10 }}>{b.label}</p>
            <p style={{ fontSize:30, fontWeight:900, color:b.text, letterSpacing:'-0.03em' }}>{loading ? '—' : b.value}</p>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:6 }}>{b.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gap:20 }} className="lg:grid-cols-3">
        {/* Transactions */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:24, gridColumn:'span 2' }} className="lg:col-span-2">
          <h2 style={{ fontSize:16, fontWeight:700, color:'#fff', margin:'0 0 20px' }}>Transaction History</h2>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}><div className="spinner" /></div>
          ) : transactions.length === 0 ? (
            <div className="empty-state"><p>💳</p><p>No transactions yet</p></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {transactions.map(t => (
                <div key={t._id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderRadius:12, transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width:38, height:38, borderRadius:10, background: t.type==='cashback' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {txIcon(t.type)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:500, color:'#fff', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.desc || t.type}</p>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)', marginTop:2 }}>{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontSize:14, fontWeight:700, color: (t.type==='cashback'||t.type==='top_up') ? '#4ade80' : '#f87171', margin:0 }}>
                      {(t.type==='cashback'||t.type==='top_up') ? '+' : '-'}৳{t.amount?.toLocaleString()}
                    </p>
                    <span className={`badge ${t.status==='pending' ? 'badge-warning' : t.status==='completed' ? 'badge-success' : 'badge-neutral'}`} style={{ marginTop:4, fontSize:9 }}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls Column */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Add Cash */}
          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:24 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#fff', margin:'0 0 20px' }}>Add Cash</h2>
            
            {topUpSuccess && <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', marginBottom:14 }}><p style={{ fontSize:13, color:'#4ade80', margin:0 }}>{topUpSuccess}</p></div>}
            {topUpError   && <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(239,68,68,0.1)',  border:'1px solid rgba(239,68,68,0.2)',  marginBottom:14 }}><p style={{ fontSize:13, color:'#f87171', margin:0 }}>{topUpError}</p></div>}

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label className="field-label">Amount (৳)</label>
                <input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)}
                  placeholder="Min ৳50" min={50} className="field-input" />
              </div>
              <button onClick={handleTopUp} className="btn-primary"
                disabled={!topUpAmount || Number(topUpAmount)<50 || toppingUp}
                style={{ width:'100%', padding:14, marginTop:4, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669' }}>
                {toppingUp ? 'Processing…' : 'Top Up Wallet'}
              </button>
            </div>
          </div>

          {/* Withdraw */}
          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:24 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#fff', margin:'0 0 20px' }}>Withdraw</h2>

            <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', marginBottom:16 }}>
              <p style={{ fontSize:12, color:'#a78bfa', fontWeight:600, margin:'0 0 4px' }}>Minimum withdrawal: ৳{minThreshold}</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', margin:0 }}>Reduces processing fees</p>
            </div>

            {withdrawSuccess && <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', marginBottom:14 }}><p style={{ fontSize:13, color:'#4ade80', margin:0 }}>{withdrawSuccess}</p></div>}
            {withdrawError   && <div style={{ padding:'10px 14px', borderRadius:12, background:'rgba(239,68,68,0.1)',  border:'1px solid rgba(239,68,68,0.2)',  marginBottom:14 }}><p style={{ fontSize:13, color:'#f87171', margin:0 }}>{withdrawError}</p></div>}

            {available < minThreshold ? (
              <div style={{ padding:16, borderRadius:14, background:'rgba(255,255,255,0.03)', textAlign:'center' }}>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', margin:'0 0 6px' }}>Insufficient balance</p>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.2)', margin:0 }}>Need ৳{(minThreshold-available).toLocaleString()} more</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label className="field-label">Amount (৳)</label>
                  <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                    placeholder={`Min ৳${minThreshold}`} max={available} className="field-input" />
                </div>
                <div>
                  <label className="field-label">bKash Number</label>
                  <input type="tel" value={bkashNum} onChange={e => setBkashNum(e.target.value)}
                    placeholder="+880 1XXX-XXXXXX" className="field-input" />
                </div>
                <button onClick={handleWithdraw} className="btn-primary"
                  disabled={!withdrawAmount || Number(withdrawAmount)<minThreshold || Number(withdrawAmount)>available || !bkashNum || withdrawing}
                  style={{ width:'100%', padding:14, marginTop:4 }}>
                  {withdrawing ? 'Submitting…' : 'Request Withdrawal'}
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
