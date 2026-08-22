'use strict'
/**
 * PURE scoring functions — no I/O. Given normalized profile/posts/follower
 * sample, produce metrics, a 0–100 health score, a fake-follower estimate,
 * and an eligibility verdict. Every number here is explainable in the UI via
 * the `breakdown` / `signals` / `flags` arrays.
 */

const DAY = 86_400_000

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round1 = (v) => Math.round(v * 10) / 10
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const stdev = (xs) => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) }

/* ── Benchmarks ──────────────────────────────────────────────────────────── */

/** Engagement-rate benchmarks (%) by follower tier: [good, ok]. */
function tierBenchmark(followers) {
  if (followers < 10_000) return { tier: 'nano', good: 4, ok: 2 }
  if (followers < 50_000) return { tier: 'micro', good: 2.5, ok: 1.2 }
  if (followers < 500_000) return { tier: 'mid', good: 1.5, ok: 0.7 }
  return { tier: 'macro', good: 1, ok: 0.4 }
}

/* ── Metrics ─────────────────────────────────────────────────────────────── */

/**
 * @param {object} profile normalized Profile
 * @param {object[]} posts normalized Posts (any order)
 * @param {{ now?: Date, windowDays?: number }} [opts]
 */
function computeMetrics(profile, posts, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date()
  const windowDays = opts.windowDays || 60
  const sorted = [...posts].filter((p) => p.takenAt instanceof Date && !Number.isNaN(p.takenAt.getTime())).sort((a, b) => b.takenAt - a.takenAt)
  const n = sorted.length
  const followers = Math.max(0, profile.followers || 0)

  const visible = sorted.filter((p) => typeof p.likes === 'number')
  const likesArr = visible.map((p) => p.likes)
  const commentsArr = sorted.map((p) => p.comments || 0)
  const viewsArr = sorted.filter((p) => typeof p.views === 'number' && p.views > 0).map((p) => p.views)

  const avgLikes = round1(mean(likesArr))
  const avgComments = round1(mean(commentsArr))
  const avgViews = viewsArr.length ? Math.round(mean(viewsArr)) : null
  const hiddenLikesShare = n ? round1(((n - visible.length) / n) * 100) : 0

  let engagementRate = null
  let engagementBasis = 'none'
  if (followers > 0 && n > 0) {
    if (visible.length >= Math.max(1, Math.floor(n / 2))) {
      // (likes + comments) / followers on posts where likes are visible
      engagementRate = round1(((mean(likesArr) + mean(visible.map((p) => p.comments || 0))) / followers) * 100)
      engagementBasis = 'likes+comments'
    } else if (viewsArr.length) {
      // Likes hidden on most posts: use reel views as the interaction proxy (scaled) + comments
      engagementRate = round1(((mean(viewsArr) * 0.1 + mean(commentsArr)) / followers) * 100)
      engagementBasis = 'views+comments'
    } else {
      // Comments only — multiply by a typical like:comment ratio (~40x) to get a comparable figure
      engagementRate = round1(((mean(commentsArr) * 40) / followers) * 100)
      engagementBasis = 'comments-only'
    }
  }

  const windowStart = now.getTime() - windowDays * DAY
  const inWindow = sorted.filter((p) => p.takenAt.getTime() >= windowStart)
  const postsPerWeek = round1((inWindow.length / windowDays) * 7)
  const daysSinceLastPost = n ? Math.max(0, Math.floor((now.getTime() - sorted[0].takenAt.getTime()) / DAY)) : null

  const commentLikeRatio = avgLikes > 0 ? round1((avgComments / avgLikes) * 100) : null
  const likeCv = likesArr.length >= 3 && mean(likesArr) > 0 ? round1(stdev(likesArr) / mean(likesArr)) : null
  const reelShare = n ? round1((sorted.filter((p) => p.mediaType === 'reel' || p.mediaType === 'video').length / n) * 100) : 0
  const hashtagsPerPost = n ? round1(mean(sorted.map((p) => (p.hashtags || []).length))) : 0
  const followRatio = followers > 0 ? round1((profile.following || 0) / followers) : null

  return {
    postsAnalyzed: n,
    totalLikes: likesArr.reduce((a, b) => a + b, 0),
    totalComments: commentsArr.reduce((a, b) => a + b, 0),
    avgLikes, avgComments, avgViews,
    engagementRate, engagementBasis,
    postsPerWeek, daysSinceLastPost,
    commentLikeRatio, likeCv, reelShare, hashtagsPerPost, hiddenLikesShare, followRatio,
    windowDays,
  }
}

/* ── Health score ────────────────────────────────────────────────────────── */

