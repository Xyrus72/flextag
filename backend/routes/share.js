const express = require('express')
const router  = express.Router()
const User    = require('../models/User')
const Post    = require('../models/Post')
const { normalizeHandle, handleRegex } = require('../services/instagram/endpoints')
const Product = require('../models/Product')
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

module.exports = router
