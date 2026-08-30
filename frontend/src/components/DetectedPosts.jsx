import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDetectedPosts, submitDetectedPost, dismissDetectedPost } from '../services/instagram'

/**
 * "We spotted your post."
 *
 * FlexTag noticed a new Instagram post before the creator came back to tell us
 * (webhook or polling on their connected account). This card closes the loop:
 * when it matched an open order, cashback is ONE tap away; when it didn't, the
 * post is a click from the normal submission form with the link pre-filled.
 *
 * Renders nothing when there is nothing spotted — it is a moment, not a page.
 */
const relative = (d) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  const h = Math.floor(mins / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

const DetectedPosts = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)   // { id, kind, text }

  useEffect(() => {
    let alive = true
    getDetectedPosts('new')
      .then(d => { if (alive) setItems(d.detected || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!items.length) return null

  const claim = async (item) => {
    setBusyId(item._id); setNotice(null)
    try {
      const d = await submitDetectedPost(item._id)
      setNotice({ id: item._id, kind: 'ok', text: d.message })
      setTimeout(() => setItems(prev => prev.filter(x => x._id !== item._id)), 2500)
    } catch (err) {
      setNotice({ id: item._id, kind: 'err', text: err.response?.data?.message || 'Could not submit it — use the form below.' })
    } finally {
      setBusyId(null)
    }
  }

  const dismiss = async (item) => {
    setItems(prev => prev.filter(x => x._id !== item._id))
    dismissDetectedPost(item._id).catch(() => {})
  }

  const openInForm = (item) => {
    navigate('/creator/submit-post', {
      state: {
        postUrl: item.permalink || (item.shortcode ? `https://www.instagram.com/p/${item.shortcode}/` : ''),
        orderId: item.matchedOrderId?._id,
        campaignId: item.matchedCampaignId?._id,
      },
    })
  }

  return (
    <div style={{
      marginBottom: 24, padding: 20, borderRadius: 20,
      background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.07))',
      border: '1px solid rgba(124,58,237,0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>📸</span>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            We spotted {items.length === 1 ? 'a new post' : `${items.length} new posts`} on your Instagram
          </p>
          <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.45)', margin: '2px 0 0' }}>
            No link-pasting needed — claim the cashback right here.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => {
          const matched = item.matchedOrderId && item.matchedCampaignId
          const itemNotice = notice?.id === item._id ? notice : null
          return (
            <div key={item._id} style={{
              display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
              padding: 14, borderRadius: 14, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.06)',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                background: 'rgba(var(--ink-rgb),0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>
                {item.thumbnail
                  ? <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (item.mediaType === 'reel' || item.mediaType === 'video' ? '🎬' : '🖼️')}
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  {item.mediaType === 'reel' ? 'New reel' : item.mediaType === 'video' ? 'New video' : 'New post'}
                  {matched && <> — looks like <span style={{ color: '#a78bfa' }}>{item.matchedCampaignId.product}</span></>}
                  <span style={{ color: 'rgba(var(--ink-rgb),0.3)', fontWeight: 400 }}> · {relative(item.takenAt || item.createdAt)}</span>
                </p>
                {item.caption && (
                  <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.45)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}>
                    {item.caption}
                  </p>
                )}
                {matched && (
                  <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, margin: '4px 0 0' }}>
                    ৳{(item.matchedOrderId.cashbackAmount || 0).toLocaleString()} cashback waiting
                    {item.matchReasons?.length ? <span style={{ color: 'rgba(var(--ink-rgb),0.3)', fontWeight: 400 }}> · matched on {item.matchReasons.slice(0, 2).join(', ')}</span> : null}
                  </p>
                )}
                {itemNotice && (
                  <p style={{ fontSize: 12, fontWeight: 600, margin: '6px 0 0', color: itemNotice.kind === 'ok' ? '#4ade80' : '#f87171' }}>
                    {itemNotice.text}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {item.permalink && (
                  <a href={item.permalink} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: '8px 12px', fontSize: 12, textDecoration: 'none' }}>View</a>
                )}
                {matched ? (
                  <button onClick={() => claim(item)} disabled={busyId === item._id} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                    {busyId === item._id ? 'Submitting…' : 'Claim cashback'}
                  </button>
                ) : (
                  <button onClick={() => openInForm(item)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                    Submit it
                  </button>
                )}
                <button onClick={() => dismiss(item)} title="Not a campaign post" aria-label="Dismiss" style={{
                  width: 32, height: 32, borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(var(--ink-rgb),0.1)',
                  background: 'rgba(var(--ink-rgb),0.04)', color: 'rgba(var(--ink-rgb),0.4)', fontSize: 14, lineHeight: 1,
                }}>×</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DetectedPosts