function scoreHealth(metrics, profile) {
  const breakdown = []
  const flags = []
  const followers = Math.max(0, profile.followers || 0)
  const bench = tierBenchmark(followers)

  // Engagement (40)
  let eng = 0
  if (metrics.engagementRate == null) {
    eng = 0
    flags.push(metrics.postsAnalyzed ? 'Engagement could not be measured' : 'No posts to analyze')
  } else {
    const er = metrics.engagementRate
    if (er >= bench.good) eng = 40
    else if (er >= bench.ok) eng = 24 + ((er - bench.ok) / (bench.good - bench.ok)) * 16
    else eng = (er / bench.ok) * 24
    eng = clamp(Math.round(eng), 0, 40)
    if (er < bench.ok) flags.push(`Low engagement for a ${bench.tier} account (${er}% vs ${bench.ok}% expected)`)
  }
  breakdown.push({ key: 'engagement', label: 'Engagement rate', score: eng, max: 40,
    detail: metrics.engagementRate == null ? 'n/a' : `${metrics.engagementRate}% (${bench.tier} benchmark: good ≥ ${bench.good}%, ok ≥ ${bench.ok}%)${metrics.engagementBasis !== 'likes+comments' ? ' · likes hidden, estimated from ' + metrics.engagementBasis : ''}` })

  // Cadence (20)
  const ppw = metrics.postsPerWeek || 0
  const cad = ppw >= 2 ? 20 : ppw >= 1 ? 12 + ((ppw - 1) / 1) * 8 : ppw >= 0.5 ? 6 + ((ppw - 0.5) / 0.5) * 6 : (ppw / 0.5) * 6
  breakdown.push({ key: 'cadence', label: 'Posting cadence', score: clamp(Math.round(cad), 0, 20), max: 20, detail: `${ppw} posts/week over the last ${metrics.windowDays} days` })
  if (ppw < 0.5) flags.push('Posts less than twice a month')

  // Recency (15)
  const d = metrics.daysSinceLastPost
  const rec = d == null ? 0 : d <= 7 ? 15 : d <= 30 ? 10 : d <= 60 ? 5 : 0
  breakdown.push({ key: 'recency', label: 'Recent activity', score: rec, max: 15, detail: d == null ? 'no posts' : `last post ${d} day${d === 1 ? '' : 's'} ago` })
  if (d != null && d > 30) flags.push(`No posts in ${d} days`)

  // Authenticity (25) — starts full, penalties for bought-engagement patterns
  let auth = 25
  const authNotes = []
  if (metrics.commentLikeRatio != null && metrics.commentLikeRatio < 0.3 && metrics.avgLikes > 200) { auth -= 10; authNotes.push('very few comments relative to likes'); flags.push('Like-to-comment pattern looks like purchased likes') }
  if (metrics.likeCv != null && metrics.likeCv < 0.12 && metrics.postsAnalyzed >= 8) { auth -= 8; authNotes.push('like counts unusually uniform'); flags.push('Like counts are suspiciously uniform across posts') }
  if (metrics.hashtagsPerPost > 20) { auth -= 5; authNotes.push('hashtag stuffing'); flags.push('Heavy hashtag stuffing in captions') }
  if (metrics.followRatio != null && metrics.followRatio > 2) { auth -= 5; authNotes.push('follows far more than followers'); flags.push('Follows many more accounts than follow back (follow-for-follow pattern)') }
  if (metrics.hiddenLikesShare >= 50) flags.push(`Likes hidden on ${metrics.hiddenLikesShare}% of posts`)
  breakdown.push({ key: 'authenticity', label: 'Authenticity signals', score: clamp(auth, 0, 25), max: 25, detail: authNotes.length ? authNotes.join(', ') : 'no red flags' })

  const score = clamp(breakdown.reduce((a, b) => a + b.score, 0), 0, 100)
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
  return { score, grade, breakdown, flags }
}

/* ── Fake followers ──────────────────────────────────────────────────────── */

function isDigitHeavy(username) {
  const u = String(username || '')
  if (!u) return false
  if (/\d{4,}/.test(u)) return true
  const digits = (u.match(/\d/g) || []).length
  if (digits / u.length >= 0.35) return true
  return /^[a-z]+[._]?[a-z]*\d{3,}$/i.test(u)
}

function isSuspiciousFollower(f) {
  const noName = !f.fullName
  const digit = isDigitHeavy(f.username)
  if (f.isVerified) return false
  if (f.hasAnonymousPic && (noName || digit)) return true
  if (digit && noName) return true
  if (f.isPrivate && f.hasAnonymousPic && noName) return true
  return false
}

