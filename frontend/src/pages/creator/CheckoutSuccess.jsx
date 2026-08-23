import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const CheckoutSuccess = () => {
  const [params] = useSearchParams()
  const tranId = params.get('tran_id') || ''

  // Payment confirmed → clear the cart.
  useEffect(() => { localStorage.removeItem('flextag_cart') }, [])

  return (
    <div className="page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', border: '2px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg,#34d399,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Payment Successful!</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          Your order is placed and payment confirmed. The brand will ship your item soon — post about it once it arrives to earn your cashback.
        </p>
        {tranId && (
          <div style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 28 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Transaction ID</p>
            <p style={{ fontSize: 14, color: '#fff', fontFamily: 'monospace', margin: '4px 0 0' }}>{tranId}</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/creator/orders" className="btn-primary" style={{ textDecoration: 'none', padding: '12px 22px' }}>View My Orders</Link>
          <Link to="/creator/catalog" className="btn-ghost" style={{ textDecoration: 'none', padding: '12px 22px' }}>Keep Shopping</Link>
        </div>
      </div>
    </div>
  )
}

export default CheckoutSuccess
