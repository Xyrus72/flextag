import React, { useState } from 'react'

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
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Frequently Asked Questions</h1>
      <p className="text-zinc-500 mb-6">Find answers to common questions</p>

      <div className="max-w-3xl mx-auto">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FAQs..."
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all placeholder:text-zinc-600 mb-6" />

        <div className="space-y-3">
          {filtered.map((faq, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden transition-all">
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="flex items-center justify-between w-full p-5 text-left">
                <p className="text-sm font-semibold text-white pr-4">{faq.q}</p>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-zinc-500 transition-transform flex-shrink-0 ${openIdx === i ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {openIdx === i && (
                <div className="px-5 pb-5 pt-0 border-t border-white/5">
                  <p className="text-sm text-zinc-400 leading-relaxed pt-4">{faq.a}</p>
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
