import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const CheckoutSuccess = () => {
  const [params] = useSearchParams()
  const tranId = params.get('tran_id') || ''

  return (
    <div className="page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>

        {/* Success icon */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'rgba(52,211,153,0.1)', border: '2px solid rgba(52,211,153,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          animation: 'fadeInUp 0.5s ease',
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 style={{
          fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8,
          background: 'linear-gradient(135deg, #34d399, #06b6d4)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Payment Successful!
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          Your order has been placed and payment confirmed. The brand will process and ship your item soon.
        </p>

        {/* Transaction card */}
        {tranId && (
          <div style={{
            padding: '16px 20px', borderRadius: 16,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 28, textAlign: 'left',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Transaction ID</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', fontFamily: 'monospace' }}>{tranId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Payment Status</span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#34d399',
                padding: '3px 10px', borderRadius: 100,
                background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)',
              }}>PAID</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Order Status</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#facc15' }}>Processing</span>
            </div>
          </div>
        )}

        {/* Cashback tip */}
        <div style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)',
          marginBottom: 28,
        }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
            💡 <strong style={{ color: '#a78bfa' }}>Cashback Tip:</strong> Once your order is delivered,
            submit your post via the <strong style={{ color: '#fff' }}>Submit Post</strong> page.
            After verification, your cashback will be released to your wallet.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/creator/orders" style={{
            textDecoration: 'none', padding: '12px 28px', borderRadius: 14,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            color: '#fff', fontSize: 14, fontWeight: 700,
            transition: 'all 0.2s', display: 'inline-block',
          }}>
            View My Orders
          </Link>
          <Link to="/creator/catalog" style={{
            textDecoration: 'none', padding: '12px 28px', borderRadius: 14,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600,
            transition: 'all 0.2s', display: 'inline-block',
          }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CheckoutSuccess
