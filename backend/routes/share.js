const express = require('express')
const router  = express.Router()
const User    = require('../models/User')
const Post    = require('../models/Post')
const { normalizeHandle, handleRegex } = require('../services/instagram/endpoints')
const Product = require('../models/Product')
const Campaign = require('../models/Campaign')
const { buildReport } = require('../services/campaignReport')
const { buildPortfolioSvg, buildProductSvg, renderPng } = require('../services/ogImage')

/**
 * Server-rendered share pages.
 *
 * The app is a SPA, and crawlers (Facebook, WhatsApp, X, LinkedIn) do not run
 * React — a shared portfolio link unfurled as a blank card, which quietly kills
 * the referral loop the portfolios exist for. These routes return real HTML
 * with real meta tags for the crawler, and bounce humans straight on to the app.
 *
 * Mounted OUTSIDE /api on purpose: this is a public page, not an API.
 */

const FRONTEND = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
const BACKEND  = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 1643}`).replace(/\/$/, '')
const CACHE = 'public, max-age=600, s-maxage=3600'

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

async function loadCreator(rawHandle) {
  const handle = normalizeHandle(rawHandle)
  if (!handle) return null
  const creator = await User.findOne({ role: 'creator', instagramHandle: handleRegex(handle) })
    .select('name instagramHandle followersCount igHealthScore igVerified completedCampaigns tier creatorRatingAvg creatorRatingCount')
    .lean()
  if (!creator) return null
  const posts = await Post.countDocuments({ creatorId: creator._id, status: 'approved' })
  return {
    name: creator.name,
    handle: String(creator.instagramHandle || handle).replace(/^@/, ''),
    followers: creator.followersCount || 0,
    posts,
    campaigns: creator.completedCampaigns || 0,
    health: creator.igHealthScore ?? null,
    verified: !!creator.igVerified,
    tier: creator.tier || 'bronze',
    rating: creator.creatorRatingAvg || 0,
    ratingCount: creator.creatorRatingCount || 0,
  }
}

// ── GET /share/u/:handle — crawler-friendly page, humans get redirected ────
router.get('/u/:handle', async (req, res) => {
  try {
    const c = await loadCreator(req.params.handle)
    const target = `${FRONTEND}/u/${encodeURIComponent(String(req.params.handle).replace(/^@/, ''))}`
    if (!c) return res.redirect(302, target)

    const title = `${c.name} (@${c.handle}) — verified creator on FlexTag`
    const bits = [
      `${c.followers.toLocaleString()} followers`,
      `${c.posts} verified post${c.posts === 1 ? '' : 's'}`,
      `${c.campaigns} completed campaign${c.campaigns === 1 ? '' : 's'}`,
      ...(c.ratingCount ? [`rated ${c.rating}/5 by brands`] : []),
    ]
    const description = `${bits.join(' · ')}. Real posts, machine-verified by FlexTag.`
    const image = `${BACKEND}/share/u/${encodeURIComponent(c.handle)}/og.png`

    res.set('Cache-Control', CACHE).type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(target)}" />
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="FlexTag" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(target)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<meta http-equiv="refresh" content="0; url=${esc(target)}" />
<style>body{background:#0a0616;color:#fff;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0}a{color:#67e8f9}</style>
</head>
<body>
<main>
  <h1>${esc(c.name)} (@${esc(c.handle)})</h1>
  <p>${esc(description)}</p>
  <p><a href="${esc(target)}">Open the portfolio →</a></p>
</main>
<script>location.replace(${JSON.stringify(target)})</script>
</body>
</html>`)
  } catch (err) {
    console.error('[share portfolio]', err)
    res.redirect(302, FRONTEND)
  }
})

