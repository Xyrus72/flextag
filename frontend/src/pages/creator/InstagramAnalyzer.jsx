import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, ChevronDown,
  Users, UserPlus, LayoutGrid, Heart, MessageCircle, Eye, CalendarClock,
  Activity, Clock, Camera, ShieldCheck, Lock, Globe, BadgeCheck, Briefcase, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getMyInstagramAudit, runInstagramAudit, startIdentityVerification, checkIdentityVerification, getConnectStatus, startInstagramConnect, disconnectInstagram } from '../../services/instagram'

/* ── Constants ─────────────────────────────────────────────────────────────── */

const EASE = [0.22, 1, 0.36, 1]

const PANEL = {
  background: 'rgba(var(--ink-rgb),0.04)',
  border: '1px solid rgba(var(--ink-rgb),0.08)',
  borderRadius: 16,
  padding: 24,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
}

const IG_GRADIENT = 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'

const GRADE_COLOR = { A: '#22c55e', B: '#22c55e', C: '#f59e0b', D: '#ef4444', F: '#ef4444' }

const QUALITY = {
  good:    { color: '#22c55e',                 badge: 'badge-success', label: 'Good audience' },
  fair:    { color: '#f59e0b',                 badge: 'badge-warning', label: 'Fair audience' },
  poor:    { color: '#ef4444',                 badge: 'badge-error',   label: 'Poor audience' },
  unknown: { color: 'rgba(var(--ink-rgb),0.45)', badge: 'badge-neutral', label: 'Unknown' },
}

const TYPE_BADGE = {
  reel:     { label: 'Reel',     cls: 'badge-info' },
  video:    { label: 'Video',    cls: 'badge-cyan' },
  carousel: { label: 'Carousel', cls: 'badge-warning' },
  image:    { label: 'Image',    cls: 'badge-neutral' },
}

const TONE_COLOR = { warning: '#fbbf24', error: '#f87171', success: '#4ade80' }

const BANNER_TONES = {
  error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#f87171', Icon: AlertTriangle },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#fbbf24', Icon: AlertTriangle },
  info:    { bg: 'rgba(6,182,212,0.08)',  border: 'rgba(6,182,212,0.25)',  color: '#67e8f9', Icon: null },
  success: { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  color: '#4ade80', Icon: CheckCircle2 },
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const isNum = (n) => n != null && n !== '' && !Number.isNaN(Number(n))
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

const fmtNum = (n) => (isNum(n) ? Number(n).toLocaleString() : '—')

const fmtCompact = (n) => {
  if (!isNum(n)) return '—'
  const v = Number(n)
  const abs = Math.abs(v)
  if (abs >= 1e6) return `${(v / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`
  if (abs >= 1e4) return `${(v / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}K`
  return v.toLocaleString()
}

const fmtDate = (d) => {
  if (!d) return '—'
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return '—'
  return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const relativeTime = (d) => {
  if (!d) return 'never'
  const t = new Date(d).getTime()
  if (Number.isNaN(t)) return 'unknown'
  const mins = Math.floor(Math.max(0, Date.now() - t) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 14) return `${days} d ago`
  return `on ${fmtDate(d)}`
}

const truncate = (s, n) => {
  const str = String(s || '').replace(/\s+/g, ' ').trim()
  return str.length > n ? `${str.slice(0, n).trimEnd()}…` : str
}

const initialOf = (...names) => {
  const first = names.find((n) => typeof n === 'string' && n.trim())
  return first ? first.trim()[0].toUpperCase() : '?'
}

const describeError = (err) => {
  const status = err?.response?.status
  const message = err?.response?.data?.message
  const code = err?.response?.data?.code
  if (status === 503) {
    return { tone: 'warning', text: code === 'SESSION_INVALID'
      ? 'Our Instagram connection expired — an admin needs to refresh it'
      : "Instagram connection isn't configured yet — ask an admin to add the session key" }
  }
  if (status === 429) return { tone: 'warning', text: message || 'Instagram is rate-limiting audits from this network — retrying now won’t help. Please try again later.' }
  if (status === 404) return { tone: 'error', text: message || "We couldn't find that Instagram account. Double-check the handle in your profile." }
  return { tone: 'error', text: message || 'Something went wrong while talking to Instagram. Please try again.' }
}

/* ── Small building blocks ─────────────────────────────────────────────────── */

const InstagramGlyph = ({ size = 22, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <path d="M17.5 6.5h.01" />
  </svg>
)

const Panel = ({ children, delay = 0, style }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, ease: EASE }}
    style={{ ...PANEL, ...style }}
  >
    {children}
  </motion.div>
)

const SectionTitle = ({ icon: Icon, color = '#a78bfa', children, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
    <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
      {Icon && (
        <span style={{ width: 30, height: 30, borderRadius: 9, background: `${color}1f`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color }} />
        </span>
      )}
      {children}
    </h2>
    {right && <div style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)' }}>{right}</div>}
  </div>
)

const Banner = ({ tone = 'info', text, spinner = false }) => {
  const t = BANNER_TONES[tone] || BANNER_TONES.info
  const { Icon } = t
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      role={tone === 'info' ? 'status' : 'alert'}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 13, fontWeight: 500, marginBottom: 20 }}
    >
      {spinner
        ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, flexShrink: 0 }} />
        : Icon && <Icon size={16} style={{ flexShrink: 0 }} />}
      <span>{text}</span>
    </motion.div>
  )
}

const Avatar = ({ src, name, size = 76 }) => {
  const [failed, setFailed] = useState(false)
  const showImg = Boolean(src) && !failed
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', padding: 3, background: IG_GRADIENT, flexShrink: 0, boxShadow: '0 0 28px rgba(253,29,29,0.22)' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.36), fontWeight: 800, color: 'var(--text)' }}>
        {showImg
          ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : initialOf(name)}
      </div>
    </div>
  )
}

const Thumb = ({ src, alt }) => {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Camera size={16} style={{ color: 'rgba(var(--ink-rgb),0.25)' }} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt || ''}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', display: 'block', flexShrink: 0, border: '1px solid rgba(var(--ink-rgb),0.08)' }}
    />
  )
}

/* ── Profile header ────────────────────────────────────────────────────────── */

const ProfileBadges = ({ profile, eligibility, ownerVerified }) => {
  const items = []
  if (profile.isPrivate === true) items.push({ key: 'private', label: 'Private', cls: 'badge-warning', Icon: Lock })
  else if (profile.isPrivate === false) items.push({ key: 'public', label: 'Public', cls: 'badge-success', Icon: Globe })
  if (profile.isVerified) items.push({ key: 'verified', label: 'Verified', cls: 'badge-cyan', Icon: BadgeCheck })
  if (ownerVerified) items.push({ key: 'owner', label: 'Ownership verified', cls: 'badge-success', Icon: ShieldCheck })
  if (profile.isBusiness) items.push({ key: 'business', label: 'Business', cls: 'badge-info', Icon: Briefcase })
  else if (profile.isProfessional) items.push({ key: 'creator', label: 'Creator', cls: 'badge-info', Icon: Sparkles })
  if (eligibility && typeof eligibility.eligible === 'boolean') {
    const reasons = Array.isArray(eligibility.reasons) ? eligibility.reasons.filter(Boolean) : []
    items.push(eligibility.eligible
      ? { key: 'eligible', label: 'Eligible for FlexTag', cls: 'badge-success', Icon: ShieldCheck }
      : { key: 'ineligible', label: reasons.length ? reasons.join(' · ') : 'Not eligible', cls: 'badge-error', Icon: AlertTriangle, plain: true })
  }
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
      {items.map(({ key, label, cls, Icon, plain }) => (
        <span key={key} className={`badge ${cls}`} style={plain ? { textTransform: 'none', letterSpacing: '0.02em', fontSize: 11 } : undefined}>
          <Icon size={11} /> {label}
        </span>
      ))}
    </div>
  )
}

const RefreshButton = ({ running, onClick }) => (
  <button type="button" className="btn-ghost" disabled={running} onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
    <RefreshCw size={14} style={running ? { animation: 'spin 0.9s linear infinite' } : undefined} />
    {running ? 'Pulling your latest posts… ~15 s' : 'Refresh audit'}
  </button>
)

const ProfileHeader = ({ profile, username, eligibility, ownerVerified, fetchedAt, running, onRefresh }) => {
  const handle = profile.username || username || ''
  const name = profile.fullName || handle
  return (
    <Panel delay={0}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        {/* keyed by URL so a refreshed (re-signed) picture remounts instead of keeping a stale "failed" state */}
        <Avatar key={profile.profilePicUrl || 'none'} src={profile.profilePicUrl} name={name} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>{name || 'Unknown account'}</h2>
          {handle && (
            <a href={`https://www.instagram.com/${encodeURIComponent(handle)}/`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#a78bfa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              @{handle} <ExternalLink size={12} />
            </a>
          )}
          {profile.biography && (
            <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.5)', lineHeight: 1.5, margin: '8px 0 0', maxWidth: 560 }}>{truncate(profile.biography, 160)}</p>
          )}
          <ProfileBadges profile={profile} eligibility={eligibility} ownerVerified={ownerVerified} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.35)', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Clock size={12} /> Audited {relativeTime(fetchedAt)}
          </span>
          <RefreshButton running={running} onClick={onRefresh} />
        </div>
      </div>
    </Panel>
  )
}

/* ── KPI tiles ─────────────────────────────────────────────────────────────── */

const buildKpis = (profile, metrics) => {
  const hiddenShare = isNum(metrics.hiddenLikesShare) ? Number(metrics.hiddenLikesShare) : 0
  const likesHidden = hiddenShare >= 50
  const er = isNum(metrics.engagementRate) ? Number(metrics.engagementRate) : null
  const basis = metrics.engagementBasis
  const estimatedEr = er != null && basis && basis !== 'likes+comments'
  const days = isNum(metrics.daysSinceLastPost) ? Number(metrics.daysSinceLastPost) : null
  const ratio = isNum(metrics.followRatio) ? Number(metrics.followRatio) : null

  return [
    { key: 'followers', icon: Users,        color: '#06b6d4', label: 'Followers',      value: fmtCompact(profile.followers), sub: isNum(profile.followers) && Number(profile.followers) >= 1e4 ? fmtNum(profile.followers) : 'on Instagram' },
    { key: 'following', icon: UserPlus,     color: '#a78bfa', label: 'Following',      value: fmtCompact(profile.following), sub: ratio != null ? `${ratio}× following / followers` : 'accounts followed', tone: ratio != null && ratio > 2 ? 'warning' : undefined },
    { key: 'posts',     icon: LayoutGrid,   color: '#7c3aed', label: 'Posts',          value: fmtCompact(profile.posts),     sub: `${fmtNum(metrics.postsAnalyzed ?? 0)} analyzed` },
    { key: 'er',        icon: Activity,     color: '#ec4899', label: 'Engagement rate', value: er == null ? '—' : `${er}%`,
      sub: er == null ? 'could not be measured' : estimatedEr ? `estimated from ${basis} (likes hidden)` : 'likes + comments per post',
      tone: estimatedEr ? 'warning' : undefined },
    { key: 'likes',     icon: Heart,        color: '#f43f5e', label: 'Avg likes',      value: likesHidden ? 'hidden' : fmtCompact(metrics.avgLikes),
      sub: likesHidden ? `hidden on ${hiddenShare}% of posts` : hiddenShare > 0 ? `visible on ${Math.round(100 - hiddenShare)}% of posts` : 'per post',
      tone: likesHidden ? 'warning' : undefined },
    { key: 'comments',  icon: MessageCircle, color: '#60a5fa', label: 'Avg comments',  value: fmtCompact(metrics.avgComments), sub: 'per post' },
    { key: 'views',     icon: Eye,          color: '#22d3ee', label: 'Avg views',      value: isNum(metrics.avgViews) ? fmtCompact(metrics.avgViews) : '—', sub: 'reels & videos' },
    { key: 'cadence',   icon: CalendarClock, color: '#f59e0b', label: 'Posts / week',  value: isNum(metrics.postsPerWeek) ? String(metrics.postsPerWeek) : '—', sub: `last ${isNum(metrics.windowDays) ? metrics.windowDays : 60} days` },
    { key: 'recency',   icon: Clock,        color: '#10b981', label: 'Days since last post', value: days == null ? '—' : String(days),
      sub: days == null ? 'no posts found' : days <= 7 ? 'active this week' : days <= 30 ? 'active this month' : 'inactive lately',
      tone: days == null ? undefined : days > 30 ? 'error' : days > 7 ? 'warning' : 'success' },
  ]
}

const KpiTile = ({ icon: Icon, color, label, value, sub, tone }) => (
  <div className="stat-card" style={{ padding: '18px 20px', background: 'rgba(var(--ink-rgb),0.03)', borderColor: 'rgba(var(--ink-rgb),0.07)' }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}1f`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
      <Icon size={16} style={{ color }} />
    </div>
    <p style={{ fontSize: 24, fontWeight: 800, color: TONE_COLOR[tone] || '#fff', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1, fontStyle: value === 'hidden' ? 'italic' : 'normal' }}>{value}</p>
    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.3)', margin: '6px 0 0' }}>{label}</p>
    {sub && <p style={{ fontSize: 11, color: TONE_COLOR[tone] || 'rgba(var(--ink-rgb),0.4)', margin: '4px 0 0' }}>{sub}</p>}
  </div>
)

const KpiGrid = ({ profile, metrics }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
    {buildKpis(profile, metrics).map(({ key, ...tile }) => <KpiTile key={key} {...tile} />)}
  </div>
)

/* ── Health score ──────────────────────────────────────────────────────────── */

const HealthGauge = ({ score, grade }) => {
  const r = 54
  const c = 2 * Math.PI * r
  const s = clamp(isNum(score) ? Number(score) : 0, 0, 100)
  const color = GRADE_COLOR[grade] || 'rgba(var(--ink-rgb),0.4)'
  return (
    <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }} role="img" aria-label={`Health score ${Math.round(s)} out of 100, grade ${grade || 'unknown'}`}>
      <svg viewBox="0 0 140 140" width="150" height="150" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(var(--ink-rgb),0.06)" strokeWidth="10" />
        <motion.circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - s / 100) }}
          transition={{ duration: 1.1, delay: 0.25, ease: EASE }}
          style={{ filter: `drop-shadow(0 0 8px ${color}99)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{Math.round(s)}</span>
        <span style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 4 }}>/ 100</span>
      </div>
      <div style={{ position: 'absolute', right: 4, bottom: 4, width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-2)', border: `2px solid ${color}`, color, fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${color}66` }}>
        {grade || '?'}
      </div>
    </div>
  )
}

