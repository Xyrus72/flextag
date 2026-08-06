import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BOT_URL = 'http://localhost:5000'

function StatTile({ label, value, color, icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        flex: '1 1 160px',
        borderRadius: 18,
        padding: '20px 22px',
        background: `linear-gradient(145deg, ${color}12 0%, rgba(5,8,22,0.9) 100%)`,
        border: `1px solid ${color}30`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 12px ${color}10`,
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </motion.div>
  )
}

function MiniBar({ posts }) {
  if (!posts?.length) return null
  const max = Math.max(...posts.map(p => p.likes), 1)
  return (
    <div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
        Likes per Post
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {posts.slice(0, 20).map((p, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${(p.likes / max) * 80}px` }}
            transition={{ duration: 0.5, delay: i * 0.03 }}
            title={`Post #${p.number}: ${p.likes.toLocaleString()} likes`}
            style={{
              flex: 1,
              borderRadius: 4,
              background: 'linear-gradient(to top, #e91e7a, #c026d3)',
              minWidth: 6,
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function InstagramAnalytics() {
  const [serverStatus, setServerStatus] = useState('checking')
  const [username, setUsername] = useState('')
  const [maxPosts, setMaxPosts] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [copiedRow, setCopiedRow] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const ping = async () => {
      try {
        const res = await fetch(`${BOT_URL}/status`, { signal: AbortSignal.timeout(3000) })
        setServerStatus(res.ok ? 'online' : 'offline')
      } catch {
        setServerStatus('offline')
      }
    }
    ping()
    const interval = setInterval(ping, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleScrape = async () => {
    const user = username.trim().replace(/^@/, '')
    if (!user) return
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch(`${BOT_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, max_posts: maxPosts }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Unknown error')
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copyLink = (url, i) => {
    navigator.clipboard.writeText(url)
    setCopiedRow(i)
    setTimeout(() => setCopiedRow(null), 1500)
  }

  const statusColor = serverStatus === 'online' ? '#22c55e' : serverStatus === 'offline' ? '#ef4444' : '#f59e0b'
  const statusLabel = serverStatus === 'online' ? 'Bot Server Online' : serverStatus === 'offline' ? 'Bot Offline' : 'Checking...'

  return (
    <div style={{ minHeight: '100vh', background: '#050816', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '32px 24px' }}>
      <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,30,122,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(220,39,67,0.4)',
            }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>Instagram Analytics</h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Powered by FlexTag Bot · Scrapes real profile stats</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 100, background: `${statusColor}12`, border: `1px solid ${statusColor}30` }}>
            <motion.div
              animate={{ scale: serverStatus === 'online' ? [1, 1.4, 1] : 1 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
            />
            <span style={{ fontSize: 11, color: statusColor, fontWeight: 700, letterSpacing: '0.06em' }}>{statusLabel}</span>
          </div>
        </div>

        {/* Offline banner */}
        <AnimatePresence>
          {serverStatus === 'offline' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ borderRadius: 14, padding: '16px 20px', marginBottom: 24, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <p style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600, marginBottom: 6 }}>⚠️ Bot server not running</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                Open a terminal and run:<br />
                <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6, fontSize: 12, color: '#f87171' }}>
                  cd "e:\demo shit\Instagram_Bot-master\Instagram_Bot-master" && pip install flask flask-cors instaloader pandas && python server.py
                </code>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div style={{ borderRadius: 20, padding: '24px', background: 'linear-gradient(145deg, rgba(233,30,122,0.06) 0%, rgba(5,8,22,0.95) 100%)', border: '1px solid rgba(233,30,122,0.2)', marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>Scrape any public Instagram profile</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>@</span>
              <input
                ref={inputRef}
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScrape()}
                placeholder="username"
                disabled={loading || serverStatus === 'offline'}
                style={{ width: '100%', padding: '13px 14px 13px 30px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif' }}
              />
            </div>
            <select
              value={maxPosts}
              onChange={e => setMaxPosts(Number(e.target.value))}
              disabled={loading}
              style={{ padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              {[5, 10, 20, 50].map(n => <option key={n} value={n} style={{ background: '#0d0d1a' }}>{n} posts</option>)}
            </select>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleScrape}
              disabled={loading || !username.trim() || serverStatus === 'offline'}
              style={{
                padding: '13px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: (loading || serverStatus === 'offline') ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #e91e7a, #c026d3)',
                color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'Inter, sans-serif',
                boxShadow: (loading || serverStatus === 'offline') ? 'none' : '0 0 24px rgba(233,30,122,0.4)',
                opacity: (loading || serverStatus === 'offline') ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {loading
                ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> Scraping...</>
                : '🔍 Analyze'
              }
            </motion.button>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ borderRadius: 14, padding: '14px 18px', marginBottom: 24, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#fca5a5' }}>
              ❌ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: 48, height: 48, margin: '0 auto 20px', border: '3px solid rgba(233,30,122,0.2)', borderTopColor: '#e91e7a', borderRadius: '50%' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Fetching profile data from Instagram...</p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {data && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>

              {/* Profile */}
              <div style={{ borderRadius: 20, padding: '24px 28px', marginBottom: 20, background: 'linear-gradient(145deg, rgba(233,30,122,0.08) 0%, rgba(5,8,22,0.96) 100%)', border: '1px solid rgba(233,30,122,0.2)', display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff', boxShadow: '0 0 20px rgba(220,39,67,0.4)' }}>
                  {(data.profile.full_name || data.profile.username || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{data.profile.full_name || data.profile.username}</h2>
                    <a href={`https://instagram.com/${data.profile.username}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: '#e91e7a', textDecoration: 'none', padding: '2px 10px', borderRadius: 100, border: '1px solid rgba(233,30,122,0.4)', background: 'rgba(233,30,122,0.08)' }}>
                      @{data.profile.username} ↗
                    </a>
                  </div>
                  {data.profile.biography && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginTop: 8, maxWidth: 500 }}>{data.profile.biography}</p>}
                  {data.profile.external_url && <a href={data.profile.external_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#a78bfa', marginTop: 6, display: 'inline-block', textDecoration: 'none' }}>🔗 {data.profile.external_url}</a>}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <StatTile label="Followers"      value={data.profile.followers}       color="#e91e7a" icon="👥" delay={0}    />
                <StatTile label="Following"      value={data.profile.followees}       color="#a78bfa" icon="➡️" delay={0.05} />
                <StatTile label="Total Posts"    value={data.profile.mediacount}      color="#06b6d4" icon="📸" delay={0.1}  />
                <StatTile label="Total Likes"    value={data.summary.total_likes}     color="#f59e0b" icon="❤️" delay={0.15} />
                <StatTile label="Total Comments" value={data.summary.total_comments}  color="#22c55e" icon="💬" delay={0.2}  />
                <StatTile label="Avg Likes/Post" value={data.summary.avg_likes}       color="#e91e7a" icon="📊" delay={0.25} />
              </div>

              {/* Bar chart */}
              {data.posts.length > 0 && (
                <div style={{ borderRadius: 20, padding: '20px 24px', marginBottom: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <MiniBar posts={data.posts} />
                </div>
              )}

              {/* Table */}
              {data.posts.length > 0 && (
                <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(233,30,122,0.15), rgba(192,38,211,0.1))', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>📋 {data.summary.posts_fetched} Posts Analyzed</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>@{data.profile.username}</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          {['#', '❤️ Likes', '💬 Comments', '📅 Date', 'Caption', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.posts.map((post, i) => (
                          <motion.tr key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{post.number}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#e91e7a' }}>{post.likes.toLocaleString()}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#06b6d4' }}>{post.comments.toLocaleString()}</td>
                            <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{post.date}</td>
                            <td style={{ padding: '10px 16px', fontSize: 11, color: 'rgba(255,255,255,0.35)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {post.caption || <span style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No caption</span>}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <a href={post.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#a78bfa', textDecoration: 'none', padding: '3px 10px', borderRadius: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', whiteSpace: 'nowrap' }}>View ↗</a>
                                <button onClick={() => copyLink(post.url, i)}
                                  style={{ fontSize: 11, color: copiedRow === i ? '#22c55e' : 'rgba(255,255,255,0.3)', padding: '3px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: copiedRow === i ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                                  {copiedRow === i ? '✓ Copied' : 'Copy'}
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!data && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Enter an Instagram username above</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>Fetches followers, posts, likes, comments &amp; more</p>
          </div>
        )}

      </div>
    </div>
  )
}