// ── GET /share/u/:handle/og.png ───────────────────────────────────────────
router.get('/u/:handle/og.png', async (req, res) => {
  try {
    const c = await loadCreator(req.params.handle)
    if (!c) return res.status(404).json({ message: 'Creator not found.' })
    const svg = buildPortfolioSvg(c)
    const png = renderPng(svg)
    if (!png) {
      // No rasteriser/fonts on this host — an SVG still previews in a browser,
      // which beats a broken image, and the log says what to install.
      return res.set('Cache-Control', CACHE).type('image/svg+xml').send(svg)
    }
    res.set('Cache-Control', CACHE).type('image/png').send(png)
  } catch (err) {
    console.error('[share og.png]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── GET /share/u/:handle/og.svg — the same card, unrasterised ─────────────
router.get('/u/:handle/og.svg', async (req, res) => {
  try {
    const c = await loadCreator(req.params.handle)
    if (!c) return res.status(404).json({ message: 'Creator not found.' })
    res.set('Cache-Control', CACHE).type('image/svg+xml').send(buildPortfolioSvg(c))
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── Product share cards ─────────────────────────────────────────────────────
 * A creator posting "look what I'm getting 55% back on" is the cheapest
 * acquisition FlexTag has. The link has to unfurl with the actual deal on it.
 */
async function loadProduct(id) {
  const p = await Product.findOne({ _id: id, isActive: true, status: { $ne: 'rejected' } })
    .select('name brand price cashbackRate category rating reviews image').lean()
    .catch(() => null)
  if (!p) return null
  return {
    id: String(p._id),
    name: p.name,
    brand: p.brand,
    price: p.price || 0,
    cashbackRate: p.cashbackRate || 0,
    netPrice: Math.round((p.price || 0) * (1 - (p.cashbackRate || 0) / 100)),
    category: p.category || '',
    rating: p.rating || null,
    reviews: p.reviews || 0,
  }
}

// GET /share/p/:id — crawler HTML, humans bounce into the app
router.get('/p/:id', async (req, res) => {
  try {
    const p = await loadProduct(req.params.id)
    const target = `${FRONTEND}/creator/product/${encodeURIComponent(req.params.id)}`
    if (!p) return res.redirect(302, `${FRONTEND}/creator/catalog`)

    const title = `${p.name} by ${p.brand} — ${p.cashbackRate}% cashback on FlexTag`
    const description = `Retail ৳${p.price.toLocaleString()}, your net cost ৳${p.netPrice.toLocaleString()} after posting about it. Verified creator cashback, paid to your bKash.`
    const image = `${BACKEND}/share/p/${encodeURIComponent(p.id)}/og.png`

    res.set('Cache-Control', CACHE).type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(target)}" />
<meta property="og:type" content="product" />
<meta property="og:site_name" content="FlexTag" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(target)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="product:price:amount" content="${p.price}" />
<meta property="product:price:currency" content="BDT" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<meta http-equiv="refresh" content="0; url=${esc(target)}" />
<style>body{background:#0a0616;color:#fff;font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;text-align:center}a{color:#67e8f9}</style>
</head>
<body>
<main>
  <h1>${esc(p.name)}</h1>
  <p>${esc(description)}</p>
  <p><a href="${esc(target)}">Open on FlexTag →</a></p>
</main>
<script>location.replace(${JSON.stringify(target)})</script>
</body>
</html>`)
  } catch (err) {
    console.error('[share product]', err)
    res.redirect(302, FRONTEND)
  }
})

// GET /share/p/:id/og.png
router.get('/p/:id/og.png', async (req, res) => {
  try {
    const p = await loadProduct(req.params.id)
    if (!p) return res.status(404).json({ message: 'Product not found.' })
    const svg = buildProductSvg(p)
    const png = renderPng(svg)
    if (!png) return res.set('Cache-Control', CACHE).type('image/svg+xml').send(svg)
    res.set('Cache-Control', CACHE).type('image/png').send(png)
  } catch (err) {
    console.error('[share product og]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

/* ── Crawl surface ───────────────────────────────────────────────────────── */

// GET /share/sitemap.xml — the public pages worth indexing, from live data
router.get('/sitemap.xml', async (_req, res) => {
  try {
    const [creators, products] = await Promise.all([
      User.find({ role: 'creator', instagramHandle: { $ne: '' } }).select('instagramHandle updatedAt').limit(2000).lean(),
      Product.find({ isActive: true, status: 'approved' }).select('updatedAt').limit(2000).lean(),
    ])
    const url = (loc, lastmod, priority) =>
      `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}<priority>${priority}</priority></url>`

    const body = [
      url(`${FRONTEND}/`, new Date(), '1.0'),
      url(`${FRONTEND}/explore`, new Date(), '0.9'),
      url(`${FRONTEND}/register`, null, '0.8'),
      ...creators.map(c => url(`${FRONTEND}/u/${String(c.instagramHandle).replace(/^@/, '')}`, c.updatedAt, '0.7')),
      ...products.map(p => url(`${FRONTEND}/creator/product/${p._id}`, p.updatedAt, '0.6')),
    ].join('\n')

    res.set('Cache-Control', 'public, max-age=3600').type('application/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`)
  } catch (err) {
    console.error('[sitemap]', err)
    res.status(500).type('text/plain').send('')
  }
})

// GET /share/robots.txt — dashboards are private; share pages are the front door
router.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /$',
    'Allow: /u/',
    'Disallow: /admin',
    'Disallow: /brand',
    'Disallow: /creator/wallet',
    'Disallow: /creator/orders',
    'Disallow: /creator/cart',
    'Disallow: /api/',
    `Sitemap: ${BACKEND}/share/sitemap.xml`,
    '',
  ].join('\n'))
})

/* ── Public campaign report — the case study ─────────────────────────────────
 * Tokenized (unguessable, brand-revocable), server-rendered so it reads
 * perfectly in a WhatsApp preview or a boss's browser with no login. This is
 * the page FlexTag closes the next brand with.
 */
router.get('/report/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '')
    if (!/^[a-f0-9]{32}$/.test(token)) return res.status(404).type('html').send('<h1>Not found</h1>')
    const campaign = await Campaign.findOne({ reportToken: token }).select('_id').lean()
    if (!campaign) return res.status(404).type('html').send('<h1>This report link has been revoked.</h1>')
    const r = await buildReport(campaign._id)
    if (!r) return res.status(404).type('html').send('<h1>Not found</h1>')

    const n = (v) => Number(v || 0).toLocaleString('en-US')
    const stat = (value, label, accent = false) => `
      <div class="stat${accent ? ' accent' : ''}"><p class="v">${value}</p><p class="l">${esc(label)}</p></div>`
    const rows = r.topPosts.map(p => `
      <tr>
        <td>${esc(p.creator)}${p.handle ? ` <span class="dim">@${esc(String(p.handle).replace(/^@/, ''))}</span>` : ''}${p.verified ? ' <span class="chip">verified</span>' : ''}</td>
        <td>${esc(p.mediaType || 'post')}</td>
        <td class="num">${p.likes == null ? '—' : n(p.likes)}</td>
        <td class="num">${p.comments == null ? '—' : n(p.comments)}</td>
        <td class="num">${p.views == null ? '—' : n(p.views)}</td>
        <td>${p.permalink ? `<a href="${esc(p.permalink)}" target="_blank" rel="noreferrer">view ↗</a>` : '—'}</td>
      </tr>`).join('')

    res.set('Cache-Control', 'public, max-age=300').type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(r.campaign.product)} — campaign report | FlexTag</title>
<meta name="robots" content="noindex" />
<meta property="og:title" content="${esc(r.campaign.product)} — ${r.posts.verified} verified posts, ${n(r.engagement.engagements)} engagements" />
<meta property="og:description" content="Machine-verified creator campaign on FlexTag. Every number checkable." />
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#0a0616; color:#fff; font-family:'Segoe UI',system-ui,sans-serif; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 40px 20px 60px; }
  .bar { height:5px; background:linear-gradient(90deg,#7c3aed,#06b6d4); }
  h1 { font-size: 30px; margin: 24px 0 4px; } h2 { font-size:17px; margin:34px 0 12px; }
  .sub { color: rgba(255,255,255,0.45); margin: 0 0 26px; }
  .brandline { display:flex; justify-content:space-between; align-items:center; padding-top:26px; }
  .logo { font-weight:900; font-style:italic; font-size:22px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; }
  .stat { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09); border-radius:16px; padding:18px; }
  .stat.accent { border-color:rgba(6,182,212,0.5); background:rgba(6,182,212,0.08); }
  .stat .v { font-size:26px; font-weight:800; margin:0; } .stat .l { font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.45); margin:6px 0 0; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { text-align:left; color:rgba(255,255,255,0.4); font-size:11px; text-transform:uppercase; letter-spacing:0.08em; padding:8px 10px; }
  td { padding:10px; border-top:1px solid rgba(255,255,255,0.07); } .num { text-align:right; font-variant-numeric:tabular-nums; }
  .dim { color:rgba(255,255,255,0.4); } a { color:#67e8f9; text-decoration:none; }
  .chip { font-size:10px; font-weight:700; color:#4ade80; border:1px solid rgba(74,222,128,0.4); border-radius:99px; padding:1px 8px; margin-left:4px; }
  .foot { margin-top:40px; padding-top:18px; border-top:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.35); font-size:12px; line-height:1.7; }
  .cta { display:inline-block; margin-top:10px; padding:12px 24px; border-radius:99px; background:linear-gradient(135deg,#7c3aed,#06b6d4); color:#fff; font-weight:800; font-size:13px; }
  @media print { body { background:#fff; color:#111; } .stat { border-color:#ddd; background:#fafafa; } }
</style>
</head>
<body>
<div class="bar"></div>
<div class="wrap">
  <div class="brandline"><span class="logo">FlexTag</span><span class="dim">Campaign performance report</span></div>
  <h1>${esc(r.campaign.product)}</h1>
  <p class="sub">by ${esc(r.campaign.brand)} · ${r.campaign.cashbackRate}% creator cashback · started ${new Date(r.campaign.startedAt).toLocaleDateString('en-GB')} · generated ${new Date(r.generatedAt).toLocaleDateString('en-GB')}</p>

  <div class="grid">
    ${stat(n(r.posts.verified), 'Verified posts', true)}
    ${stat(n(r.engagement.engagements), 'Engagements')}
    ${stat(n(r.engagement.audienceReached), 'Audience reached')}
    ${stat(r.money.costPerEngagement == null ? '—' : '৳' + r.money.costPerEngagement, 'Cost per engagement', true)}
  </div>

  <h2>Orders</h2>
  <div class="grid">
    ${stat(n(r.orders.total), 'Orders placed')}
    ${stat('৳' + n(r.orders.gmv), 'Product sales (GMV)')}
    ${stat(n(r.orders.uniqueCreators), 'Creators')}
    ${stat(n(r.orders.returned), 'Returns')}
  </div>

  <h2>Content quality</h2>
  <div class="grid">
    ${stat(n(r.posts.stillLive) + ' / ' + n(r.posts.verified), 'Posts still live')}
    ${stat(n(r.posts.fromVerifiedCreators), 'From identity-verified creators')}
    ${stat(n(r.posts.autoApproved), 'Machine-verified automatically')}
    ${stat(r.money.costPerPost == null ? '—' : '৳' + n(r.money.costPerPost), 'Cost per verified post')}
  </div>

  ${r.topPosts.length ? `<h2>Top posts</h2>
  <table>
    <thead><tr><th>Creator</th><th>Type</th><th class="num">Likes</th><th class="num">Comments</th><th class="num">Views</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>` : ''}

  <div class="foot">
    Every post above was fetched from Instagram and checked by FlexTag — required hashtags, brand mentions,
    content type and account ownership — before a single taka of reward was released. Engagement numbers are
    the snapshots taken at verification time. Nothing on this page is self-reported.
    <br /><a class="cta" href="${esc(FRONTEND)}/register?role=brand">Run a campaign like this →</a>
  </div>
</div>
</body>
</html>`)
  } catch (err) {
    console.error('[share report]', err)
    res.status(500).type('html').send('<h1>Something went wrong.</h1>')
  }
})

module.exports = router