const barColor = (ratio) => (ratio >= 0.75 ? '#22c55e' : ratio >= 0.45 ? '#f59e0b' : '#ef4444')

const BreakdownBar = ({ item, index }) => {
  const max = isNum(item.max) && Number(item.max) > 0 ? Number(item.max) : 1
  const score = clamp(isNum(item.score) ? Number(item.score) : 0, 0, max)
  const ratio = score / max
  const color = barColor(ratio)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label || item.key}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
          {score}<span style={{ color: 'rgba(var(--ink-rgb),0.3)', fontWeight: 500 }}> / {max}</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: 'rgba(var(--ink-rgb),0.06)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.9, delay: 0.3 + index * 0.08, ease: EASE }}
          style={{ height: '100%', borderRadius: 6, background: color, boxShadow: `0 0 10px ${color}66` }}
        />
      </div>
      {item.detail && <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', margin: '6px 0 0', lineHeight: 1.45 }}>{item.detail}</p>}
    </div>
  )
}

const FlagList = ({ flags }) => {
  if (!flags.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80', fontSize: 12, fontWeight: 500 }}>
        <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> No red flags detected
      </div>
    )
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {flags.map((flag, i) => (
        <li key={`${i}-${flag}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: 12, lineHeight: 1.45 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{flag}</span>
        </li>
      ))}
    </ul>
  )
}

const HealthCard = ({ health, delay }) => {
  const breakdown = Array.isArray(health.breakdown) ? health.breakdown : []
  const flags = Array.isArray(health.flags) ? health.flags.filter(Boolean) : []
  const grade = health.grade
  const color = GRADE_COLOR[grade] || 'rgba(var(--ink-rgb),0.4)'
  return (
    <Panel delay={delay}>
      <SectionTitle icon={Activity} color="#7c3aed" right={grade ? <span style={{ color, fontWeight: 700 }}>Grade {grade}</span> : null}>
        Account health
      </SectionTitle>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: '0 0 auto', marginInline: 'auto' }}>
          <HealthGauge score={health.score} grade={grade} />
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.3)' }}>Health score</span>
        </div>
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {breakdown.length
            ? breakdown.map((item, i) => <BreakdownBar key={item.key || item.label || i} item={item} index={i} />)
            : <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.35)', margin: 0 }}>No breakdown available.</p>}
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.3)', margin: '0 0 8px' }}>Flags</p>
        <FlagList flags={flags} />
      </div>
    </Panel>
  )
}

/* ── Audience quality ──────────────────────────────────────────────────────── */

const AudienceCard = ({ audience, depth, delay }) => {
  const q = QUALITY[audience.quality] || QUALITY.unknown
  const pct = isNum(audience.fakeFollowerPct) ? Number(audience.fakeFollowerPct) : null
  const signals = Array.isArray(audience.signals) ? audience.signals : []
  const sampleSize = isNum(audience.sampleSize) ? Number(audience.sampleSize) : 0
  const sampleSignal = signals.find((s) => s && s.key === 'sample')
  const explanation = pct == null
    ? (depth === 'basic'
        ? 'Follower sample not collected yet — click "Refresh audit" to run a full audit.'
        : (sampleSignal?.detail || 'Follower sample unavailable — the estimate needs an Instagram session.'))
    : null

  return (
    <Panel delay={delay}>
      <SectionTitle icon={Users} color="#06b6d4">Audience quality</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 48, fontWeight: 800, color: q.color, letterSpacing: '-0.04em', lineHeight: 1, textShadow: pct != null ? `0 0 24px ${q.color}55` : 'none' }}>
          {pct == null ? '—' : `${pct}%`}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.35)' }}>estimated fake followers</span>
          <span className={`badge ${q.badge}`} style={{ alignSelf: 'flex-start' }}>{q.label}</span>
        </div>
      </div>
      {explanation && (
        <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.45)', margin: '12px 0 0', lineHeight: 1.5 }}>{explanation}</p>
      )}

      {signals.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column' }}>
          {signals.map((s, i) => {
            const active = isNum(s.weight) && Number(s.weight) > 0
            return (
              <div key={`${s.key || 'signal'}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '10px 0', borderTop: '1px solid rgba(var(--ink-rgb),0.05)' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{s.label || s.key}</p>
                  {s.detail && <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', margin: '3px 0 0', lineHeight: 1.45 }}>{s.detail}</p>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: active ? '#fbbf24' : 'rgba(var(--ink-rgb),0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {s.value == null || s.value === '' ? '—' : String(s.value)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.3)', margin: '16px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Users size={12} />
        {sampleSize > 0 ? `Based on a sample of ${fmtNum(sampleSize)} followers` : 'No follower sample was available for this audit'}
      </p>
    </Panel>
  )
}

/* ── Recent posts ──────────────────────────────────────────────────────────── */

const TH_STYLE = { textAlign: 'right' }
const TD_NUM = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

const PostRow = ({ post }) => {
  const type = TYPE_BADGE[post.mediaType] || { label: post.mediaType || 'Post', cls: 'badge-neutral' }
  const caption = truncate(post.caption, 60)
  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 220 }}>
          <Thumb key={post.thumbnail || post.shortcode || 'none'} src={post.thumbnail} alt="" />
          <span style={{ fontSize: 13, color: caption ? 'rgba(var(--ink-rgb),0.75)' : 'rgba(var(--ink-rgb),0.3)', lineHeight: 1.45, fontStyle: caption ? 'normal' : 'italic', maxWidth: 360 }}>
            {caption || 'No caption'}
          </span>
        </div>
      </td>
      <td><span className={`badge ${type.cls}`}>{type.label}</span></td>
      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(post.takenAt)}</td>
      <td style={TD_NUM}>
        {post.likes == null
          ? <span style={{ color: 'rgba(var(--ink-rgb),0.3)', fontStyle: 'italic' }}>hidden</span>
          : <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtNum(post.likes)}</span>}
      </td>
      <td style={TD_NUM}>{fmtNum(post.comments)}</td>
      <td style={TD_NUM}>{post.views == null ? '—' : fmtNum(post.views)}</td>
      <td style={{ textAlign: 'right' }}>
        {post.url && (
          <a href={post.url} target="_blank" rel="noreferrer" aria-label="Open post on Instagram" style={{ color: '#a78bfa', display: 'inline-flex', padding: 4 }}>
            <ExternalLink size={14} />
          </a>
        )}
      </td>
    </tr>
  )
}

const PostsTable = ({ posts, metrics, delay }) => {
  const analyzed = isNum(metrics.postsAnalyzed) ? Number(metrics.postsAnalyzed) : posts.length
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay, ease: EASE }}>
      <SectionTitle icon={LayoutGrid} color="#ec4899" right={posts.length ? `${posts.length} posts · newest first` : null}>
        Recent posts
      </SectionTitle>
      {posts.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 24px' }}>
          <p>🗒️</p>
          <p>No recent posts were found on this account</p>
        </div>
      ) : (
        <div className="data-table" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                <th>Post</th>
                <th>Type</th>
                <th>Date</th>
                <th style={TH_STYLE}>Likes</th>
                <th style={TH_STYLE}>Comments</th>
                <th style={TH_STYLE}>Views</th>
                <th style={TH_STYLE}>Link</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p, i) => <PostRow key={p.id || p.shortcode || i} post={p} />)}
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(124,58,237,0.06)' }}>
                <td colSpan={3} style={{ fontWeight: 600, color: 'rgba(var(--ink-rgb),0.55)', borderTop: '1px solid rgba(var(--ink-rgb),0.08)' }}>
                  Totals across {fmtNum(analyzed)} analyzed posts
                </td>
                <td style={{ ...TD_NUM, fontWeight: 700, color: 'var(--text)', borderTop: '1px solid rgba(var(--ink-rgb),0.08)' }}>{fmtNum(metrics.totalLikes)}</td>
                <td style={{ ...TD_NUM, fontWeight: 700, color: 'var(--text)', borderTop: '1px solid rgba(var(--ink-rgb),0.08)' }}>{fmtNum(metrics.totalComments)}</td>
                <td colSpan={2} style={{ borderTop: '1px solid rgba(var(--ink-rgb),0.08)' }} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </motion.section>
  )
}

/* ── Comment samples ───────────────────────────────────────────────────────── */

