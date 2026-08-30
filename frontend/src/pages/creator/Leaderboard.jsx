import { useState, useEffect } from 'react'
import { Trophy, Zap, Sparkles, Award, Gem, Flame } from 'lucide-react'
import { getLeaderboard } from '../../services/users'
import { useAuth } from '../../context/AuthContext'

const tierGrad = {
  diamond: '#60a5fa',
  gold:    '#f59e0b',
  silver:  '#9ca3af',
  bronze:  '#92400e',
}

const badges = [
  { icon:Trophy,   name:'Top Performer',   desc:'Ranked #1 on the monthly leaderboard',     color:'rgba(245,158,11,0.12)',  border:'rgba(245,158,11,0.25)' },
  { icon:Zap,      name:'Fast Poster',     desc:'Submitted post within 24h of delivery',    color:'rgba(6,182,212,0.12)',   border:'rgba(6,182,212,0.25)'  },
  { icon:Sparkles, name:'Quality Creator', desc:'Avg engagement rate above 5%',              color:'rgba(124,58,237,0.12)', border:'rgba(124,58,237,0.25)' },
  { icon:Award,    name:'Gold Tier',       desc:'Achieved Gold tier status',                color:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.25)' },
  { icon:Gem,      name:'Diamond Elite',   desc:'Achieved Diamond tier status',             color:'rgba(6,182,212,0.12)',  border:'rgba(6,182,212,0.25)'  },
  { icon:Flame,    name:'Streak Master',   desc:'10+ consecutive successful campaigns',      color:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.25)'  },
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
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Community</span></div>
        <h1 className="page-title">Leaderboard & badges</h1>
        <p className="page-subtitle">Compete, earn badges, and unlock premium campaigns</p>
      </div>

      {myRank > 0 && (
        <div style={{ padding:'16px 20px', borderRadius:16, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', marginBottom:24, display:'flex', alignItems:'center', gap:14 }}>
          <Award size={28} style={{ color: 'rgba(var(--ink-rgb),0.3)' }} strokeWidth={1.5} />
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--violet-ink)', margin:0 }}>Your current rank: #{myRank}</p>
            <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.35)', marginTop:4 }}>Keep completing campaigns to climb higher!</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'rgba(var(--ink-rgb),0.04)', borderRadius:12, padding:4, width:'fit-content', marginBottom:24 }}>
        {[{ id:'leaderboard', label:'Leaderboard' }, { id:'badges', label:'Badges' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'9px 20px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s', border:'none',
            background: tab === t.id ? 'var(--purple)' : 'transparent',
            color: tab === t.id ? '#fff' : 'rgba(var(--ink-rgb),0.4)',
            boxShadow: tab === t.id ? 'none' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'leaderboard' ? (
        loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'80px 0' }}><div className="spinner" /></div>
        ) : creators.length === 0 ? (
          <div className="empty-state"><p><Trophy size={28} style={{ color: 'rgba(var(--ink-rgb),0.3)' }} strokeWidth={1.5} /></p><p>No creators yet — be the first to complete campaigns!</p></div>
        ) : (
          <div className="data-table">
            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, padding:24, borderBottom:'1px solid rgba(var(--ink-rgb),0.06)' }}>
                {[ranked[1], ranked[0], ranked[2]].map((c, i) => {
                  const pos = [2, 1, 3][i]
                  if (!c) return <div key={i} />
                  return (
                    <div key={c._id} style={{ textAlign:'center', order: pos === 1 ? 2 : pos === 2 ? 1 : 3 }}>
                      <div style={{
                        width: pos===1?56:44, height: pos===1?56:44, margin:'0 auto', borderRadius:'50%',
                        background: tierGrad[c.tier] || tierGrad.bronze,
                        display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:16, fontWeight:800,
                        border: pos===1 ? '2px solid rgba(245,158,11,0.5)' : '1px solid rgba(var(--ink-rgb),0.1)', marginBottom:8,
                      }}>{c.name[0]}</div>
                      <p style={{ fontSize:13, fontWeight:700, color: 'var(--text)', margin:'0 0 2px' }}>{c.name.split(' ')[0]}</p>
                      <p style={{ fontSize:11, color:'rgba(var(--ink-rgb),0.35)', margin:0 }}>{c.instagramHandle || null}</p>
                      <p style={{ fontSize:20, fontWeight:800, color:'var(--violet-ink)', margin:'4px 0 0' }}>#{pos}</p>
                    </div>
                  )
                })}
              </div>
            )}
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th>Rank</th><th>Creator</th><th>Tier</th><th style={{ textAlign:'right' }}>Campaigns</th><th style={{ textAlign:'right' }}>Earnings</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(c => (
                  <tr key={c._id} style={{ background: c._id === user?._id ? 'rgba(124,58,237,0.05)' : '' }}>
                    <td>
                      <span style={{ fontWeight:800, fontSize:14, color: c.rank<=3 ? 'var(--violet-ink)' : 'rgba(var(--ink-rgb),0.3)' }}>#{c.rank}</span>
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background: tierGrad[c.tier]||tierGrad.bronze, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13, flexShrink:0 }}>{c.name[0]}</div>
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, color: 'var(--text)', margin:0 }}>{c.name} {c._id===user?._id && <span style={{ color:'var(--violet-ink)', fontSize:11 }}>(You)</span>}</p>
                          <p style={{ fontSize:11, color:'rgba(var(--ink-rgb),0.3)', margin:0 }}>{c.instagramHandle || null}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-info" style={{ textTransform:'capitalize' }}>{c.tier||'Bronze'}</span></td>
                    <td style={{ textAlign:'right', fontWeight:700, color: 'var(--text)' }}>{c.completedCampaigns||0}</td>
                    <td className="tnum" style={{ textAlign:'right', fontWeight:700, color:'var(--green-ink)' }}>৳{(c.totalEarnings||0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
          {badges.map(b => (
            <div key={b.name} style={{ padding:24, borderRadius:14, background:b.color, border:`1px solid ${b.border}`, transition:'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}
            >
              <b.icon size={28} style={{ display:'block', marginBottom:14, color:'rgba(var(--ink-rgb),0.3)' }} strokeWidth={1.5} />
              <h3 style={{ fontSize:14, fontWeight:700, color: 'var(--text)', margin:'0 0 6px' }}>{b.name}</h3>
              <p style={{ fontSize:12, color:'rgba(var(--ink-rgb),0.4)', margin:0, lineHeight:1.6 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Leaderboard
