import React, { useState, useEffect } from 'react'

const campaigns = [
  { id: 1, name: 'GlowUp Matte Lipstick', brand: 'GlowUp Cosmetics', deadlineHours: 86, cashback: 600, status: 'post_pending', image: '💄' },
  { id: 2, name: 'UrbanFit Gym Tank', brand: 'UrbanFit BD', deadlineHours: 128, cashback: 320, status: 'verified', image: '👕' },
  { id: 3, name: 'SkinLab Vitamin C', brand: 'SkinLab BD', deadlineHours: 30, cashback: 1235, status: 'post_pending', image: '🧴' },
  { id: 4, name: 'TechNova Earbuds', brand: 'TechNova', deadlineHours: 166, cashback: 1225, status: 'retention', retentionDaysLeft: 5, image: '🎧' },
]

const CampaignTracker = () => {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatCountdown = (hours) => {
    const d = Math.floor(hours / 24)
    const h = Math.floor(hours % 24)
    const m = Math.floor((hours * 60) % 60)
    return { d, h, m }
  }

  const urgencyColor = (hours) => {
    if (hours <= 6) return 'text-red-400'
    if (hours <= 24) return 'text-yellow-400'
    if (hours <= 48) return 'text-orange-400'
    return 'text-emerald-400'
  }

  const urgencyBg = (hours) => {
    if (hours <= 6) return 'bg-red-500/10 border-red-500/20'
    if (hours <= 24) return 'bg-yellow-500/10 border-yellow-500/20'
    if (hours <= 48) return 'bg-orange-500/10 border-orange-500/20'
    return 'bg-white/[0.03] border-white/5'
  }

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Campaign Tracker</h1>
          <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-bold border border-orange-500/20">★ NEW</span>
        </div>
        <p className="text-zinc-500">Track deadlines and never miss a posting window</p>
      </div>

      {/* Reminder notice */}
      <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/15 mb-6 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">📧</span>
        <div>
          <p className="text-sm font-semibold text-violet-400">Automated Reminders Active</p>
          <p className="text-xs text-zinc-500 mt-0.5">You'll receive email reminders at 48h, 24h, and 6h before each deadline.</p>
        </div>
      </div>

      <div className="space-y-4">
        {campaigns.map(c => {
          const cd = formatCountdown(c.deadlineHours)
          return (
            <div key={c.id} className={`p-5 rounded-2xl border transition-all ${urgencyBg(c.deadlineHours)}`}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-3xl flex-shrink-0">{c.image}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-zinc-500 mb-3">{c.brand}</p>

                  {c.status === 'retention' ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-zinc-500">Retention Progress</span>
                          <span className="text-xs text-emerald-400 font-semibold">{7 - c.retentionDaysLeft}/7 days</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all" style={{ width: `${((7 - c.retentionDaysLeft) / 7) * 100}%` }} />
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">Live ✓</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {/* Countdown */}
                      <div className="flex items-center gap-2">
                        {[{ v: cd.d, l: 'days' }, { v: cd.h, l: 'hrs' }, { v: cd.m, l: 'min' }].map((t, i) => (
                          <div key={i} className="text-center">
                            <div className={`text-2xl font-extrabold font-mono ${urgencyColor(c.deadlineHours)}`}>{String(t.v).padStart(2, '0')}</div>
                            <div className="text-[10px] text-zinc-600 uppercase">{t.l}</div>
                          </div>
                        ))}
                      </div>

                      {c.deadlineHours <= 6 && (
                        <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold animate-pulse">⚠ Urgent</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-emerald-400">৳{c.cashback.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-600 uppercase mt-1">
                    {c.status === 'post_pending' ? 'Post Required' : c.status === 'verified' ? 'Verified' : 'In Retention'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CampaignTracker
