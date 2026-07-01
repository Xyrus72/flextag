import React from 'react'
import { useAuth } from '../../context/AuthContext'

const pastCampaigns = [
  { brand: 'GlowUp Cosmetics', product: 'Matte Lipstick Set', cashback: 600, likes: 842, comments: 56, date: '2026-06-28', image: '💄' },
  { brand: 'UrbanFit BD', product: 'Gym Tank Top', cashback: 320, likes: 621, comments: 38, date: '2026-06-20', image: '👕' },
  { brand: 'SkinLab BD', product: 'Face Wash Gel', cashback: 270, likes: 534, comments: 42, date: '2026-06-10', image: '🫧' },
  { brand: 'TechNova', product: 'Bluetooth Speaker', cashback: 720, likes: 1203, comments: 89, date: '2026-05-28', image: '🔊' },
  { brand: 'StreetWear Co.', product: 'Canvas Tote Bag', cashback: 350, likes: 456, comments: 31, date: '2026-05-15', image: '👜' },
]

const Portfolio = () => {
  const { user } = useAuth()

  const avgEngagement = (pastCampaigns.reduce((s, c) => s + c.likes + c.comments, 0) / pastCampaigns.length).toFixed(0)
  const totalLikes = pastCampaigns.reduce((s, c) => s + c.likes, 0)

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-8">Creator Portfolio</h1>

      {/* Public profile card */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/15 p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-yellow-500/20">
            {user?.name?.[0] || 'C'}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
            <p className="text-zinc-400">{user?.instagramHandle}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 justify-center sm:justify-start">
              <span className="px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-bold border border-yellow-500/20 capitalize">{user?.tier} Tier</span>
              <span className="text-sm text-zinc-500">{user?.followers?.toLocaleString()} followers</span>
              <span className="text-sm text-zinc-500">ER: {user?.engagementRate}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Campaigns', value: pastCampaigns.length },
            { label: 'Avg Engagement', value: avgEngagement },
            { label: 'Total Likes', value: totalLikes.toLocaleString() },
            { label: 'Cashback Earned', value: `৳${user?.totalEarnings?.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-extrabold text-white">{s.value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Past campaigns grid */}
      <h2 className="text-lg font-bold text-white mb-4">Completed Campaigns</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pastCampaigns.map((c, i) => (
          <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden hover:border-orange-500/15 hover:-translate-y-1 transition-all">
            <div className="aspect-video bg-white/[0.02] flex items-center justify-center text-5xl">{c.image}</div>
            <div className="p-4">
              <p className="text-xs text-zinc-500">{c.brand}</p>
              <p className="text-sm font-semibold text-white mb-2">{c.product}</p>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>❤️ {c.likes.toLocaleString()}</span>
                <span>💬 {c.comments}</span>
                <span className="ml-auto text-emerald-400 font-semibold">+৳{c.cashback}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Portfolio
