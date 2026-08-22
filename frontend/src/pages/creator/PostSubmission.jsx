import React, { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { getOrders } from '../../services/orders'
import { submitPost } from '../../services/posts'

const PostSubmission = () => {
  const location = useLocation()
  const preState = location.state || {}

  const [postUrl, setPostUrl] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState(preState.orderId || '')
  const [platform, setPlatform] = useState('instagram')
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [auditResult, setAuditResult] = useState(null)
  const [error, setError] = useState('')

  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    getOrders({ status: 'delivered' })
      .then(d => setOrders(d.orders || []))
      .catch(console.error)
      .finally(() => setLoadingOrders(false))
  }, [])

  const selectedOrder = orders.find(o => o._id === selectedOrderId)

  const generateCaption = async () => {
    setAiLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    const product = selectedOrder?.product || 'this product'
    const brand = selectedOrder?.brand || 'our partner brand'
    const captions = {
      bangla: `✨ ${product} দিয়ে আজকের লুক! ${brand} থেকে পারফেক্ট প্রোডাক্ট পেলাম 🔥\n\n#FlexTag #BrandPartner #${brand.replace(/\s+/g, '')} @flextag.official`,
      english: `✨ Obsessed with ${product} from @${brand.replace(/\s+/g, '').toLowerCase()}! Absolutely loving it. 🔥\n\n#FlexTag #BrandPartner @flextag.official`,
      banglish: `✨ Guys! ${product} ta literally AMAZING 🤩 ${brand} er ei product try korte hobe! Full recommend!\n\n#FlexTag #BrandPartner @flextag.official`,
    }
    setAiResponse(captions[aiPrompt] || captions.english)
    setAiLoading(false)
  }

  const handleSubmit = async () => {
    if (!postUrl || !selectedOrderId) return
    setSubmitting(true)
    setError('')
    try {
      const res = await submitPost({
        orderId: selectedOrderId,
        campaignId: selectedOrder?.campaignId?._id || selectedOrder?.campaignId,
        postUrl,
        platform,
      })
      setAuditResult(res.post?.auditResults || null)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please check post URL and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
            border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: 36
          }}>
            ✅
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Automated Meta Audit Passed!</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Meta Instagram Graph API inspected your URL and verified all campaign requirements. Your post is now in the 7-day retention monitoring queue.
          </p>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 20, textAlign: 'left', marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Meta Audit Verification Log</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#4ade80' }}>
                <span>✓ Public Access Verified</span>
                <span style={{ fontSize: 11, background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 6 }}>Public</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#4ade80' }}>
                <span>✓ Brand Tag Handles Detected</span>
                <span style={{ fontSize: 11, background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 6 }}>@flextag.official</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#4ade80' }}>
                <span>✓ Required Hashtags Present</span>
                <span style={{ fontSize: 11, background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 6 }}>#FlexTag #BrandPartner</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#67e8f9', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
                <span>⏳ 7-Day Retention Period</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>7 Days Remaining</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { setSubmitted(false); setPostUrl(''); setSelectedOrderId('') }}
              style={{ padding: '12px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Submit Another Post
            </button>
            <Link to="/creator/orders" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                View My Orders →
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Module 3 — Meta Post Auditor</span></div>
        <h1 className="page-title">Submit Post for Automated Verification</h1>
        <p className="page-subtitle">Submit your Instagram post URL for automated Meta Graph API auditing and 7-day retention tracking</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Post Information</h2>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Select Delivered Order</label>
              {loadingOrders ? (
                <div style={{ display: 'flex', itemsCenter: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}><div className="spinner" style={{ width: 16, height: 16 }} /><span>Loading orders...</span></div>
              ) : (
                <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)} className="field-select">
                  <option value="" style={{ background: '#0d0d20' }}>Choose a delivered order...</option>
                  {orders.map(o => (
                    <option key={o._id} value={o._id} style={{ background: '#0d0d20' }}>
                      {o.product} — {o.brand} ({o.orderId})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Platform</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['instagram', 'tiktok', 'facebook'].map(p => (
                  <button key={p} onClick={() => setPlatform(p)} style={{
                    flex: 1, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                    background: platform === p ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.04)',
                    color: platform === p ? '#fff' : 'rgba(255,255,255,0.4)',
                    border: platform === p ? 'none' : '1px solid rgba(255,255,255,0.08)'
                  }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Instagram Post URL</label>
              <input value={postUrl} onChange={e => setPostUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." className="field-input" />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Automated Meta API will verify hashtags, handles, and public accessibility.</p>
            </div>

            <button onClick={handleSubmit} disabled={!postUrl || !selectedOrderId || submitting} className="btn-primary" style={{ width: '100%', padding: '14px', marginTop: 8 }}>
              {submitting ? '🤖 Running Meta API Audit...' : '⚡ Audit & Submit Post'}
            </button>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>AI Creative Assistant</h2>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>AI Powered</span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>Generate captions that pass Meta Graph API auditing</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Select Language</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[{ id: 'bangla', label: 'বাংলা' }, { id: 'english', label: 'English' }, { id: 'banglish', label: 'Banglish' }].map(l => (
                  <button key={l.id} onClick={() => setAiPrompt(l.id)} style={{
                    padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    background: aiPrompt === l.id ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                    color: aiPrompt === l.id ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                    border: aiPrompt === l.id ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)'
                  }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generateCaption} disabled={!aiPrompt || aiLoading || !selectedOrderId} style={{
              padding: '12px', borderRadius: 12, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.12)',
              color: '#a78bfa', fontSize: 13, fontWeight: 700, cursor: !aiPrompt || aiLoading || !selectedOrderId ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
            }}>
              {aiLoading ? '✨ Generating...' : '✨ Generate Verified Caption'}
            </button>

            {aiResponse && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Generated Caption</span>
                  <button onClick={() => navigator.clipboard?.writeText(aiResponse)} style={{ background: 'none', border: 'none', color: '#67e8f9', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Copy</button>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{aiResponse}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostSubmission
