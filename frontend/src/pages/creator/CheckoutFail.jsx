import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const CheckoutFail = () => {
  const [params] = useSearchParams()
  const reason = params.get('reason') || 'unknown'

  const reasonMessages = {
    payment_failed:    'Your payment could not be processed. No charges were made.',
    validation_failed: 'Payment validation failed. Please contact support if you were charged.',
    missing_data:      'Payment data was incomplete. Please try again.',
    server_error:      'A server error occurred while processing your payment.',
    unknown:           'Something went wrong with your payment.',
  }

  return (
    <div className="page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>

        {/* Fail icon */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'rgba(248,113,113,0.1)', border: '2px solid rgba(248,113,113,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          animation: 'fadeInUp 0.5s ease',
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <h1 style={{
          fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8,
          background: 'linear-gradient(135deg, #f87171, #fb923c)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Payment Failed
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          {reasonMessages[reason] || reasonMessages.unknown}
        </p>

        {/* Info card */}
        <div style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)',
          marginBottom: 28,
        }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
            ⚠️ Your cart items are still saved. You can go back to the cart and try a different payment method.
            If you believe you were charged incorrectly, please{' '}
            <Link to="/support/chat" style={{ color: '#a78bfa', textDecoration: 'underline' }}>contact support</Link>.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/creator/cart" style={{
            textDecoration: 'none', padding: '12px 28px', borderRadius: 14,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            color: '#fff', fontSize: 14, fontWeight: 700,
            transition: 'all 0.2s', display: 'inline-block',
          }}>
            ← Back to Cart
          </Link>
          <Link to="/creator/catalog" style={{
            textDecoration: 'none', padding: '12px 28px', borderRadius: 14,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600,
            transition: 'all 0.2s', display: 'inline-block',
          }}>
            Browse Catalog
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CheckoutFail
