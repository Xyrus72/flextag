import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyChecklist } from '../services/users'

/**
 * The first-transaction funnel, made visible.
 *
 * Marketplaces don't die from missing features — they die because a signup
 * never places the first order. This walks every new creator to their first
 * cashback, one concrete next step at a time, and disappears forever the day
 * they finish. Every tick is derived from real data, so it can never nag about
 * something already done.
 */
const ActivationChecklist = () => {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    getMyChecklist()
      .then(d => { if (alive) setData(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // Nothing to show while loading, and never again once they're activated.
  if (!data || data.finished) return null

  const next = data.steps.find(s => !s.done)

  return (
    <div style={{
      marginBottom: 24, padding: 20, borderRadius: 20,
      background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Get to your first cashback
          </p>
          <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)', margin: '2px 0 0' }}>
            {data.completed} of {data.total} done{next ? ` — next: ${next.title.toLowerCase()}` : ''}
          </p>
        </div>
        <div style={{ flex: '0 0 140px', height: 8, borderRadius: 99, background: 'rgba(var(--ink-rgb),0.07)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${(data.completed / data.total) * 100}%`,
            background: 'linear-gradient(90deg,#7c3aed,#06b6d4)', transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.steps.map((step, i) => (
          <Link key={step.key} to={step.link} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12,
              background: step.done ? 'rgba(34,197,94,0.05)' : step.urgent ? 'rgba(245,158,11,0.08)' : 'rgba(var(--ink-rgb),0.02)',
              border: `1px solid ${step.done ? 'rgba(34,197,94,0.15)' : step.urgent ? 'rgba(245,158,11,0.3)' : 'rgba(var(--ink-rgb),0.05)'}`,
              opacity: step.done ? 0.7 : 1,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, fontSize: 12, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step.done ? 'rgba(34,197,94,0.2)' : 'rgba(124,58,237,0.15)',
                color: step.done ? '#4ade80' : '#a78bfa',
                border: `1px solid ${step.done ? 'rgba(34,197,94,0.4)' : 'rgba(124,58,237,0.3)'}`,
              }}>{step.done ? '✓' : i + 1}</div>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 700, margin: 0,
                  color: 'var(--text)', textDecoration: step.done ? 'line-through' : 'none',
                }}>
                  {step.title}{step.urgent && <span style={{ color: '#fbbf24', marginLeft: 8, fontSize: 11 }}>← cashback waiting</span>}
                </p>
                {!step.done && (
                  <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.45)', margin: '2px 0 0', lineHeight: 1.5 }}>{step.detail}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default ActivationChecklist
