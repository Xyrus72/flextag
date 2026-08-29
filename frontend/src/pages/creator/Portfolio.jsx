import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getPosts } from '../../services/posts'
import { getMyStats } from '../../services/users'

const Portfolio = () => {
  const { user } = useAuth()
  const [posts, setPosts]     = useState([])
  const [stats, setStats]     = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [postsData, statsData] = await Promise.all([
          getPosts({ status: 'approved' }),
          getMyStats(),
        ])
        setPosts(postsData.posts || [])
        setStats(statsData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const tierBg = {
    diamond: 'from-cyan-300 to-blue-400',
    gold:    'from-yellow-400 to-amber-500',
    silver:  'from-gray-300 to-gray-500',
    bronze:  'from-amber-700 to-amber-900',
  }

  const handle = String(user?.instagramHandle || '').replace(/^@/, '').trim()
  const publicUrl = handle ? `${window.location.origin}/u/${handle}` : ''
  const copyPublic = () => { if (publicUrl) navigator.clipboard?.writeText(publicUrl).catch(() => {}) }

  return (
    <div className="page-root">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-8">Creator Portfolio</h1>

      {handle && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          padding: '12px 16px', borderRadius: 14, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', marginBottom: 24 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>🔗 Your public page — share it with brands</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a78bfa', wordBreak: 'break-all' }}>{publicUrl}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={copyPublic} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>Copy</button>
            <a href={`/u/${handle}`} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 14px', fontSize: 12 }}>Preview</a>
          </div>
        </div>
      )}

      {/* Public profile card */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/15 p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${tierBg[user?.tier] || tierBg.bronze} flex items-center justify-center text-white text-4xl font-bold shadow-xl`}>
            {user?.name?.[0] || 'C'}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
            <p className="text-zinc-400">{user?.instagramHandle || 'No handle set'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 justify-center sm:justify-start">
              <span className="px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-bold border border-yellow-500/20 capitalize">{user?.tier || 'Bronze'} Tier</span>
              <span className="text-sm text-zinc-500">{(user?.followersCount || 0).toLocaleString()} followers</span>
              {user?.engagementRate > 0 && <span className="text-sm text-zinc-500">ER: {user.engagementRate}%</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Campaigns',       value: stats.completedPosts || 0 },
            { label: 'Active Now',      value: stats.activeCampaigns || 0 },
            { label: 'Approved Posts',  value: posts.length },
            { label: 'Cashback Earned', value: `৳${(stats.totalEarned || 0).toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-extrabold text-white">{loading ? '...' : s.value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Approved posts */}
      <h2 className="text-lg font-bold text-white mb-4">Approved Posts</h2>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-zinc-400 text-sm">No approved posts yet</p>
          <p className="text-zinc-600 text-xs mt-1">Submit posts after ordering to build your portfolio</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map(p => (
            <div key={p._id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden hover:border-violet-500/15 hover:-translate-y-1 transition-all">
              <div className="aspect-video bg-white/[0.02] flex items-center justify-center text-5xl">📱</div>
              <div className="p-4">
                <p className="text-xs text-zinc-500 mb-1">{p.campaignId?.brand || p.campaignId?.title || 'Campaign'}</p>
                <p className="text-sm font-semibold text-white mb-2">{p.campaignId?.title || 'Approved Post'}</p>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className="capitalize">{p.platform}</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  <a href={p.postUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-400 hover:text-blue-300 text-xs">View Post →</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Portfolio
