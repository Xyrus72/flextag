import React, { useState, useEffect } from 'react'
import { getWallet, requestWithdrawal } from '../../services/wallet'

const Wallet = () => {
  const [walletData, setWalletData]     = useState({ transactions: [], totalEarnings: 0, pendingEscrow: 0, available: 0 })
  const [loading, setLoading]           = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [bkashNum, setBkashNum]         = useState('')
  const [withdrawing, setWithdrawing]   = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState('')
  const minThreshold = 500

  const load = () => {
    setLoading(true)
    getWallet()
      .then(d => setWalletData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleWithdraw = async () => {
    if (!withdrawAmount || !bkashNum) return
    setWithdrawing(true)
    setWithdrawError('')
    setWithdrawSuccess('')
    try {
      await requestWithdrawal({ amount: Number(withdrawAmount), bkashNumber: bkashNum })
      setWithdrawSuccess('Withdrawal request submitted! Pending admin approval.')
      setWithdrawAmount('')
      setBkashNum('')
      load()
    } catch (err) {
      setWithdrawError(err.response?.data?.message || 'Failed to submit withdrawal.')
    } finally {
      setWithdrawing(false)
    }
  }

  const { transactions, totalEarnings, pendingEscrow, available } = walletData

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-8">Wallet</h1>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Earnings',    value: `৳${totalEarnings.toLocaleString()}`,  sub: 'Lifetime cashback earned', grad: 'from-orange-500/15 to-pink-500/15',   border: 'border-orange-500/20',  text: 'bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent' },
          { label: 'Pending Escrow',    value: `৳${pendingEscrow.toLocaleString()}`,   sub: 'Awaiting post verification', grad: 'from-yellow-500/10 to-amber-500/10', border: 'border-yellow-500/20',  text: 'text-yellow-400' },
          { label: 'Available Balance', value: `৳${available.toLocaleString()}`,       sub: 'Ready for withdrawal',    grad: 'from-emerald-500/10 to-teal-500/10',  border: 'border-emerald-500/20', text: 'text-emerald-400' },
        ].map(b => (
          <div key={b.label} className={`p-5 rounded-2xl bg-gradient-to-br ${b.grad} border ${b.border}`}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">{b.label}</p>
            <p className={`text-3xl font-extrabold ${b.text}`}>{loading ? '...' : b.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{b.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Transactions */}
        <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-5">Transaction History</h2>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /></div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-white/10">
              <p className="text-3xl mb-2">💳</p>
              <p className="text-zinc-400 text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(t => (
                <div key={t._id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-all">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'cashback' ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`}>
                    {t.type === 'cashback' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.desc || t.type}</p>
                    <p className="text-xs text-zinc-600">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${t.type === 'cashback' ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {t.type === 'cashback' ? '+' : '-'}৳{t.amount?.toLocaleString()}
                    </p>
                    <p className={`text-[10px] ${t.status === 'pending' ? 'text-yellow-400' : 'text-zinc-600'}`}>{t.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Withdraw */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-4">Withdraw</h2>

          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 mb-4">
            <p className="text-xs text-blue-400 font-medium">★ Minimum withdrawal: ৳{minThreshold}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Reduces per-transaction processing fees</p>
          </div>

          {withdrawSuccess && <p className="text-xs text-emerald-400 mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">{withdrawSuccess}</p>}
          {withdrawError   && <p className="text-xs text-red-400 mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{withdrawError}</p>}

          {available < minThreshold ? (
            <div className="p-4 rounded-xl bg-white/5 text-center">
              <p className="text-sm text-zinc-400 mb-1">Insufficient balance</p>
              <p className="text-xs text-zinc-600">Need ৳{(minThreshold - available).toLocaleString()} more to withdraw</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">Amount (৳)</label>
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder={`Min ৳${minThreshold}`} max={available}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-1.5">bKash Number</label>
                <input type="tel" value={bkashNum} onChange={e => setBkashNum(e.target.value)} placeholder="+880 1XXX-XXXXXX"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none" />
              </div>
              <button onClick={handleWithdraw}
                disabled={!withdrawAmount || Number(withdrawAmount) < minThreshold || Number(withdrawAmount) > available || !bkashNum || withdrawing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-30">
                {withdrawing ? 'Submitting...' : 'Request Withdrawal'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Wallet
