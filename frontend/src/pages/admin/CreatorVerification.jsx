import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, XCircle, Clock,
  Users, UserPlus, LayoutGrid, Heart, MessageCircle, Eye, CalendarClock,
  Activity, ShieldCheck, Lock, Globe, BadgeCheck, Wifi, WifiOff, Scale,
  Camera, EyeOff,
} from 'lucide-react'
import { getUsers } from '../../services/users'
import { igVerifyCreator } from '../../services/admin'
import { getInstagramStatus, getInstagramAudit, runInstagramAudit } from '../../services/instagram'

/* ── Constants ─────────────────────────────────────────────────────────────── */

const GRADE_COLOR = { A: '#22c55e', B: '#22c55e', C: '#f59e0b', D: '#ef4444', F: '#ef4444' }

const QUALITY = {
  good:    { color: 'var(--green-ink)',                 badge: 'badge-success', label: 'Good' },
  fair:    { color: 'var(--amber-ink)',                 badge: 'badge-warning', label: 'Fair' },
  poor:    { color: '#f87171',                 badge: 'badge-error',   label: 'Poor' },
  unknown: { color: 'rgba(var(--ink-rgb),0.45)', badge: 'badge-neutral', label: 'Unknown' },
}

const TYPE_BADGE = {
  reel:     { label: 'Reel',     cls: 'badge-info' },
  video:    { label: 'Video',    cls: 'badge-cyan' },
  carousel: { label: 'Carousel', cls: 'badge-warning' },
  image:    { label: 'Image',    cls: 'badge-neutral' },
}

const PRECHECK_BADGE = {
  passed:  { cls: 'badge-success', label: 'Precheck ✓' },
  failed:  { cls: 'badge-error',   label: 'Precheck ✗' },
  pending: { cls: 'badge-warning', label: 'Precheck …' },
}

const STATUS_TONES = {
  green: { bg: 'rgba(34,197,94,0.08)',     border: 'rgba(34,197,94,0.25)',     color: 'var(--green-ink)',                 dot: 'var(--green-ink)', Icon: Wifi },
  amber: { bg: 'rgba(245,158,11,0.08)',    border: 'rgba(245,158,11,0.25)',    color: 'var(--amber-ink)',                 dot: 'var(--amber-ink)', Icon: Clock },
  red:   { bg: 'rgba(239,68,68,0.08)',     border: 'rgba(239,68,68,0.25)',     color: '#f87171',                 dot: '#f87171', Icon: WifiOff },
  grey:  { bg: 'rgba(var(--ink-rgb),0.03)',   border: 'rgba(var(--ink-rgb),0.08)',   color: 'rgba(var(--ink-rgb),0.55)', dot: 'rgba(var(--ink-rgb),0.35)', Icon: WifiOff },
}

const PANEL = {
  background: 'rgba(var(--ink-rgb),0.03)',
  border: '1px solid rgba(var(--ink-rgb),0.07)',
  borderRadius: 16,
  backdropFilter: 'blur(20px)',
}

const LABEL = { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--ink-rgb),0.35)', margin: 0 }
const MUTED = { fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)', margin: 0, lineHeight: 1.5 }
const CODE  = { background: 'rgba(var(--ink-rgb),0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }

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

const fmtTime = (d) => {
  if (!d) return '—'
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return '—'
  return t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
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

const normalizeHandle = (h) => String(h || '').trim().replace(/^@+/, '').toLowerCase()

const errMsg = (err, fallback) => err?.response?.data?.message || err?.message || fallback

const tierColor = (tier) => {
  const map = { gold: '#f59e0b', silver: '#94a3b8', bronze: '#cd7f32', platinum: '#a78bfa' }
  return map[tier] || '#6b7280'
}

const scoreColor = (score) => {
  const s = Number(score)
  if (s >= 70) return '#4ade80'
  if (s >= 55) return '#fbbf24'
  return '#f87171'
}

/* ── Small building blocks ─────────────────────────────────────────────────── */

const SectionTitle = ({ icon: Icon, color = '#a78bfa', children, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
    <h3 style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
      {Icon && (
        <span style={{ width: 26, height: 26, borderRadius: 8, background: `${color}1f`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} style={{ color }} />
        </span>
      )}
      {children}
    </h3>
    {right && <div style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)' }}>{right}</div>}
  </div>
)

const MiniSpinner = () => (
  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(var(--ink-rgb),0.3)', borderTopColor: '#fff', flexShrink: 0 }} />
)

/* ── Instagram session status strip ───────────────────────────────────────── */

const describeStatus = (status) => {
  if (!status) return null
  const hiker = status.provider === 'hiker'
  if (!status.configured) {
    return {
      tone: 'grey',
      title: 'No Instagram data provider configured',
      detail: (
        <>add <code style={CODE}>HIKERAPI_KEY</code> (recommended) or the cookie trio <code style={CODE}>IG_SESSIONID</code> / <code style={CODE}>IG_CSRFTOKEN</code> / <code style={CODE}>IG_DS_USER_ID</code> to <code style={CODE}>backend/.env</code></>
      ),
    }
  }
  if (status.valid === false) {
    return hiker
      ? { tone: 'red', title: 'HikerAPI key rejected', detail: <>check <code style={CODE}>HIKERAPI_KEY</code> in <code style={CODE}>backend/.env</code>{status.lastError ? ` · ${status.lastError}` : ''}</> }
      : { tone: 'red', title: 'Session expired', detail: <>refresh <code style={CODE}>IG_SESSIONID</code> in <code style={CODE}>backend/.env</code>{status.lastError ? ` · ${status.lastError}` : ''}</> }
  }
  const user = hiker ? 'HikerAPI' : status.sessionUser ? `@${status.sessionUser}` : 'session'
  const reqs = isNum(status.requestsLastHour) ? `${fmtNum(status.requestsLastHour)} request${Number(status.requestsLastHour) === 1 ? '' : 's'} this hour` : null
  if (status.throttledUntil && new Date(status.throttledUntil).getTime() > Date.now()) {
    return {
      tone: 'amber',
      title: `Rate-limited (${user})`,
      detail: `paused until ${fmtTime(status.throttledUntil)}${reqs ? ` · ${reqs}` : ''}${status.lastError ? ` · ${status.lastError}` : ''}`,
    }
  }
  return {
    tone: 'green',
    title: hiker ? 'HikerAPI active (pay-per-request)' : `Instagram session active (${user})`,
    detail: reqs || 'no requests this hour',
  }
}

const StatusStrip = ({ status, loading, error, onRefresh }) => {
  const info = error
    ? { tone: 'red', title: 'Could not read Instagram status', detail: error }
    : describeStatus(status)
  const tone = STATUS_TONES[info?.tone || 'grey']
  const { Icon } = tone
  const settings = status?.settings || {}
  const chips = [
    isNum(settings.minFollowers) ? `min ${fmtCompact(settings.minFollowers)} followers` : null,
    settings.blockPrivate ? 'private blocked' : null,
    settings.autoApprovePosts ? 'auto-approve on' : 'auto-approve off',
    typeof settings.precheckEnforce === 'boolean' ? `precheck: ${settings.precheckEnforce ? 'enforce' : 'advisory'}` : null,
  ].filter(Boolean)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      padding: '12px 18px', borderRadius: 14, marginBottom: 20,
      background: tone.bg, border: `1px solid ${tone.border}`,
    }} role="status">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        {loading
          ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, flexShrink: 0 }} />
          : <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone.dot, animation: info?.tone === 'green' ? 'pulseDot 2s infinite' : 'none', flexShrink: 0 }} />}
        <Icon size={15} style={{ color: tone.color, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tone.color }}>
            {loading && !status ? 'Checking Instagram session…' : info?.title || 'Instagram status unknown'}
          </p>
          {info?.detail && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(var(--ink-rgb),0.45)', lineHeight: 1.5 }}>{info.detail}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {chips.map((c) => <span key={c} className="badge badge-neutral" style={{ textTransform: 'none', letterSpacing: 0 }}>{c}</span>)}
        <button type="button" className="btn-ghost" onClick={onRefresh} disabled={loading} style={{ padding: '6px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={12} style={loading ? { animation: 'spin 0.9s linear infinite' } : undefined} /> Refresh
        </button>
      </div>
    </div>
  )
}

/* ── Left-list row badges ──────────────────────────────────────────────────── */

const PrecheckBadge = ({ value }) => {
  const b = PRECHECK_BADGE[value]
  if (!b) return null
  return <span className={`badge ${b.cls}`} style={{ fontSize: 9, padding: '2px 6px', whiteSpace: 'nowrap' }}>{b.label}</span>
}

const ScoreBadge = ({ score }) => {
  if (!isNum(score)) return null
  const color = scoreColor(score)
  return (
    <span title="Instagram health score" style={{ fontSize: 9, fontWeight: 700, color, padding: '2px 6px', borderRadius: 6, background: `${color}18`, border: `1px solid ${color}38`, whiteSpace: 'nowrap' }}>
      {Math.round(Number(score))} pts
    </span>
  )
}

/* ── Health gauge + breakdown ──────────────────────────────────────────────── */

const HealthGauge = ({ score, grade }) => {
  const r = 40
  const c = 2 * Math.PI * r
  const s = clamp(isNum(score) ? Number(score) : 0, 0, 100)
  const color = GRADE_COLOR[grade] || 'rgba(var(--ink-rgb),0.4)'
  return (
    <div style={{ position: 'relative', width: 108, height: 108, flexShrink: 0 }} role="img" aria-label={`Health score ${Math.round(s)} out of 100, grade ${grade || 'unknown'}`}>
      <svg viewBox="0 0 100 100" width="108" height="108" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(var(--ink-rgb),0.06)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - s / 100)}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{Math.round(s)}</span>
        <span style={{ fontSize: 9, color: 'rgba(var(--ink-rgb),0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>/ 100</span>
      </div>
      <div style={{ position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-2)', border: `2px solid ${color}`, color, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {grade || '?'}
      </div>
    </div>
  )
}

const barColor = (ratio) => (ratio >= 0.75 ? '#22c55e' : ratio >= 0.45 ? '#f59e0b' : '#ef4444')

const BreakdownRow = ({ item }) => {
  const max = isNum(item.max) && Number(item.max) > 0 ? Number(item.max) : 1
  const score = clamp(isNum(item.score) ? Number(item.score) : 0, 0, max)
  const ratio = score / max
  const color = barColor(ratio)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{item.label || item.key}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
          {score}<span style={{ color: 'rgba(var(--ink-rgb),0.3)', fontWeight: 500 }}> / {max}</span>
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 5, background: 'rgba(var(--ink-rgb),0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${ratio * 100}%`, borderRadius: 5, background: color, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
      {item.detail && <p style={{ ...MUTED, fontSize: 11, marginTop: 4 }}>{item.detail}</p>}
    </div>
  )
}

const FlagList = ({ flags }) => {
  if (!flags.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--green-ink)', fontSize: 12, fontWeight: 500 }}>
        <CheckCircle2 size={13} style={{ flexShrink: 0 }} /> No red flags detected
      </div>
    )
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      {flags.map((flag, i) => (
        <li key={`${i}-${flag}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--amber-ink)', fontSize: 12, lineHeight: 1.45 }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{flag}</span>
        </li>
      ))}
    </ul>
  )
}

const HealthCard = ({ health }) => {
  const breakdown = Array.isArray(health.breakdown) ? health.breakdown : []
  const flags = Array.isArray(health.flags) ? health.flags.filter(Boolean) : []
  const grade = health.grade
  const color = GRADE_COLOR[grade] || 'rgba(var(--ink-rgb),0.4)'
  return (
    <div style={{ ...PANEL, padding: 18 }}>
      <SectionTitle icon={Activity} color="#7c3aed" right={grade ? <span style={{ color, fontWeight: 700 }}>Grade {grade}</span> : null}>
        Account health
      </SectionTitle>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
          <HealthGauge score={health.score} grade={grade} />
          <span style={{ ...LABEL, fontSize: 9 }}>Health score</span>
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {breakdown.length
            ? breakdown.map((item, i) => <BreakdownRow key={item.key || item.label || i} item={item} />)
            : <p style={MUTED}>No breakdown available.</p>}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <p style={{ ...LABEL, marginBottom: 8 }}>Flags</p>
        <FlagList flags={flags} />
      </div>
    </div>
  )
}

/* ── Audience quality ──────────────────────────────────────────────────────── */

const AudienceCard = ({ audience }) => {
  const q = QUALITY[audience.quality] || QUALITY.unknown
  const pct = isNum(audience.fakeFollowerPct) ? Number(audience.fakeFollowerPct) : null
  const signals = Array.isArray(audience.signals) ? audience.signals : []
  const sampleSize = isNum(audience.sampleSize) ? Number(audience.sampleSize) : 0
  return (
    <div style={{ ...PANEL, padding: 18 }}>
      <SectionTitle icon={Users} color="#06b6d4">Audience quality</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 38, fontWeight: 800, color: q.color, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {pct == null ? '—' : `${pct}%`}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ ...LABEL, fontSize: 9 }}>estimated fake followers</span>
          <span className={`badge ${q.badge}`} style={{ alignSelf: 'flex-start' }}>{q.label}</span>
        </div>
      </div>
      {signals.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
          {signals.map((s, i) => {
            const active = isNum(s.weight) && Number(s.weight) > 0
            return (
              <div key={`${s.key || 'signal'}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid rgba(var(--ink-rgb),0.05)' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{s.label || s.key}</p>
                  {s.detail && <p style={{ ...MUTED, fontSize: 11, marginTop: 2 }}>{s.detail}</p>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--amber-ink)' : 'rgba(var(--ink-rgb),0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {s.value == null || s.value === '' ? '—' : String(s.value)}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <p style={{ ...MUTED, fontSize: 11, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Users size={11} />
        {sampleSize > 0 ? `Based on a sample of ${fmtNum(sampleSize)} followers` : 'No follower sample was available for this audit'}
      </p>
    </div>
  )
}

/* ── Key metrics ───────────────────────────────────────────────────────────── */

const buildMetrics = (profile, metrics) => {
  const hiddenShare = isNum(metrics.hiddenLikesShare) ? Number(metrics.hiddenLikesShare) : 0
  const likesHidden = hiddenShare >= 50
  const er = isNum(metrics.engagementRate) ? Number(metrics.engagementRate) : null
  const days = isNum(metrics.daysSinceLastPost) ? Number(metrics.daysSinceLastPost) : null
  return [
    { key: 'followers', icon: Users,         color: '#06b6d4', label: 'Followers',       value: fmtCompact(profile.followers) },
    { key: 'following', icon: UserPlus,      color: 'var(--violet-ink)', label: 'Following',       value: fmtCompact(profile.following) },
    { key: 'posts',     icon: LayoutGrid,    color: '#7c3aed', label: 'Posts',           value: fmtCompact(profile.posts) },
    { key: 'er',        icon: Activity,      color: '#ec4899', label: 'Engagement',      value: er == null ? '—' : `${er}%` },
    { key: 'likes',     icon: Heart,         color: '#f43f5e', label: 'Avg likes',       value: likesHidden ? 'hidden' : fmtCompact(metrics.avgLikes), tone: likesHidden ? 'var(--amber-ink)' : null },
    { key: 'comments',  icon: MessageCircle, color: '#60a5fa', label: 'Avg comments',    value: fmtCompact(metrics.avgComments) },
    { key: 'views',     icon: Eye,           color: '#22d3ee', label: 'Avg views',       value: fmtCompact(metrics.avgViews) },
    { key: 'cadence',   icon: CalendarClock, color: '#f59e0b', label: 'Posts / week',    value: isNum(metrics.postsPerWeek) ? String(metrics.postsPerWeek) : '—' },
    { key: 'recency',   icon: Clock,         color: '#10b981', label: 'Days since post', value: days == null ? '—' : String(days), tone: days == null ? null : days > 30 ? '#f87171' : days > 7 ? 'var(--amber-ink)' : 'var(--green-ink)' },
  ]
}

const MetricTile = ({ icon: Icon, color, label, value, tone }) => (
  <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ width: 24, height: 24, borderRadius: 7, background: `${color}1f`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={12} style={{ color }} />
      </span>
      <span style={{ ...LABEL, fontSize: 9, letterSpacing: '0.1em' }}>{label}</span>
    </div>
    <p style={{ fontSize: 20, fontWeight: 800, color: tone || 'var(--text)', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1, fontStyle: value === 'hidden' ? 'italic' : 'normal' }}>{value}</p>
  </div>
)

const MetricsGrid = ({ profile, metrics }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
    {buildMetrics(profile, metrics).map(({ key, ...tile }) => <MetricTile key={key} {...tile} />)}
  </div>
)

/* ── Claimed vs actual ─────────────────────────────────────────────────────── */

const ClaimedVsActual = ({ claimed, actual }) => {
  const c = isNum(claimed) ? Number(claimed) : null
  const a = isNum(actual) ? Number(actual) : null
  const inflated = c != null && a != null && c > a * 1.2
  const diff = c != null && a != null ? c - a : null
  const color = inflated ? '#f87171' : '#4ade80'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      padding: '12px 16px', borderRadius: 14,
      background: inflated ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.06)',
      border: `1px solid ${inflated ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.2)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Scale size={15} style={{ color, flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Claimed vs actual followers</p>
          <p style={{ ...MUTED, fontSize: 11 }}>
            Claimed on profile: <strong style={{ color: 'var(--text)' }}>{fmtNum(c)}</strong> · On Instagram: <strong style={{ color: 'var(--text)' }}>{fmtNum(a)}</strong>
            {diff != null && diff !== 0 && <> · {diff > 0 ? '+' : ''}{fmtNum(diff)}</>}
          </p>
        </div>
      </div>
      {c == null || a == null
        ? <span className="badge badge-neutral">Not comparable</span>
        : inflated
          ? <span className="badge badge-error"><AlertTriangle size={11} /> Claimed &gt; actual × 1.2</span>
          : <span className="badge badge-success"><CheckCircle2 size={11} /> Consistent</span>}
    </div>
  )
}

/* ── Recent posts ──────────────────────────────────────────────────────────── */

const TD_NUM = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

const PostsTable = ({ posts }) => (
  <div style={{ ...PANEL, padding: 18 }}>
    <SectionTitle icon={LayoutGrid} color="#ec4899" right={posts.length ? `${posts.length} posts · newest first` : null}>
      Recent posts
    </SectionTitle>
    {posts.length === 0 ? (
      <p style={MUTED}>No recent posts were found on this account.</p>
    ) : (
      <div className="data-table" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Likes</th>
              <th style={{ textAlign: 'right' }}>Comments</th>
              <th style={{ textAlign: 'right' }}>Views</th>
              <th style={{ textAlign: 'right' }}>Link</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => {
              const type = TYPE_BADGE[p.mediaType] || { label: p.mediaType || 'Post', cls: 'badge-neutral' }
              return (
                <tr key={p.id || p.shortcode || i}>
                  <td><span className={`badge ${type.cls}`}>{type.label}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(p.takenAt)}</td>
                  <td style={TD_NUM}>
                    {p.likes == null
                      ? <span style={{ color: 'rgba(var(--ink-rgb),0.3)', fontStyle: 'italic' }}>hidden</span>
                      : <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtNum(p.likes)}</span>}
                  </td>
                  <td style={TD_NUM}>{fmtNum(p.comments)}</td>
                  <td style={TD_NUM}>{p.views == null ? '—' : fmtNum(p.views)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer" aria-label="Open post on Instagram" style={{ color: 'var(--violet-ink)', display: 'inline-flex', padding: 4 }}>
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
)

/* ── Audit panel ───────────────────────────────────────────────────────────── */

const RunAuditButton = ({ running, onClick, label = 'Run / Refresh audit', primary = false }) => (
  <button type="button" className={primary ? 'btn-primary' : 'btn-ghost'} disabled={running} onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
    {running
      ? <><MiniSpinner /> Auditing… ~15 s</>
      : <><RefreshCw size={14} /> {label}</>}
  </button>
)

const ProfileBadges = ({ profile }) => {
  const items = []
  if (profile.isPrivate === true) items.push({ key: 'private', label: 'Private', cls: 'badge-warning', Icon: Lock })
  else if (profile.isPrivate === false) items.push({ key: 'public', label: 'Public', cls: 'badge-success', Icon: Globe })
  if (profile.isVerified) items.push({ key: 'verified', label: 'Verified', cls: 'badge-cyan', Icon: BadgeCheck })
  if (!items.length) return null
  return items.map(({ key, label, cls, Icon }) => (
    <span key={key} className={`badge ${cls}`}><Icon size={11} /> {label}</span>
  ))
}

const EligibilityBadge = ({ eligibility }) => {
  if (!eligibility || typeof eligibility.eligible !== 'boolean') return <span className="badge badge-neutral">Eligibility unknown</span>
  return eligibility.eligible
    ? <span className="badge badge-success"><ShieldCheck size={11} /> Eligible for FlexTag</span>
    : <span className="badge badge-error"><XCircle size={11} /> Not eligible</span>
}

const AuditPanel = ({ audit, creator, running, onRefresh }) => {
  const profile = audit.profile || {}
  const metrics = audit.metrics || {}
  const health = audit.health || {}
  const audience = audit.audience || {}
  const eligibility = audit.eligibility || null
  const posts = Array.isArray(audit.posts) ? audit.posts : []
  const reasons = Array.isArray(eligibility?.reasons) ? eligibility.reasons.filter(Boolean) : []
  const handle = profile.username || audit.username || ''
  const auditErrors = Array.isArray(audit.fetchErrors) ? audit.fetchErrors.filter(Boolean) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header: eligibility + badges + refresh */}
      <div style={{ ...PANEL, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{profile.fullName || handle || 'Instagram account'}</p>
              {handle && (
                <a href={`https://www.instagram.com/${encodeURIComponent(handle)}/`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--violet-ink)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  @{handle} <ExternalLink size={11} />
                </a>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              <EligibilityBadge eligibility={eligibility} />
              <ProfileBadges profile={profile} />
              {audit.source && audit.source !== 'session' && <span className="badge badge-neutral">{audit.source} data</span>}
            </div>
            {reasons.length > 0 && (
              <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {reasons.map((r, i) => (
                  <li key={`${i}-${r}`} style={{ fontSize: 12, color: eligibility?.eligible ? 'rgba(var(--ink-rgb),0.5)' : '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0 }} /> {r}
                  </li>
                ))}
              </ul>
            )}
            {isNum(eligibility?.minFollowers) && (
              <p style={{ ...MUTED, fontSize: 11, marginTop: 6 }}>Threshold: {fmtNum(eligibility.minFollowers)}+ followers</p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <Clock size={11} /> Audited {relativeTime(audit.fetchedAt)}
            </span>
            <RunAuditButton running={running} onClick={onRefresh} />
          </div>
        </div>
        {auditErrors.length > 0 && (
          <p style={{ ...MUTED, fontSize: 11, marginTop: 10, color: 'var(--amber-ink)' }}>Partial data: {auditErrors.join(' · ')}</p>
        )}
      </div>

      <ClaimedVsActual claimed={creator?.followersCount} actual={profile.followers} />

      <MetricsGrid profile={profile} metrics={metrics} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14 }}>
        <HealthCard health={health} />
        <AudienceCard audience={audience} />
      </div>

      <PostsTable posts={posts} />
    </div>
  )
}

/* ── Pre-audit states ──────────────────────────────────────────────────────── */

const NoAuditCard = ({ handle, running, onRun, message }) => (
  <div style={{ ...PANEL, padding: '36px 28px', textAlign: 'center' }}>
    <Camera size={28} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 12 }} />
    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>No audit yet</p>
    <p style={{ ...MUTED, fontSize: 13, margin: '8px auto 0', maxWidth: 420 }}>
      {message || <>Pull the latest posts and a follower sample for <strong style={{ color: 'var(--violet-ink)' }}>@{handle}</strong> to score account health, estimate fake followers and confirm eligibility.</>}
    </p>
    <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
      <RunAuditButton running={running} onClick={onRun} label="Run audit" primary />
    </div>
  </div>
)

const NoHandleCard = () => (
  <div style={{ ...PANEL, padding: '36px 28px', textAlign: 'center' }}>
    <EyeOff size={28} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 12 }} />
    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>No Instagram handle on this profile</p>
    <p style={{ ...MUTED, fontSize: 13, margin: '8px auto 0', maxWidth: 420 }}>Ask the creator to add their handle before running an audit.</p>
  </div>
)

const ErrorBanner = ({ text }) => (
  <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13, fontWeight: 500 }}>
    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
    <span>{text}</span>
  </div>
)

/* ── Main Component ────────────────────────────────────────────────────────── */

const CreatorVerification = () => {
  const [creators, setCreators]               = useState([])
  const [loadingList, setLoadingList]         = useState(true)
  const [listError, setListError]             = useState('')
  const [filter, setFilter]                   = useState('all')
  const [search, setSearch]                   = useState('')
  const [selectedCreator, setSelectedCreator] = useState(null)

  // Instagram session status
  const [igStatus, setIgStatus]           = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusError, setStatusError]     = useState('')

  // Audit state — keyed by the handle it was loaded for, so switching creators
  // derives "loading" instead of resetting state inside the effect.
  const [auditState, setAuditState]     = useState({ handle: '', audit: null, error: '', missing: false })
  const [auditRunning, setAuditRunning] = useState(false)

  // Approve / revoke state
  const [actioning, setActioning] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)   // { tone: 'success'|'error'|'warning', text }

  const handle = normalizeHandle(selectedCreator?.instagramHandle)
  const auditLoading = Boolean(handle) && auditState.handle !== handle
  const audit = auditLoading ? null : auditState.audit
  const auditError = auditLoading ? '' : auditState.error
  const auditMissing = auditLoading ? false : auditState.missing

  // ── Load creators (loadingList starts true) ──────────────────────────────
  useEffect(() => {
    let cancelled = false
    getUsers({ role: 'creator' })
      .then((d) => { if (!cancelled) setCreators(d.users || []) })
      .catch((err) => { if (!cancelled) setListError(errMsg(err, 'Could not load creators.')) })
      .finally(() => { if (!cancelled) setLoadingList(false) })
    return () => { cancelled = true }
  }, [])

  // ── Instagram session status (statusLoading starts true) ─────────────────
  const fetchStatus = useCallback(() => getInstagramStatus()
    .then((d) => { setIgStatus(d || null); setStatusError('') })
    .catch((err) => setStatusError(errMsg(err, 'Status unavailable.')))
    .finally(() => setStatusLoading(false)), [])

  const refreshStatus = useCallback(() => {
    setStatusLoading(true)
    return fetchStatus()
  }, [fetchStatus])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // ── Cached audit for the selected creator ────────────────────────────────
  useEffect(() => {
    if (!handle) return undefined
    let cancelled = false
    getInstagramAudit(handle)
      .then((d) => {
        if (cancelled) return
        const found = d?.audit || null
        setAuditState({ handle, audit: found, error: '', missing: !found })
      })
      .catch((err) => {
        if (cancelled) return
        const notFound = err?.response?.status === 404
        setAuditState({ handle, audit: null, error: notFound ? '' : errMsg(err, 'Could not load the audit.'), missing: notFound })
      })
    return () => { cancelled = true }
  }, [handle])

  // ── Filter + search ──────────────────────────────────────────────────────
  const filteredCreators = creators.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || c.name?.toLowerCase().includes(q)
      || c.instagramHandle?.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
    const matchFilter = filter === 'all'
      || (filter === 'verified'   && c.igVerified)
      || (filter === 'unverified' && !c.igVerified)
    return matchSearch && matchFilter
  })

  // ── Select creator ───────────────────────────────────────────────────────
  const selectCreator = (c) => {
    setSelectedCreator(c)
    setActionMsg('')
  }

  // ── Run / refresh audit ──────────────────────────────────────────────────
  const runAudit = async () => {
    if (!handle) return
    // Capture the target: the admin may switch creators while this runs, and a
    // late result must never be applied to whoever is selected by then.
    const target = handle
    const targetId = selectedCreator?._id
    setAuditRunning(true)
    setAuditState((prev) => (prev.handle === target ? { ...prev, error: '' } : prev))
    try {
      const data = await runInstagramAudit({ username: target, force: true })
      const next = data?.audit || null
      setAuditState((prev) => (prev.handle === target ? { handle: target, audit: next, error: '', missing: !next } : prev))
      if (next && targetId) {
        // Mirror everything the backend denormalises onto the linked user doc.
        const patch = (c) => ({
          igHealthScore: isNum(next.health?.score) ? next.health.score : c.igHealthScore,
          igPrecheck: typeof next.eligibility?.eligible === 'boolean' ? (next.eligibility.eligible ? 'passed' : 'failed') : c.igPrecheck,
          igAuditedAt: next.fetchedAt || c.igAuditedAt,
          followersCount: isNum(next.profile?.followers) ? next.profile.followers : c.followersCount,
          igFakeFollowerPct: next.audience?.fakeFollowerPct ?? c.igFakeFollowerPct,
          igIsPrivate: typeof next.profile?.isPrivate === 'boolean' ? next.profile.isPrivate : c.igIsPrivate,
        })
        setCreators((prev) => prev.map((c) => (c._id === targetId ? { ...c, ...patch(c) } : c)))
        setSelectedCreator((prev) => (prev && prev._id === targetId ? { ...prev, ...patch(prev) } : prev))
      }
    } catch (err) {
      const message = errMsg(err, 'Audit failed.')
      setAuditState((prev) => (prev.handle === target ? { ...prev, error: message } : prev))
    } finally {
      setAuditRunning(false)
      fetchStatus()
    }
  }

  // ── Approve / revoke ─────────────────────────────────────────────────────
  const handleVerify = async (approve) => {
    if (!selectedCreator) { setActionMsg({ tone: 'warning', text: 'Select a creator from the list first.' }); return }
    setActioning(true)
    setActionMsg(null)
    try {
      await igVerifyCreator(selectedCreator._id, approve)
      setCreators((prev) => prev.map((c) => (c._id === selectedCreator._id ? { ...c, igVerified: approve } : c)))
      setSelectedCreator((prev) => (prev ? { ...prev, igVerified: approve } : prev))
      setActionMsg({ tone: approve ? 'success' : 'error', text: approve ? 'Creator Instagram identity approved.' : 'Verification revoked.' })
    } catch (err) {
      setActionMsg({ tone: 'error', text: errMsg(err, 'Action failed.') })
    } finally {
      setActioning(false)
    }
  }

  const panel = {
    background: 'rgba(var(--ink-rgb),0.03)',
    border: '1px solid rgba(var(--ink-rgb),0.07)',
    borderRadius: 16,
    backdropFilter: 'blur(20px)',
  }

  const renderAuditArea = () => {
    if (!selectedCreator) {
      return (
        <div style={{ ...panel, padding: '60px 32px', textAlign: 'center' }}>
          <Camera size={28} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(var(--ink-rgb),0.5)', margin: '0 0 8px' }}>
            Select a creator to review their Instagram audit
          </p>
          <p style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.25)', margin: 0, lineHeight: 1.7 }}>
            Health score, fake-follower estimate, eligibility and recent posts<br />
            load from the cached audit — run a fresh one any time
          </p>
        </div>
      )
    }
    if (!handle) return <NoHandleCard />
    if (auditLoading) {
      return (
        <div style={{ ...panel, padding: 48, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      )
    }
    return (
      <>
        {auditError && <ErrorBanner text={auditError} />}
        {audit
          ? <AuditPanel audit={audit} creator={selectedCreator} running={auditRunning} onRefresh={runAudit} />
          : <NoAuditCard handle={handle} running={auditRunning} onRun={runAudit} message={!auditMissing && auditError ? 'Could not load a cached audit. You can still try running a new one.' : null} />}
      </>
    )
  }

  return (
    <div className="page-root">
      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .creator-verify-layout { display: grid; grid-template-columns: 300px 1fr; gap: 20px; align-items: start; }
        @media (max-width: 768px) { .creator-verify-layout { grid-template-columns: 1fr; } }
      `}</style>

      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-label"><span>Admin · Creator Management</span></div>
        <h1 className="page-title">Creator ID Verification</h1>
        <p className="page-subtitle">Review Instagram audits and approve creator identities</p>
      </div>

      {/* ── Instagram session status ── */}
      <StatusStrip status={igStatus} loading={statusLoading} error={statusError} onRefresh={refreshStatus} />

      {/* ── Two-column layout ── */}
      <div className="creator-verify-layout">

        {/* ── LEFT: Creator list ── */}
        <div style={{ ...panel, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 14px 0' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creators…"
              className="field-input"
              style={{ padding: '9px 14px', fontSize: 13 }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {['all', 'unverified', 'verified'].map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} style={{
                  flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: filter === f ? 'var(--purple)' : 'rgba(var(--ink-rgb),0.05)',
                  color: filter === f ? '#fff' : 'rgba(var(--ink-rgb),0.4)', transition: 'all 0.2s',
                }}>{f}</button>
              ))}
            </div>
            <p style={{ fontSize: 10, color: 'rgba(var(--ink-rgb),0.25)', margin: '8px 0 0', fontWeight: 600 }}>
              {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div style={{ maxHeight: 580, overflowY: 'auto', padding: '10px 8px 12px' }}>
            {loadingList ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="spinner" />
              </div>
            ) : listError ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: '#f87171', fontSize: 12 }}>{listError}</div>
            ) : filteredCreators.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'rgba(var(--ink-rgb),0.3)', fontSize: 13 }}>
                No creators found
              </div>
            ) : filteredCreators.map((c) => {
              const isSelected = selectedCreator?._id === c._id
              return (
                <button
                  type="button"
                  key={c._id}
                  onClick={() => selectCreator(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                    borderRadius: 12, cursor: 'pointer', marginBottom: 3,
                    width: '100%', textAlign: 'left', font: 'inherit',
                    background: isSelected ? 'rgba(124,58,237,0.15)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(124,58,237,0.4)' : 'transparent'}`,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(var(--ink-rgb),0.04)' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: tierColor(c.tier),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff',
                  }}>{(c.name || '?')[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.instagramHandle ? `@${normalizeHandle(c.instagramHandle)}` : '(no handle)'}
                    </p>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      <PrecheckBadge value={c.igPrecheck} />
                      <ScoreBadge score={c.igHealthScore} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    {c.igVerified && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: 'var(--green-ink)', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.25)', whiteSpace: 'nowrap' }}>
                        IG ✓
                      </span>
                    )}
                    {c.tier && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: tierColor(c.tier), padding: '2px 6px', borderRadius: 6, background: `${tierColor(c.tier)}18`, border: `1px solid ${tierColor(c.tier)}38`, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                        {c.tier}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT: Audit + verification ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Selected creator context bar */}
          {selectedCreator && (
            <div style={{
              ...panel, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: tierColor(selectedCreator.tier),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800, color: '#fff',
              }}>{(selectedCreator.name || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{selectedCreator.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(var(--ink-rgb),0.4)' }}>
                  {selectedCreator.email}{handle ? ` · @${handle}` : ''}{isNum(selectedCreator.followersCount) ? ` · claims ${fmtCompact(selectedCreator.followersCount)} followers` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <PrecheckBadge value={selectedCreator.igPrecheck} />
                {selectedCreator.igVerified ? (
                  <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: 'var(--green-ink)', padding: '5px 14px', borderRadius: 16, border: '1px solid rgba(34,197,94,0.25)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={13} strokeWidth={1.75} /> IG verified
                  </span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: 'var(--amber-ink)', padding: '5px 14px', borderRadius: 16, border: '1px solid rgba(245,158,11,0.25)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} strokeWidth={1.75} /> Unverified
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Audit area */}
          {renderAuditArea()}

          {/* Approve / Revoke panel */}
          {selectedCreator && (
            <div style={{ ...panel, padding: '18px 20px', background: 'rgba(var(--ink-rgb),0.02)' }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                Save verification for {selectedCreator.name}
              </p>
              {actionMsg && (
                <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600,
                  color: actionMsg.tone === 'success' ? 'var(--green-ink)' : actionMsg.tone === 'error' ? '#f87171' : 'var(--amber-ink)' }}>
                  {actionMsg.text}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => handleVerify(true)}
                  disabled={actioning}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(34,197,94,0.3)',
                    background: 'rgba(34,197,94,0.1)', color: 'var(--green-ink)',
                    fontSize: 14, fontWeight: 700,
                    cursor: actioning ? 'not-allowed' : 'pointer',
                    opacity: actioning ? 0.5 : 1, transition: 'all 0.2s',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                  onMouseEnter={(e) => { if (!actioning) e.currentTarget.style.background = 'rgba(34,197,94,0.2)' }}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(34,197,94,0.1)')}
                >
                  {actioning ? '…' : <><CheckCircle2 size={16} strokeWidth={1.75} /> Approve IG identity</>}
                </button>
                <button
                  type="button"
                  onClick={() => handleVerify(false)}
                  disabled={actioning}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.1)', color: '#f87171',
                    fontSize: 14, fontWeight: 700,
                    cursor: actioning ? 'not-allowed' : 'pointer',
                    opacity: actioning ? 0.5 : 1, transition: 'all 0.2s',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                  onMouseEnter={(e) => { if (!actioning) e.currentTarget.style.background = 'rgba(239,68,68,0.2)' }}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                >
                  {actioning ? '…' : <><XCircle size={16} strokeWidth={1.75} /> Reject / revoke</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreatorVerification
