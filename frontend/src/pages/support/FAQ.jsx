import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqData = [
  { q: 'How do I earn cashback on Flextag?', a: 'Purchase a product from our catalog, post authentic content on Instagram featuring the product, submit the post URL, and once verified (including a 7-day retention period), cashback is deposited into your wallet.' },
  { q: 'What are the minimum requirements to join as a creator?', a: 'You need a public Instagram account with at least 1,000 followers. Sign up with your email or phone number and link your Instagram handle during registration.' },
  { q: 'How long does verification take?', a: 'Our automated Meta API auditor typically verifies posts within 24 hours. The post must remain live for 7 days (retention period) before cashback is released to your wallet.' },
  { q: 'What is the minimum withdrawal amount?', a: 'The minimum withdrawal threshold is ৳500. Once your available balance exceeds this amount, you can request a withdrawal to your bKash account.' },
  { q: 'How do brands get verified on Flextag?', a: 'Brands submit their company profile along with verification documents (trade license, TIN certificate). Our admin team reviews applications, typically within 2-3 business days.' },
  { q: 'What happens if I delete my post before the retention period ends?', a: 'If a post is deleted or made private during the 7-day retention window, cashback is automatically frozen in escrow and an admin alert is triggered. This may result in loss of cashback for that campaign.' },
  { q: 'How does the tier system work?', a: 'Creators progress through four tiers: Bronze → Silver → Gold → Diamond, based on completed campaigns, engagement scores, and fraud-free history. Higher tiers unlock premium campaigns and higher cashback rates.' },
  { q: 'Can brands set a cashback budget limit?', a: 'Yes! Brands can set a maximum total cashback budget per campaign. Once the cap is reached, the campaign automatically closes to new purchases.' },
]

const FAQ = () => {
  const [openIdx, setOpenIdx] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = faqData.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page-root">
      <div className="page-header">
        <h1 className="page-title">Frequently asked questions</h1>
        <p className="page-subtitle">Find answers to common questions</p>
      </div>

      <div className="max-w-3xl mx-auto">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FAQs..."
          className="field-input mb-6" />

        <div className="space-y-3">
          {filtered.map((faq, i) => (
            <div key={i} style={{ borderRadius: 16, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.06)', overflow: 'hidden' }}>
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="flex items-center justify-between w-full p-5 text-left" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0, paddingRight: 16 }}>{faq.q}</p>
                <ChevronDown size={18} strokeWidth={1.75} style={{ color: 'var(--text-dim)', flexShrink: 0, transition: 'transform 150ms', transform: openIdx === i ? 'rotate(180deg)' : 'none' }} />
              </button>
              {openIdx === i && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(var(--ink-rgb),0.06)' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, paddingTop: 16 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FAQ
