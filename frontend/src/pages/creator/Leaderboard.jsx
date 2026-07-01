import React, { useState } from 'react'

const creators = [
  { rank: 1, name: 'Priya Das', handle: '@priya.styles', followers: 15000, posts: 42, earnings: 68500, er: 5.8, tier: 'diamond', badges: ['🏆', '⚡', '🌟'] },
  { rank: 2, name: 'Tasnim Rahman', handle: '@tasnim.styles', followers: 12400, posts: 18, earnings: 34500, er: 4.7, tier: 'gold', badges: ['🥇', '⚡'] },
  { rank: 3, name: 'Ayesha Karim', handle: '@ayesha.glow', followers: 9800, posts: 35, earnings: 52000, er: 5.2, tier: 'gold', badges: ['🥇', '🌟'] },
  { rank: 4, name: 'Rafiq Hossain', handle: '@rafiq.tech', followers: 3500, posts: 12, earnings: 18000, er: 6.1, tier: 'silver', badges: ['⚡'] },
  { rank: 5, name: 'Nusrat Jahan', handle: '@nusrat.beauty', followers: 8200, posts: 28, earnings: 41000, er: 4.3, tier: 'gold', badges: ['🥇'] },
  { rank: 6, name: 'Saiful Islam', handle: '@saiful.fits', followers: 5600, posts: 15, earnings: 22000, er: 3.9, tier: 'silver', badges: [] },
  { rank: 7, name: 'Tamanna Akter', handle: '@tamanna.style', followers: 11000, posts: 22, earnings: 31000, er: 4.1, tier: 'gold', badges: ['🌟'] },
  { rank: 8, name: 'Mehedi Hasan', handle: '@mehedi.tech', followers: 4200, posts: 8, earnings: 12500, er: 5.5, tier: 'bronze', badges: [] },
]

const badges = [
  { emoji: '🏆', name: 'Top Performer', desc: 'Ranked #1 on the monthly leaderboard', color: 'from-yellow-500/15 to-amber-500/15 border-yellow-500/20' },
  { emoji: '⚡', name: 'Fast Poster', desc: 'Submitted post within 24h of delivery', color: 'from-blue-500/15 to-cyan-500/15 border-blue-500/20' },
  { emoji: '🌟', name: 'Quality Creator', desc: 'Avg engagement rate above 5%', color: 'from-violet-500/15 to-purple-500/15 border-violet-500/20' },
  { emoji: '🥇', name: 'Gold Tier', desc: 'Achieved Gold tier status', color: 'from-yellow-500/15 to-orange-500/15 border-yellow-500/20' },
  { emoji: '💎', name: 'Diamond Elite', desc: 'Achieved Diamond tier status', color: 'from-cyan-500/15 to-blue-500/15 border-cyan-500/20' },
  { emoji: '🔥', name: 'Streak Master', desc: '10+ consecutive successful campaigns', color: 'from-orange-500/15 to-red-500/15 border-orange-500/20' },
]

const tierGrad = { diamond: 'from-cyan-300 to-blue-400', gold: 'from-yellow-400 to-amber-500', silver: 'from-gray-300 to-gray-500', bronze: 'from-amber-700 to-amber-900' }

const Leaderboard = () => {
  const [tab, setTab] = useState('leaderboard')

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Leaderboard & Badges</h1>
      <p className="text-zinc-500 mb-6">Compete, earn badges, and unlock premium campaigns</p>

      <div className="flex bg-white/5 rounded-xl p-1 mb-6 w-fit">
        {[{ id: 'leaderboard', label: '🏅 Leaderboard' }, { id: 'badges', label: '🎖️ Badges' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
          {/* Top 3 podium */}
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-white/5">
            {[creators[1], creators[0], creators[2]].map((c, i) => {
              const pos = [2, 1, 3][i]
              return (
                <div key={c.rank} className={`text-center ${pos === 1 ? 'order-2' : pos === 2 ? 'order-1' : 'order-3'}`}>
                  <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${tierGrad[c.tier]} flex items-center justify-center text-white text-lg font-bold mb-2 ${pos === 1 ? 'w-18 h-18 ring-2 ring-yellow-400/50' : ''}`}>
                    {c.name[0]}
                  </div>
                  <p className="text-sm font-bold text-white">{c.name.split(' ')[0]}</p>
                  <p className="text-xs text-zinc-500">{c.handle}</p>
                  <p className="text-lg font-extrabold mt-1 bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">#{pos}</p>
                </div>
              )
            })}
          </div>

          {/* Full list */}
          <div className="divide-y divide-white/5">
            {creators.map(c => (
              <div key={c.rank} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-all">
                <span className={`w-8 text-center text-sm font-bold ${c.rank <= 3 ? 'bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent' : 'text-zinc-600'}`}>#{c.rank}</span>
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tierGrad[c.tier]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>{c.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  <p className="text-xs text-zinc-500">{c.handle} · {c.followers.toLocaleString()} followers</p>
                </div>
                <div className="hidden sm:flex gap-1">{c.badges.map((b, i) => <span key={i} className="text-sm">{b}</span>)}</div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">{c.posts} posts</p>
                  <p className="text-xs text-emerald-400">ER: {c.er}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map(b => (
            <div key={b.name} className={`p-5 rounded-2xl bg-gradient-to-br ${b.color} border hover:-translate-y-1 transition-all`}>
              <span className="text-4xl mb-3 block">{b.emoji}</span>
              <h3 className="text-sm font-bold text-white mb-1">{b.name}</h3>
              <p className="text-xs text-zinc-400">{b.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Leaderboard
