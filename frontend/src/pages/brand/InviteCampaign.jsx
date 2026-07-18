import React, { useState, useEffect } from 'react'
import { getUsers } from '../../services/users'
import api from '../../services/api'

const tierGrad = {
  diamond: 'from-cyan-300 to-blue-400',
  gold:    'from-yellow-400 to-amber-500',
  silver:  'from-gray-300 to-gray-500',
  bronze:  'from-amber-700 to-amber-900',
}

const InviteCampaign = () => {
  const [creators, setCreators] = useState([])
  const [loading, setLoading]   = useState(true)
  const [invited, setInvited]   = useState({})
  const [sending, setSending]   = useState({})
  const [tierFilter, setTierFilter] = useState('all')
  const [minER, setMinER]       = useState(0)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    getUsers({ role: 'creator' })
      .then(d => setCreators(d.users || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = creators
    .filter(c => tierFilter === 'all' || c.tier === tierFilter)
    .filter(c => (c.engagementRate || 0) >= minER)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.instagramHandle || '').includes(search.toLowerCase()))

  const toggleInvite = async (id) => {
    setSending(s => ({ ...s, [id]: true }))
    try {
      // In a real implementation, this would send an invite notification
      await new Promise(r => setTimeout(r, 500)) // simulate API call
      setInvited(inv => ({ ...inv, [id]: !inv[id] }))
    } finally {
      setSending(s => ({ ...s, [id]: false }))
    }
  }

  const invitedCount = Object.values(invited).filter(Boolean).length

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Private Campaign Invites</h1>
          <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-bold border border-orange-500/20">★ NEW</span>
        </div>
        <p className="text-zinc-500">Invite specific creators to your exclusive campaigns</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search creators..."
          className="flex-1 min-w-[200px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 outline-none placeholder:text-zinc-600" />
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
          className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm focus:border-orange-500 outline-none">
          <option value="all">All Tiers</option>
          {['diamond', 'gold', 'silver', 'bronze'].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-zinc-500 whitespace-nowrap">Min ER:</span>
          <input type="range" min="0" max="8" step="0.5" value={minER} onChange={e => setMinER(Number(e.target.value))} className="w-20 accent-orange-500" />
          <span className="text-xs text-orange-400 font-bold w-8">{minER}%</span>
        </div>
      </div>

      {/* Invited count banner */}
      {invitedCount > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 mb-6 flex items-center justify-between">
          <p className="text-sm text-emerald-400 font-semibold">{invitedCount} creator{invitedCount > 1 ? 's' : ''} selected for invite</p>
          <button className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/25 hover:bg-emerald-500/25 transition-all">
            Send All Invites →
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-lg text-zinc-400">No creators found</p>
          <p className="text-sm text-zinc-600">Adjust your filters or wait for creators to register</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c._id} className={`rounded-2xl border p-5 transition-all hover:-translate-y-1 ${invited[c._id] ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.03] border-white/5'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${tierGrad[c.tier] || tierGrad.bronze} flex items-center justify-center text-white font-bold flex-shrink-0`}>{c.name[0]}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  <p className="text-xs text-zinc-500">{c.instagramHandle || '@' + c.name.split(' ')[0].toLowerCase()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { l: 'Followers',  v: c.followersCount >= 1000 ? `${(c.followersCount / 1000).toFixed(1)}K` : (c.followersCount || 0) },
                  { l: 'Engagement', v: `${c.engagementRate || 0}%` },
                  { l: 'Campaigns',  v: c.completedCampaigns || 0 },
                  { l: 'Earned',     v: `৳${((c.totalEarnings || 0) / 1000).toFixed(1)}K` },
                ].map(s => (
                  <div key={s.l} className="text-center p-2 rounded-lg bg-white/[0.02]">
                    <p className="text-xs text-zinc-500">{s.l}</p>
                    <p className="text-sm font-bold text-white">{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${c.tier === 'diamond' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : c.tier === 'gold' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>{c.tier || 'bronze'}</span>
                <button onClick={() => toggleInvite(c._id)} disabled={sending[c._id]}
                  className={`ml-auto px-4 py-2 rounded-lg text-xs font-semibold transition-all ${invited[c._id] ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20'}`}>
                  {sending[c._id] ? '...' : invited[c._id] ? '✓ Invited' : 'Invite'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default InviteCampaign