/**
 * @param {object[]} sample normalized followers (may be empty when no session)
 * @param {object} metrics from computeMetrics
 * @param {object} profile normalized Profile
 * @param {object[]} [history] previous snapshots [{at, followers}] oldest→newest
 */
function estimateFakeFollowers(sample, metrics, profile, history = []) {
  const signals = []
  const n = Array.isArray(sample) ? sample.length : 0
  const counts = { size: n, anonymousPic: 0, noName: 0, digitHeavy: 0, privateAndEmpty: 0, suspicious: 0 }
  for (const f of sample || []) {
    if (f.hasAnonymousPic) counts.anonymousPic++
    if (!f.fullName) counts.noName++
    if (isDigitHeavy(f.username)) counts.digitHeavy++
    if (f.isPrivate && f.hasAnonymousPic && !f.fullName) counts.privateAndEmpty++
    if (isSuspiciousFollower(f)) counts.suspicious++
  }

  let base = null
  if (n >= 20) {
    base = (counts.suspicious / n) * 100
    signals.push({ key: 'sample', label: 'Suspicious accounts in follower sample', value: `${counts.suspicious}/${n}`, weight: Math.round(base), detail: `${counts.anonymousPic} without profile photo · ${counts.noName} without a name · ${counts.digitHeavy} number-heavy usernames` })
  } else if (n > 0) {
    signals.push({ key: 'sample', label: 'Follower sample too small', value: `${n}`, weight: 0, detail: 'Need at least 20 sampled followers for a reliable estimate' })
  } else {
    signals.push({ key: 'sample', label: 'No follower sample', value: '—', weight: 0, detail: 'Follower list needs an Instagram session; estimate uses account-level signals only' })
  }

  let adj = 0
  const bench = tierBenchmark(profile.followers || 0)
  if (metrics.engagementRate != null && metrics.engagementRate < bench.ok / 2 && (profile.followers || 0) >= 1000) {
    adj += 8
    signals.push({ key: 'engagement', label: 'Engagement far below follower count', value: `${metrics.engagementRate}%`, weight: 8, detail: `Expected at least ${bench.ok}% for a ${bench.tier} account` })
  }
  if (metrics.followRatio != null && metrics.followRatio > 2) {
    adj += 5
    signals.push({ key: 'followRatio', label: 'Follow-for-follow pattern', value: `${metrics.followRatio}×`, weight: 5, detail: 'Follows more than twice as many accounts as follow back' })
  }
  const snaps = (history || []).filter((h) => h && typeof h.followers === 'number' && h.at).sort((a, b) => new Date(a.at) - new Date(b.at))
  const last = snaps[snaps.length - 1]
  if (last && profile.followers) {
    const daysApart = (Date.now() - new Date(last.at).getTime()) / DAY
    const growth = last.followers > 0 ? (profile.followers - last.followers) / last.followers : 0
    if (daysApart <= 14 && growth > 0.4) {
      adj += 10
      signals.push({ key: 'spike', label: 'Sudden follower spike', value: `+${Math.round(growth * 100)}%`, weight: 10, detail: `Grew from ${last.followers} to ${profile.followers} in ${Math.round(daysApart)} days` })
    }
  }

  let fakeFollowerPct = null
  let quality = 'unknown'
  if (base != null) {
    fakeFollowerPct = clamp(Math.round(base + adj), 0, 95)
    quality = fakeFollowerPct < 15 ? 'good' : fakeFollowerPct < 30 ? 'fair' : 'poor'
  } else if (adj > 0) {
    // No sample — report account-level suspicion without a percentage
    quality = adj >= 10 ? 'poor' : 'fair'
  }
  return { fakeFollowerPct, quality, signals, sampleSize: n, counts }
}

/* ── Eligibility ─────────────────────────────────────────────────────────── */

function evaluateEligibility(profile, settings = {}) {
  const minFollowers = Number(settings.minFollowers ?? 1000)
  const blockPrivate = settings.blockPrivate !== false
  const reasons = []
  if (!profile) reasons.push('Instagram account not found')
  else {
    if (blockPrivate && profile.isPrivate) reasons.push('Account is private — FlexTag creators must be public')
    if ((profile.followers || 0) < minFollowers) reasons.push(`Needs ${minFollowers.toLocaleString()}+ followers (has ${(profile.followers || 0).toLocaleString()})`)
  }
  return { eligible: reasons.length === 0, reasons, minFollowers }
}

module.exports = { computeMetrics, scoreHealth, estimateFakeFollowers, evaluateEligibility, tierBenchmark, isDigitHeavy, isSuspiciousFollower }
