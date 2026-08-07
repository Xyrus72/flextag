import React, { useState, useEffect } from 'react'
import { getUsers } from '../../services/users'
import { lookupInstagram, igVerifyCreator } from '../../services/admin'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString()

const tierColor = (tier) => {
  const map = { gold: '#f59e0b', silver: '#94a3b8', bronze: '#cd7f32', platinum: '#a78bfa' }
  return map[tier] || '#6b7280'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const BotStatus = ({ running }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
    borderRadius: 20, background: running ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
    border: `1px solid ${running ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
    fontSize: 11, fontWeight: 600,
    color: running ? '#4ade80' : '#f87171',
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: running ? '#4ade80' : '#f87171',
      boxShadow: running ? '0 0 6px #4ade80' : 'none',
      animation: running ? 'pulseDot 2s infinite' : 'none',
    }} />
    {running ? 'Bot Online' : 'Bot Offline'}
  </div>
)

const ProfileCard = ({ profile }) => {
  const initial = (profile.full_name || profile.username || '?')[0].toUpperCase()
  return (
    <div style={{
      background: 'rgba(131,58,180,0.08)', border: '1px solid rgba(131,58,180,0.2)',
      borderRadius: 16, padding: '20px 22px', marginBottom: 16,
      display: 'flex', gap: 18, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 800, color: '#fff',
      }}>{initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
            {profile.full_name || profile.username}
          </p>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa' }}>
            @{profile.username}
          </span>
        </div>
        {profile.biography && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: '0 0 10px' }}>
            {profile.biography.slice(0, 140)}{profile.biography.length > 140 ? '\u2026' : ''}
          </p>
        )}
        {profile.external_url && (
          <p style={{ fontSize: 11, margin: '0 0 10px' }}>
            <a href={profile.external_url} target="_blank" rel="noreferrer"
              style={{ color: '#a78bfa', textDecoration: 'none' }}>
              {profile.external_url}
            </a>
          </p>
        )}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Posts', value: fmt(profile.mediacount) },
            { label: 'Followers', value: fmt(profile.followers) },
            { label: 'Following', value: fmt(profile.followees) },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const SummaryBar = ({ summary }) => {
  const items = [
    { label: 'Posts Fetched', value: fmt(summary.posts_fetched) },
    { label: 'Total Likes', value: fmt(summary.total_likes) },
    { label: 'Total Comments', value: fmt(summary.total_comments) },
    { label: 'Avg Likes', value: fmt(summary.avg_likes) },
    { label: 'Avg Comments', value: fmt(summary.avg_comments) },
  ]
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
      {items.map(i => (
        <div key={i.label} style={{
          flex: '1 1 100px', background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
          padding: '12px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa' }}>{i.value}</div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{i.label}</div>
        </div>
      ))}
    </div>
  )
}

const PostsTable = ({ posts }) => (
  <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'linear-gradient(90deg,rgba(131,58,180,0.4),rgba(253,29,29,0.3))' }}>
          {['#', 'Likes', 'Comments', 'Date', 'Link'].map(h => (
            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {posts.map((p) => (
          <tr key={p.number} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(131,58,180,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <td style={{ padding: '9px 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{p.number}</td>
            <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, color: '#f87171' }}>{fmt(p.likes)}</td>
            <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{fmt(p.comments)}</td>
            <td style={{ padding: '9px 14px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{p.date}</td>
            <td style={{ padding: '9px 14px' }}>
              <a href={p.url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>
                View \u2197
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

// ─── Main Component ───────────────────────────────────────────────────────────
const CreatorVerification = () => {
  const [creators, setCreators]           = useState([])
  const [loadingList, setLoadingList]     = useState(true)
  const [filter, setFilter]               = useState('all')
  const [search, setSearch]               = useState('')
  const [selectedCreator, setSelectedCreator] = useState(null)

  // Scraper state
  const [handle, setHandle]               = useState('')
  const [maxPosts, setMaxPosts]           = useState(10)
  const [scraping, setScraping]           = useState(false)
  const [scrapeResult, setScrapeResult]   = useState(null)
  const [scrapeError, setScrapeError]     = useState('')
  const [botOnline, setBotOnline]         = useState(null)

  // Action state
  const [actioning, setActioning]         = useState(false)
  const [actionMsg, setActionMsg]         = useState('')

  // ── Load creators ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingList(true)
    getUsers({ role: 'creator' })
      .then(d => setCreators(d.users || []))
      .catch(console.error)
      .finally(() => setLoadingList(false))
  }, [])

  // ── Filter + search ──────────────────────────────────────────────────────
  const filteredCreators = creators.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || c.name?.toLowerCase().includes(q)
      || c.instagramHandle?.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
    const matchFilter = filter === 'all'
      || (filter === 'verified'   && c.igVerified)
      || (filter === 'unverified' && !c.igVerified)
    return matchSearch && matchFilter
  })

  // ── Select creator ───────────────────────────────────────────────────────
  const selectCreator = (c) => {
    setSelectedCreator(c)
    setHandle(c.instagramHandle || '')
    setScrapeResult(null)
    setScrapeError('')
    setActionMsg('')
  }

  // ── Run scraper ──────────────────────────────────────────────────────────
  const runScrape = async () => {
    const user = handle.trim().replace(/^@/, '')
    if (!user) { setScrapeError('Enter an Instagram username.'); return }
    setScraping(true)
    setScrapeResult(null)
    setScrapeError('')
    setActionMsg('')
    setBotOnline(null)
    try {
      const data = await lookupInstagram(user, maxPosts)
      setBotOnline(true)
      if (data.error) { setScrapeError(data.error) }
      else { setScrapeResult(data) }
    } catch (err) {
      setBotOnline(false)
      const msg = err?.response?.data?.error || err.message || 'Unknown error'
      setScrapeError(msg)
    } finally {
      setScraping(false)
    }
  }

  // ── Approve / revoke ─────────────────────────────────────────────────────
  const handleVerify = async (approve) => {
    if (!selectedCreator) { setActionMsg('\u26a0 Select a creator from the list first.'); return }
    setActioning(true)
    setActionMsg('')
    try {
      await igVerifyCreator(selectedCreator._id, approve)
      setCreators(prev => prev.map(c =>
        c._id === selectedCreator._id ? { ...c, igVerified: approve } : c
      ))
      setSelectedCreator(prev => ({ ...prev, igVerified: approve }))
      setActionMsg(approve ? '\u2705 Creator Instagram identity approved.' : '\uD83D\uDEAB Verification revoked.')
    } catch (err) {
      setActionMsg('\u274C ' + (err?.response?.data?.message || 'Action failed.'))
    } finally {
      setActioning(false)
    }
  }

  const panel = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 20,
    backdropFilter: 'blur(20px)',
  }

  return (
    <div className="page-root">
      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin      { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-label"><span>Admin \xB7 Creator Management</span></div>
        <h1 className="page-title">Creator ID Verification</h1>
        <p className="page-subtitle">Verify creator Instagram identities using the live scraper bot</p>
      </div>

      {/* ── Bot status banner ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderRadius: 14, marginBottom: 24,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>📸</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>Instagram Scraper Bot</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              Python bot on{' '}
              <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 4 }}>localhost:8000</code>
              {' '}\u2014 run{' '}
              <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 4 }}>python server.py</code>
              {' '}inside the{' '}
              <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 4 }}>bot/</code>
              {' '}folder
            </p>
          </div>
        </div>
        {botOnline !== null && <BotStatus running={botOnline} />}
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Creator list ── */}
        <div style={{ ...panel, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 14px 0' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search creators…"
              style={{
                width: '100%', padding: '9px 14px', borderRadius: 10, boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 13, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {['all', 'unverified', 'verified'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: filter === f ? 'linear-gradient(135deg,#7c3aed,#a78bfa)' : 'rgba(255,255,255,0.05)',
                  color: filter === f ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s',
                }}>{f}</button>
              ))}
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '8px 0 0', fontWeight: 600 }}>
              {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div style={{ maxHeight: 580, overflowY: 'auto', padding: '10px 8px 12px' }}>
            {loadingList ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="spinner" />
              </div>
            ) : filteredCreators.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                No creators found
              </div>
            ) : filteredCreators.map(c => {
              const isSelected = selectedCreator?._id === c._id
              return (
                <div
                  key={c._id}
                  onClick={() => selectCreator(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                    borderRadius: 12, cursor: 'pointer', marginBottom: 3,
                    background: isSelected ? 'rgba(124,58,237,0.15)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(124,58,237,0.4)' : 'transparent'}`,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg,${tierColor(c.tier)},rgba(124,58,237,0.6))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff',
                  }}>{(c.name || '?')[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.instagramHandle ? `@${c.instagramHandle}` : '(no handle)'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    {c.igVerified && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.25)', whiteSpace: 'nowrap' }}>
                        IG \u2713
                      </span>
                    )}
                    {c.tier && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: tierColor(c.tier), padding: '2px 6px', borderRadius: 6, background: `${tierColor(c.tier)}18`, border: `1px solid ${tierColor(c.tier)}38`, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                        {c.tier}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT: Scraper panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Selected creator context bar */}
          {selectedCreator && (
            <div style={{
              ...panel, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg,${tierColor(selectedCreator.tier)},#7c3aed)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800, color: '#fff',
              }}>{(selectedCreator.name || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>{selectedCreator.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{selectedCreator.email}</p>
              </div>
              {selectedCreator.igVerified ? (
                <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#4ade80', padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(34,197,94,0.25)' }}>
                  \u2705 IG Verified
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(245,158,11,0.25)' }}>
                  \u23F3 Unverified
                </span>
              )}
            </div>
          )}

          {/* Scraper input card */}
          <div style={{ ...panel, padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📸</span> Instagram Lookup
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runScrape()}
                placeholder="Instagram username (without @)"
                style={{
                  flex: '1 1 200px', padding: '11px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 14, outline: 'none',
                }}
              />
              <select
                value={maxPosts}
                onChange={e => setMaxPosts(Number(e.target.value))}
                style={{
                  padding: '11px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer',
                }}
              >
                <option value={5}>5 posts</option>
                <option value={10}>10 posts</option>
                <option value={20}>20 posts</option>
              </select>
              <button
                onClick={runScrape}
                disabled={scraping}
                style={{
                  padding: '11px 24px', borderRadius: 10, border: 'none',
                  cursor: scraping ? 'not-allowed' : 'pointer',
                  background: scraping ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  color: '#fff', fontSize: 14, fontWeight: 700, opacity: scraping ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', transition: 'opacity 0.2s',
                }}
              >
                {scraping ? (
                  <>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Scraping\u2026
                  </>
                ) : '\uD83D\uDD0D Run Scraper'}
              </button>
            </div>

            {scrapeError && (
              <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#f87171' }}>❌ {scrapeError}</p>
                {(scrapeError.includes('port 8000') || scrapeError.includes('bot')) && (
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    Run <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>python server.py</code> inside the{' '}
                    <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>bot/</code> folder first.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Scrape results */}
          {scrapeResult && (
            <>
              <ProfileCard profile={scrapeResult.profile} />
              <SummaryBar summary={scrapeResult.summary} />

              {scrapeResult.posts?.length > 0 && (
                <div style={{ ...panel, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                    📋 Recent Posts
                  </p>
                  <PostsTable posts={scrapeResult.posts} />
                </div>
              )}

              {/* Approve / Revoke panel */}
              <div style={{ ...panel, padding: '18px 20px', background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {selectedCreator
                    ? `Save verification for ${selectedCreator.name}`
                    : '\u2139\uFE0F Select a creator from the list to save verification'}
                </p>
                {actionMsg && (
                  <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600,
                    color: actionMsg.includes('\u2705') ? '#4ade80' : actionMsg.includes('\uD83D\uDEAB') ? '#f87171' : '#fbbf24' }}>
                    {actionMsg}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleVerify(true)}
                    disabled={actioning || !selectedCreator}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(34,197,94,0.3)',
                      background: 'rgba(34,197,94,0.1)', color: '#4ade80',
                      fontSize: 14, fontWeight: 700,
                      cursor: actioning || !selectedCreator ? 'not-allowed' : 'pointer',
                      opacity: actioning || !selectedCreator ? 0.5 : 1, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!actioning && selectedCreator) e.currentTarget.style.background = 'rgba(34,197,94,0.2)' }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.1)')}
                  >
                    {actioning ? '\u2026' : '\u2705 Approve IG Identity'}
                  </button>
                  <button
                    onClick={() => handleVerify(false)}
                    disabled={actioning || !selectedCreator}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
                      background: 'rgba(239,68,68,0.1)', color: '#f87171',
                      fontSize: 14, fontWeight: 700,
                      cursor: actioning || !selectedCreator ? 'not-allowed' : 'pointer',
                      opacity: actioning || !selectedCreator ? 0.5 : 1, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (!actioning && selectedCreator) e.currentTarget.style.background = 'rgba(239,68,68,0.2)' }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                  >
                    {actioning ? '\u2026' : '\uD83D\uDEAB Reject / Revoke'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {!scrapeResult && !scrapeError && !scraping && (
            <div style={{ ...panel, padding: '60px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📸</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>
                Run the scraper to verify a creator
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0, lineHeight: 1.7 }}>
                Select a creator from the list — their handle is auto-filled<br />
                Or type any Instagram username and click <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Run Scraper</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreatorVerification
