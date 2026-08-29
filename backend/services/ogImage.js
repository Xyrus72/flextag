'use strict'
/**
 * Social share cards for public creator portfolios.
 *
 * A shared /u/handle link used to unfurl as a blank card — the SPA has no
 * per-page meta, and crawlers do not run React. This renders the card as SVG
 * (readable, versionable, no binary assets) and rasterises it to PNG, because
 * Facebook, WhatsApp and X will not render an SVG og:image.
 *
 * Rasterisation needs a font: resvg loads system fonts, which exist on Windows
 * and on most desktops but NOT in a bare Linux container. Set OG_FONT_PATH to a
 * .ttf on such hosts. If rasterising fails for any reason we fall back to the
 * SVG rather than serving a broken image.
 */

const BRAND = { violet: '#7c3aed', cyan: '#06b6d4', bg0: '#0a0616', bg1: '#150c2e', ink: '#ffffff' }
const WIDTH = 1200
const HEIGHT = 630

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const compact = (n) => {
  const v = Number(n) || 0
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1) + 'K'
  return String(v)
}

/**
 * @param {{ name:string, handle:string, followers:number, posts:number, campaigns:number, health:number|null, verified:boolean, tier:string }} c
 */
function buildPortfolioSvg(c) {
  const stats = [
    { label: 'FOLLOWERS', value: compact(c.followers) },
    { label: 'VERIFIED POSTS', value: String(c.posts || 0) },
    { label: 'CAMPAIGNS', value: String(c.campaigns || 0) },
    ...(Number.isFinite(Number(c.health)) ? [{ label: 'HEALTH', value: `${Math.round(c.health)}/100` }] : []),
  ]
  const cardW = 250
  const gap = 24
  const totalW = stats.length * cardW + (stats.length - 1) * gap
  const startX = (WIDTH - totalW) / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="Segoe UI, Arial, Helvetica, sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND.bg0}"/>
      <stop offset="100%" stop-color="${BRAND.bg1}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${BRAND.violet}"/>
      <stop offset="100%" stop-color="${BRAND.cyan}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="70%">
      <stop offset="0%" stop-color="${BRAND.violet}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${BRAND.violet}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <rect width="${WIDTH}" height="6" fill="url(#accent)"/>

  <text x="60" y="82" fill="${BRAND.ink}" font-size="30" font-weight="700" font-style="italic" opacity="0.9">FlexTag</text>
  <text x="${WIDTH - 60}" y="82" fill="${BRAND.ink}" font-size="20" font-weight="600" opacity="0.45" text-anchor="end">Verified creator portfolio</text>

  <text x="${WIDTH / 2}" y="250" fill="${BRAND.ink}" font-size="72" font-weight="800" text-anchor="middle">${esc(c.name).slice(0, 26)}</text>
  <text x="${WIDTH / 2}" y="310" fill="${BRAND.cyan}" font-size="34" font-weight="600" text-anchor="middle">@${esc(c.handle)}</text>

  ${c.verified ? `<g transform="translate(${WIDTH / 2 - 96}, 340)">
    <rect width="192" height="40" rx="20" fill="${BRAND.violet}" fill-opacity="0.22" stroke="${BRAND.violet}" stroke-opacity="0.6"/>
    <text x="96" y="26" fill="#c4b5fd" font-size="18" font-weight="700" text-anchor="middle">IDENTITY VERIFIED</text>
  </g>` : ''}

  ${stats.map((s, i) => {
    const x = startX + i * (cardW + gap)
    return `<g transform="translate(${x}, 430)">
      <rect width="${cardW}" height="120" rx="20" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1"/>
      <text x="${cardW / 2}" y="58" fill="${BRAND.ink}" font-size="40" font-weight="800" text-anchor="middle">${esc(s.value)}</text>
      <text x="${cardW / 2}" y="90" fill="${BRAND.ink}" font-size="16" font-weight="600" opacity="0.45" text-anchor="middle">${esc(s.label)}</text>
    </g>`
  }).join('\n  ')}

  <text x="${WIDTH / 2}" y="596" fill="${BRAND.ink}" font-size="18" opacity="0.4" text-anchor="middle">flextag.com.bd/u/${esc(c.handle)}</text>
</svg>`
}

/** @returns {Buffer|null} PNG bytes, or null when this host cannot rasterise. */
function renderPng(svg) {
  try {
    const { Resvg } = require('@resvg/resvg-js')
    const font = { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' }
    if (process.env.OG_FONT_PATH) font.fontFiles = [process.env.OG_FONT_PATH]
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH }, font })
    return resvg.render().asPng()
  } catch (err) {
    console.warn('[og] PNG rasterisation unavailable:', err.message)
    return null
  }
}

module.exports = { buildPortfolioSvg, renderPng, WIDTH, HEIGHT }