const CommentSamples = ({ comments, delay }) => {
  const [open, setOpen] = useState(false)
  return (
    <Panel delay={delay} style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 24px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', textAlign: 'left' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={15} style={{ color: '#60a5fa' }} />
          </span>
          Recent comments ({comments.length})
        </span>
        <ChevronDown size={18} style={{ transition: 'transform 0.25s ease', transform: open ? 'rotate(180deg)' : 'none', color: 'rgba(var(--ink-rgb),0.4)', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '0 24px 20px', maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments.map((c, i) => (
            <div key={`${c.shortcode || ''}-${c.username || ''}-${i}`} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(var(--ink-rgb),0.02)', border: '1px solid rgba(var(--ink-rgb),0.05)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initialOf(c.username)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>@{c.username || 'unknown'}</span>
                  <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.3)' }}>{fmtDate(c.createdAt)}</span>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', margin: '4px 0 0', lineHeight: 1.5, wordBreak: 'break-word' }}>{c.text || ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

/* ── Pre-audit states ──────────────────────────────────────────────────────── */

const NoHandleState = () => (
  <div className="empty-state" style={{ maxWidth: 620, margin: '0 auto' }}>
    <p>📸</p>
    <p>Add your Instagram handle in Profile first</p>
    <Link to="/creator/profile" className="btn-primary" style={{ marginTop: 18, textDecoration: 'none' }}>Go to Profile</Link>
  </div>
)

const RunAuditCard = ({ handle, running, onRun, precheckPending }) => (
  <Panel style={{ maxWidth: 620, margin: '0 auto', padding: '40px 32px', textAlign: 'center' }}>
    <div style={{ width: 60, height: 60, borderRadius: 14, background: IG_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 0 32px rgba(253,29,29,0.25)' }}>
      <InstagramGlyph size={28} />
    </div>
    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Run your first audit</h2>
    <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.5)', lineHeight: 1.6, margin: '10px auto 0', maxWidth: 460 }}>
      We&apos;ll pull the latest posts and a follower sample for <strong style={{ color: '#a78bfa' }}>@{handle}</strong> to score account health,
      estimate fake followers and confirm your FlexTag eligibility. Takes about 15 seconds.
    </p>
    {precheckPending && (
      <p style={{ fontSize: 12, color: '#fbbf24', margin: '10px auto 0', maxWidth: 460 }}>
        Your handle hasn&apos;t been checked yet — running the audit also confirms eligibility.
      </p>
    )}
    <button type="button" className="btn-primary" disabled={running} onClick={onRun} style={{ marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {running
        ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(var(--ink-rgb),0.3)', borderTopColor: '#fff' }} /> Pulling your latest posts… ~15 s</>
        : <><Activity size={15} /> Run my audit</>}
    </button>
  </Panel>
)

/* ── Connect Instagram (OAuth) ─────────────────────────────────────────────── */

/**
 * The production-correct path: the creator authorises FlexTag on their own
 * Instagram professional account. That proves ownership continuously (no bio
 * code to copy) and is the only way stories — which vanish in 24h — can be
 * verified at all.
 */
// Facebook redirects back to this page with ?connect=ok|denied|taken|error.
// Read once, as the initial banner, so the effect stays side-effect-only.
const connectBannerFromUrl = () => {
  const params = new URLSearchParams(window.location.search)
  const reason = params.get('reason')
  switch (params.get('connect')) {
    case 'ok':     return { tone: 'success', text: 'Instagram connected — your account is verified and stories can now be checked.' }
    case 'denied': return { tone: 'warning', text: 'You cancelled the Instagram permission screen.' }
    case 'taken':  return { tone: 'warning', text: reason || 'That Instagram account is already connected to another FlexTag account.' }
    case 'error':  return { tone: 'error', text: reason || 'Could not finish the connection.' }
    default:       return null
  }
}

const ConnectCard = ({ onConnected }) => {
  const [state, setState] = useState(null)   // { available, connected, username, expired }
  const [busy, setBusy]   = useState(false)
  const [msg, setMsg]     = useState(connectBannerFromUrl)

  useEffect(() => {
    let alive = true
    getConnectStatus().then(d => { if (alive) setState(d) }).catch(() => {})
    const result = new URLSearchParams(window.location.search).get('connect')
    if (result === 'ok') onConnected?.()
    if (result) window.history.replaceState({}, '', window.location.pathname)
    return () => { alive = false }
  }, [onConnected])

  const connect = async () => {
    setBusy(true); setMsg(null)
    try {
      const d = await startInstagramConnect()
      window.location.href = d.url
    } catch (err) {
      setMsg(describeError(err))
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await disconnectInstagram()
      setState(s2 => ({ ...s2, connected: false }))
      setMsg({ tone: 'info', text: 'Disconnected. Your verification badge stays.' })
    } catch (err) { setMsg(describeError(err)) } finally { setBusy(false) }
  }

  if (!state?.available) return null   // no Meta app configured — bio code is the path

  return (
    <Panel delay={0} style={{ border: '1px solid rgba(6,182,212,0.35)', background: 'rgba(6,182,212,0.06)' }}>
      <SectionTitle icon={ShieldCheck} color="#67e8f9" right={state.connected ? <span style={{ color: '#4ade80', fontWeight: 700 }}>Connected</span> : 'Recommended'}>
        {state.connected ? `Connected as @${state.username}` : 'Connect your Instagram'}
      </SectionTitle>
      {msg && <Banner tone={msg.tone} text={msg.text} />}
      <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', margin: '0 0 14px', lineHeight: 1.6 }}>
        {state.connected
          ? 'FlexTag reads your posts and live stories with your permission — no bio code, and story campaigns can be verified while the story is up.'
          : 'One tap instead of a bio code: authorise FlexTag on your Instagram professional account. It proves the account is yours, keeps your numbers current, and is the only way a story can be verified before it disappears.'}
      </p>
      {state.expired && <Banner tone="warning" text="That connection expired — reconnect to keep story verification working." />}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {state.connected ? (
          <button type="button" className="btn-ghost" disabled={busy} onClick={disconnect} style={{ padding: '9px 16px', fontSize: 12 }}>Disconnect</button>
        ) : (
          <button type="button" className="btn-primary" disabled={busy} onClick={connect} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <InstagramGlyph size={14} /> {busy ? 'Opening Instagram…' : 'Connect Instagram'}
          </button>
        )}
      </div>
    </Panel>
  )
}

/* ── Ownership proof (bio code) ────────────────────────────────────────────── */

const IdentityCard = ({ handle, onVerified }) => {
  const [phase, setPhase] = useState('idle')   // idle | loading | code | checking | done
  const [data, setData]   = useState(null)     // { code, instructions, expiresInDays }
  const [msg, setMsg]     = useState(null)     // { tone, text }

  const start = async () => {
    setPhase('loading'); setMsg(null)
    try {
      const d = await startIdentityVerification()
      if (d?.verified) { setPhase('done'); onVerified?.(); return }
      setData(d); setPhase('code')
    } catch (err) { setMsg(describeError(err)); setPhase('idle') }
  }

  const check = async () => {
    setPhase('checking'); setMsg(null)
    try {
      const d = await checkIdentityVerification()
      if (d?.verified) {
        setPhase('done')
        setMsg({ tone: 'success', text: d.message || 'Instagram ownership verified — your posts can now be approved automatically.' })
        onVerified?.()
      } else {
        setPhase('code')
        setMsg({ tone: 'warning', text: d?.message || "We couldn't find the code in your bio yet — save your bio and try again." })
      }
    } catch (err) { setMsg(describeError(err)); setPhase('code') }
  }

  const copy = () => { if (data?.code) navigator.clipboard?.writeText(data.code).catch(() => {}) }
  const busy = phase === 'loading' || phase === 'checking'

  return (
    <Panel delay={0} style={{ border: '1px solid rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.06)' }}>
      <SectionTitle icon={ShieldCheck} color="#a78bfa" right={phase === 'done' ? <span style={{ color: '#4ade80', fontWeight: 700 }}>Verified</span> : 'Required for instant cashback'}>
        Prove you own @{handle}
      </SectionTitle>
      {msg && <Banner tone={msg.tone} text={msg.text} />}
      {phase === 'done' ? (
        <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', margin: 0, lineHeight: 1.6 }}>
          Ownership confirmed. Posts that pass every campaign check are now approved automatically and cashback lands in your wallet right away. You can remove the code from your bio.
        </p>
      ) : phase === 'code' || phase === 'checking' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <code style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text)', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(var(--ink-rgb),0.12)', borderRadius: 10, padding: '8px 14px' }}>{data?.code}</code>
            <button type="button" className="btn-ghost" onClick={copy} style={{ padding: '8px 12px', fontSize: 11 }}>Copy</button>
            {data?.expiresInDays && <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)' }}>valid {data.expiresInDays} days</span>}
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', lineHeight: 1.7 }}>
            {(data?.instructions || []).map((line, i) => <li key={i}>{line}</li>)}
          </ol>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" disabled={busy} onClick={check} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {phase === 'checking'
                ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(var(--ink-rgb),0.3)', borderTopColor: '#fff' }} /> Checking your bio…</>
                : <><ShieldCheck size={14} /> Verify now</>}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', margin: 0, lineHeight: 1.6, maxWidth: 560 }}>
            Automatic cashback is only released for accounts we know you own. Add a one-time code to your Instagram bio and we&apos;ll confirm it — it takes about a minute, and you can delete the code afterwards.
          </p>
          <button type="button" className="btn-primary" disabled={busy} onClick={start} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            {phase === 'loading'
              ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(var(--ink-rgb),0.3)', borderTopColor: '#fff' }} /> One moment…</>
              : <><ShieldCheck size={14} /> Get my code</>}
          </button>
        </div>
      )}
    </Panel>
  )
}

/* ── Audit view ────────────────────────────────────────────────────────────── */

const AuditView = ({ audit, ownerVerified, running, onRefresh }) => {
  const profile = audit.profile || {}
  const metrics = audit.metrics || {}
  const health = audit.health || {}
  const audience = audit.audience || {}
  const posts = Array.isArray(audit.posts) ? audit.posts : []
  const comments = Array.isArray(audit.commentSamples) ? audit.commentSamples : []
  const fetchErrors = Array.isArray(audit.fetchErrors) ? audit.fetchErrors.filter(Boolean) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ProfileHeader
        profile={profile}
        username={audit.username}
        eligibility={audit.eligibility}
        ownerVerified={ownerVerified}
        fetchedAt={audit.fetchedAt}
        running={running}
        onRefresh={onRefresh}
      />
      {fetchErrors.length > 0 && (
        <div style={{ marginBottom: -20 }}>
          <Banner tone="warning" text={`Some data couldn't be fetched in this audit: ${fetchErrors.join(' · ')}`} />
        </div>
      )}
      <KpiGrid profile={profile} metrics={metrics} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 20 }}>
        <HealthCard health={health} delay={0.15} />
        <AudienceCard audience={audience} depth={audit.depth} delay={0.2} />
      </div>
      <PostsTable posts={posts} metrics={metrics} delay={0.25} />
      {comments.length > 0 && <CommentSamples comments={comments} delay={0.3} />}
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

const InstagramAnalyzer = () => {
  const { user, setUser } = useAuth()
  const handle = String(user?.instagramHandle || '').replace(/^@/, '').trim()

  const [audit, setAudit]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError]     = useState(null)
  const [notice, setNotice]   = useState(null)   // non-error info, e.g. "refresh throttled"
  const cooldownRef = useRef(0)                   // after a 429, block re-fires for a bit (each retry worsens the IP throttle)

  const markOwnerVerified = () => setUser?.((u) => (u ? { ...u, igVerified: true, igVerifiedAt: new Date().toISOString() } : u))

  useEffect(() => {
    let cancelled = false
    getMyInstagramAudit()
      .then((data) => { if (!cancelled) setAudit(data?.audit || null) })
      .catch((err) => {
        if (cancelled) return
        if (err?.response?.status === 404) return // no audit yet — handled by the pre-audit states
        setError(describeError(err))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const run = async (force) => {
    // Guard against rapid re-clicks after a rate-limit: firing more requests only
    // deepens Instagram's per-IP throttle, so swallow clicks during the cooldown.
    const waitMs = cooldownRef.current - Date.now()
    if (waitMs > 0) {
      setNotice(`Please wait about ${Math.ceil(waitMs / 1000)}s before trying again — repeated attempts make the rate limit worse.`)
      return
    }
    setRunning(true)
    setError(null)
    setNotice(null)
    try {
      const data = await runInstagramAudit(force ? { force: true } : {})
      if (data?.audit) setAudit(data.audit)
      if (force && data?.cached) {
        // The server serves a cached audit inside the hourly creator throttle — say so instead of pretending it fetched.
        const at = data.refreshAfter ? new Date(data.refreshAfter) : null
        const when = at && !Number.isNaN(at.getTime()) ? `next refresh available at ${at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : 'try again in a little while'
        setNotice(`Audits can be refreshed once per hour — showing results from ${relativeTime(data.audit?.fetchedAt)}; ${when}.`)
      }
    } catch (err) {
      if (err?.response?.status === 429) cooldownRef.current = Date.now() + 60_000
      setError(describeError(err))
    } finally {
      setRunning(false)
    }
  }

  const identityNeeded = !!handle && !user?.igVerified

  const shownHandle = audit?.profile?.username || audit?.username || handle

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Creator · Instagram</span></div>
        <h1 className="page-title">Account Audit</h1>
        <p className="page-subtitle">
          {shownHandle
            ? <>Health, audience quality and recent performance for <strong style={{ color: 'var(--text)' }}>@{shownHandle}</strong></>
            : 'Health, audience quality and recent performance of your Instagram account'}
        </p>
      </div>

      {error && <Banner tone={error.tone} text={error.text} />}
      {notice && <Banner tone="info" text={notice} />}

      {!loading && (
        <div style={{ marginBottom: 20 }}>
          <ConnectCard onConnected={markOwnerVerified} />
        </div>
      )}

      {!loading && identityNeeded && (
        <div style={{ marginBottom: 20 }}>
          <IdentityCard handle={handle} onVerified={markOwnerVerified} />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="spinner" /></div>
      ) : audit ? (
        <AuditView audit={audit} ownerVerified={!!user?.igVerified} running={running} onRefresh={() => run(true)} />
      ) : !handle ? (
        <NoHandleState />
      ) : (
        <RunAuditCard handle={handle} running={running} onRun={() => run(false)} precheckPending={user?.igPrecheck === 'pending'} />
      )}
    </div>
  )
}

export default InstagramAnalyzer
