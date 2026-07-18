import React, { useState, useEffect } from 'react'
import { getLeaderboard } from '../../services/users'
import { useAuth } from '../../context/AuthContext'

const tierGrad = {
  diamond: 'from-cyan-300 to-blue-400',
  gold:    'from-yellow-400 to-amber-500',
  silver:  'from-gray-300 to-gray-500',
  bronze:  'from-amber-700 to-amber-900',
}

const badges = [
  { emoji: '🏆', name: 'Top Performer',  desc: 'Ranked #1 on the monthly leaderboard',        color: 'from-yellow-500/15 to-amber-500/15 border-yellow-500/20' },
  { emoji: '⚡', name: 'Fast Poster',    desc: 'Submitted post within 24h of delivery',        color: 'from-blue-500/15 to-cyan-500/15 border-blue-500/20' },
  { emoji: '🌟', name: 'Quality Creator',desc: 'Avg engagement rate above 5%',                 color: 'from-violet-500/15 to-purple-500/15 border-violet-500/20' },
  { emoji: '🥇', name: 'Gold Tier',      desc: 'Achieved Gold tier status',                    color: 'from-yellow-500/15 to-orange-500/15 border-yellow-500/20' },
  { emoji: '💎', name: 'Diamond Elite',  desc: 'Achieved Diamond tier status',                 color: 'from-cyan-500/15 to-blue-500/15 border-cyan-500/20' },
  { emoji: '🔥', name: 'Streak Master',  desc: '10+ consecutive successful campaigns',          color: 'from-orange-500/15 to-red-500/15 border-orange-500/20' },
]

const Leaderboard = () => {
  const { user } = useAuth()
  const [tab, setTab]         = useState('leaderboard')
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard()
      .then(d => setCreators(d.creators || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const ranked = creators.map((c, i) => ({ ...c, rank: i + 1 }))
  const top3   = ranked.slice(0, 3)
  const myRank = ranked.findIndex(c => c._id === user?._id) + 1

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Leaderboard & Badges</h1>
      <p className="text-zinc-500 mb-6">Compete, earn badges, and unlock premium campaigns</p>

      {myRank > 0 && (
        <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/15 mb-6 flex items-center gap-3">
          <span className="text-2xl">🏅</span>
          <div>
            <p className="text-sm font-semibold text-orange-400">Your Current Rank: #{myRank}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Keep completing campaigns to climb higher!</p>
          </div>
        </div>
      )}

      <div className="flex bg-white/5 rounded-xl p-1 mb-6 w-fit">
        {[{ id: 'leaderboard', label: '🏅 Leaderboard' }, { id: 'badges', label: '🎖️ Badges' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' ? (
        loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-lg text-zinc-400">No creators yet</p>
            <p className="text-sm text-zinc-600">Be the first to complete campaigns!</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
            {/* Top 3 podium */}
            {top3.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 p-6 border-b border-white/5">
                {[ranked[1], ranked[0], ranked[2]].map((c, i) => {
                  const pos = [2, 1, 3][i]
                  if (!c) return <div key={i} />
                  return (
                    <div key={c._id} className={`text-center ${pos === 1 ? 'order-2' : pos === 2 ? 'order-1' : 'order-3'}`}>
                      <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${tierGrad[c.tier] || tierGrad.bronze} flex items-center justify-center text-white text-lg font-bold mb-2 ${pos === 1 ? 'ring-2 ring-yellow-400/50' : ''}`}>
                        {c.name[0]}
                      </div>
                      <p className="text-sm font-bold text-white">{c.name.split(' ')[0]}</p>
                      <p className="text-xs text-zinc-500">{c.instagramHandle || '@' + c.name.split(' ')[0].toLowerCase()}</p>
                      <p className="text-lg font-extrabold mt-1 bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">#{pos}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full list */}
            <div className="divide-y divide-white/5">
              {ranked.map(c => (
                <div key={c._id} className={`flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-all ${c._id === user?._id ? 'bg-orange-500/5' : ''}`}>
                  <span className={`w-8 text-center text-sm font-bold ${c.rank <= 3 ? 'bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent' : 'text-zinc-600'}`}>#{c.rank}</span>
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tierGrad[c.tier] || tierGrad.bronze} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>{c.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {c.name} {c._id === user?._id && <span className="text-orange-400 text-xs">(You)</span>}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {c.instagramHandle || '@' + c.name.split(' ')[0].toLowerCase()} · {(c.followersCount || 0).toLocaleString()} followers
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">{c.completedCampaigns || 0} campaigns</p>
                    <p className="text-xs text-emerald-400">৳{(c.totalEarnings || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
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
