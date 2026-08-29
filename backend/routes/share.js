const express = require('express')
const router  = express.Router()
const User    = require('../models/User')
const Post    = require('../models/Post')
const { normalizeHandle, handleRegex } = require('../services/instagram/endpoints')
const { buildPortfolioSvg, renderPng } = require('../services/ogImage')

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

module.exports = router
