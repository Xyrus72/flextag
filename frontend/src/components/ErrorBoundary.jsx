import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Catches render crashes so one broken component doesn't leave a creator
 * staring at a blank white page in the middle of a checkout.
 *
 * Deliberately a class: this is the one thing hooks cannot do. The fallback
 * offers the two actions that actually help — retry the render, or go home —
 * and shows the error text only in dev, where someone can act on it.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ui crash]', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ maxWidth: 460 }}>
          <AlertTriangle size={36} strokeWidth={1.5} style={{ color: 'var(--text-dim)', margin: '0 auto 14px' }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
            This page hit a snag
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(var(--ink-rgb),0.5)', margin: '0 0 20px', lineHeight: 1.6 }}>
            Nothing you did — the page failed to render. Your cart, orders and wallet are untouched.
          </p>
          {import.meta.env.DEV && (
            <pre style={{
              textAlign: 'left', fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: 14, overflowX: 'auto', marginBottom: 20,
            }}>{String(this.state.error?.stack || this.state.error)}</pre>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => this.setState({ error: null })} className="btn-primary" style={{ padding: '10px 22px', fontSize: 13 }}>
              Try again
            </button>
            <a href="/" className="btn-ghost" style={{ textDecoration: 'none', padding: '10px 22px', fontSize: 13 }}>
              Back to home
            </a>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
