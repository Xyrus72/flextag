import React, { useState, useRef } from 'react'

const fmt = (n) => Number(n).toLocaleString()

const InstagramAnalyzer = () => {
  const [username, setUsername]   = useState('')
  const [maxPosts, setMaxPosts]   = useState(20)
  const [status, setStatus]       = useState({ text: '', error: false })
  const [loading, setLoading]     = useState(false)
  const [data, setData]           = useState(null)
  const inputRef = useRef()

  const runScrape = async () => {
    const user = username.trim().replace(/^@/, '')
    if (!user) { setStatus({ text: 'Please enter an Instagram username.', error: true }); return }

    setLoading(true)
    setStatus({ text: '', error: false })
    setData(null)

    try {
      const resp = await fetch('/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, max_posts: maxPosts }),
      })
      const json = await resp.json()
      if (!resp.ok) {
        setStatus({ text: '❌ ' + (json.error || 'Unknown error'), error: true })
        return
      }
      setData(json)
      setStatus({ text: '', error: false })
    } catch {
      setStatus({ text: '❌ Cannot reach bot server. Make sure server.py is running on port 5000.', error: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>📸</div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              Instagram Analyzer
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Scrape followers, likes & comments from any public profile
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: 24,
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            ref={inputRef}
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runScrape()}
            placeholder="Instagram username (without @)"
            style={{
              flex: 1, minWidth: 220,
              padding: '12px 18px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, outline: 'none',
              fontSize: 14, color: '#fff',
              fontFamily: 'Inter, sans-serif',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(131,58,180,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <select
            value={maxPosts}
            onChange={e => setMaxPosts(Number(e.target.value))}
            style={{
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, outline: 'none',
              fontSize: 13, color: '#fff',
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            {[5,10,20,50].map(n => <option key={n} value={n} style={{ background: '#0a0f23' }}>{n} posts</option>)}
          </select>
          <button
            onClick={runScrape}
            disabled={loading}
            style={{
              padding: '12px 28px',
              background: loading ? 'rgba(131,58,180,0.3)' : 'linear-gradient(135deg, #833ab4, #fd1d1d)',
              border: 'none', borderRadius: 12,
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'igSpin 0.7s linear infinite', display: 'inline-block',
                }}/>
                Analyzing...
              </>
            ) : '🔍 Analyze'}
          </button>
        </div>

        {status.text && (
          <p style={{
            marginTop: 12, fontSize: 13,
            color: status.error ? '#f87171' : 'rgba(255,255,255,0.5)',
            fontWeight: status.error ? 600 : 400,
          }}>{status.text}</p>
        )}
      </div>

      {/* Results */}
      {data && <Results data={data} />}

      <style>{`
        @keyframes igSpin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0a0f23; color: #fff; }
      `}</style>
    </div>
  )
}

const Results = ({ data }) => {
  const { profile, posts, summary } = data
  const initial = (profile.full_name || profile.username || '?')[0].toUpperCase()

  const card = (label, value, color = '#a78bfa') => (
    <div key={label} style={{
      flex: 1, minWidth: 130,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '18px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, letterSpacing: '-0.02em' }}>{fmt(value)}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Profile card */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18, padding: '24px 28px',
        display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap',
      }}>
        <div style={{
          width: 68, height: 68, borderRadius: '50%',
          background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem', color: '#fff', fontWeight: 800, flexShrink: 0,
        }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
            {profile.full_name || profile.username}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 8px' }}>@{profile.username}</p>
          {profile.biography && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, margin: '0 0 8px' }}>{profile.biography}</p>
          )}
          {profile.external_url && (
            <a href={profile.external_url} target="_blank" rel="noreferrer"
              style={{ color: '#a78bfa', fontSize: 12, textDecoration: 'none' }}>
              🔗 {profile.external_url}
            </a>
          )}
          <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              ['Posts', profile.mediacount, '#a78bfa'],
              ['Followers', profile.followers, '#06b6d4'],
              ['Following', profile.followees, '#f59e0b'],
            ].map(([lbl, val, clr]) => (
              <div key={lbl}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: clr }}>{fmt(val)}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {card('Posts Fetched',   summary.posts_fetched,  '#a78bfa')}
        {card('Total Likes',     summary.total_likes,    '#f87171')}
        {card('Total Comments',  summary.total_comments, '#60a5fa')}
        {card('Avg Likes',       summary.avg_likes,      '#f87171')}
        {card('Avg Comments',    summary.avg_comments,   '#60a5fa')}
      </div>

      {/* Posts table */}
      {posts.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18, overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
          }}>📋 Posts — Likes &amp; Comments</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(131,58,180,0.12)' }}>
                  {['#', '❤️ Likes', '💬 Comments', '📅 Date', 'Link'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.number} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{p.number}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#f87171' }}>{fmt(p.likes)}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{fmt(p.comments)}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{p.date}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <a href={p.url} target="_blank" rel="noreferrer"
                        style={{ color: '#a78bfa', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                        View ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstagramAnalyzer
