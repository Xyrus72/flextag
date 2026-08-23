import { Link, useSearchParams } from 'react-router-dom'

const REASONS = {
  payment_failed:    'Your payment could not be completed.',
  validation_failed: "We couldn't validate the payment with the gateway.",
  missing_data:      'The gateway returned incomplete data.',
  server_error:      'Something went wrong on our side.',
}

const CheckoutFail = () => {
  const [params] = useSearchParams()
  const reason = params.get('reason') || ''

  return (
    <div className="page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Payment Failed</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          {REASONS[reason] || 'Your payment did not go through.'} No charge was made and your cart is intact — you can try again.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/creator/cart" className="btn-primary" style={{ textDecoration: 'none', padding: '12px 22px' }}>Back to Cart</Link>
          <Link to="/creator/catalog" className="btn-ghost" style={{ textDecoration: 'none', padding: '12px 22px' }}>Catalog</Link>
        </div>
      </div>
    </div>
  )
}

export default CheckoutFail
