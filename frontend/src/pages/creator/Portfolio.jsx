import { useState, useEffect } from 'react'
import { Link2, Inbox, ImageOff } from 'lucide-react'
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
    diamond: 'bg-cyan-400',
    gold:    'bg-amber-500',
    silver:  'bg-gray-400',
    bronze:  'bg-amber-800',
  }

  const handle = String(user?.instagramHandle || '').replace(/^@/, '').trim()
  const publicUrl = handle ? `${window.location.origin}/u/${handle}` : ''
  const copyPublic = () => { if (publicUrl) navigator.clipboard?.writeText(publicUrl).catch(() => {}) }

  return (
    <div className="page-root">
      <div className="page-header">
        <h1 className="page-title">Portfolio</h1>
      </div>

      {handle && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          padding: '12px 16px', borderRadius: 14, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', marginBottom: 24 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link2 size={14} style={{ color: 'rgba(var(--ink-rgb),0.4)' }} strokeWidth={1.5} /> Your public page — share it with brands
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--violet-ink)', wordBreak: 'break-all' }}>{publicUrl}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={copyPublic} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>Copy</button>
            <a href={`/u/${handle}`} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 14px', fontSize: 12 }}>Preview</a>
          </div>
        </div>
      )}

      {/* Public profile card */}
      <div className="rounded-2xl p-8 mb-8" style={{ background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.08)' }}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className={`w-24 h-24 rounded-full ${tierBg[user?.tier] || tierBg.bronze} flex items-center justify-center text-white text-4xl font-bold shadow-xl`}>
            {user?.name?.[0] || 'C'}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{user?.name}</h2>
            <p style={{ color: 'var(--text-muted)' }}>{user?.instagramHandle || 'No handle set'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 justify-center sm:justify-start">
              <span className="px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-bold border border-yellow-500/20 capitalize">{user?.tier || 'Bronze'} Tier</span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{(user?.followersCount || 0).toLocaleString()} followers</span>
              {user?.engagementRate > 0 && <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ER: {user.engagementRate}%</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Campaigns',       value: stats.completedPosts || 0 },
            { label: 'Active now',      value: stats.activeCampaigns || 0 },
            { label: 'Approved posts',  value: posts.length },
            { label: 'Cashback earned', value: `৳${(stats.totalEarned || 0).toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-extrabold tnum" style={{ color: 'var(--text)' }}>{loading ? '—' : s.value}</p>
              <p className="mt-1" style={{ fontSize: 12, fontWeight: 500, letterSpacing: 0, textTransform: 'none', color: 'rgba(var(--ink-rgb),0.45)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Approved posts */}
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Approved posts</h2>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="spinner" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed" style={{ borderColor: 'rgba(var(--ink-rgb),0.1)' }}>
          <p className="mb-3"><Inbox size={36} style={{ color: 'rgba(var(--ink-rgb),0.3)', margin: '0 auto' }} strokeWidth={1.5} /></p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No approved posts yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Submit posts after ordering to build your portfolio</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map(p => (
            <div key={p._id} className="rounded-2xl overflow-hidden hover:border-violet-500/15 hover:-translate-y-1 transition-all" style={{ background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.05)' }}>
              <div className="aspect-video flex items-center justify-center" style={{ background: 'rgba(var(--ink-rgb),0.02)' }}><ImageOff size={28} style={{ color: 'rgba(var(--ink-rgb),0.3)' }} strokeWidth={1.5} /></div>
              <div className="p-4">
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{p.campaignId?.brand || p.campaignId?.title || 'Campaign'}</p>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>{p.campaignId?.title || 'Approved post'}</p>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="capitalize">{p.platform}</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  <a href={p.postUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-400 hover:text-blue-300 text-xs">View post</a>
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
