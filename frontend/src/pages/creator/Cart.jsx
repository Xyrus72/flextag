import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { placeOrder } from '../../services/orders'
import { getAddresses } from '../../services/users'
import { useAuth } from '../../context/AuthContext'

const CART_KEY = 'flextag_cart'

const Cart = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('bkash')
  const [address, setAddress] = useState('')
  const [savedAddresses, setSavedAddresses] = useState([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  // ─────────────────────────────────────────────
  // LOAD CART
  // ─────────────────────────────────────────────

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(CART_KEY) || '[]'
      )

      setItems(saved)
    } catch (err) {
      console.error('Could not load cart:', err)
      setItems([])
    }
  }, [])

  // ─────────────────────────────────────────────
  // LOAD SAVED ADDRESSES
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!user?._id) return

    const addrs = user.shippingAddresses || []

    if (addrs.length > 0) {
      setSavedAddresses(addrs)

      const def =
        addrs.find(a => a.isDefault) ||
        addrs[0]

      if (def) {
        const formatted =
          `${def.fullName || user.name} (${def.phone || user.phone})\n` +
          `${def.street}, ${def.city}` +
          `${def.zip ? ', ' + def.zip : ''}, ${def.country}`

        setAddress(formatted)
      }

    } else {

      getAddresses(user._id)
        .then(d => {

          const list =
            d.addresses || []

          setSavedAddresses(list)

          if (list.length > 0) {

            const def =
              list.find(a => a.isDefault) ||
              list[0]

            const formatted =
              `${def.fullName || user.name} (${def.phone || user.phone})\n` +
              `${def.street}, ${def.city}` +
              `${def.zip ? ', ' + def.zip : ''}, ${def.country}`

            setAddress(formatted)
          }

        })
        .catch(() => {})
    }

  }, [user?._id, user?.shippingAddresses])


  // ─────────────────────────────────────────────
  // SAVE CART
  // ─────────────────────────────────────────────

  const save = updated => {
    setItems(updated)

    localStorage.setItem(
      CART_KEY,
      JSON.stringify(updated)
    )
  }


  // ─────────────────────────────────────────────
  // UPDATE QUANTITY
  // ─────────────────────────────────────────────

  const updateQty = (id, delta) => {

    save(
      items.map(item => {

        if (item._id !== id) {
          return item
        }

        const maxStock =
          Number(item.stockLeft) || 999999

        return {
          ...item,

          qty: Math.min(
            maxStock,
            Math.max(
              1,
              Number(item.qty || 1) + delta
            )
          )
        }

      })
    )
  }


  // ─────────────────────────────────────────────
  // REMOVE ITEM
  // ─────────────────────────────────────────────

  const removeItem = id => {

    save(
      items.filter(
        item => item._id !== id
      )
    )
  }


  // ─────────────────────────────────────────────
  // TOTALS
  // ─────────────────────────────────────────────

  const subtotal =
    items.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
        Number(item.qty || 1),
      0
    )


  const totalCashback =
    items.reduce(
      (sum, item) =>
        sum +
        Math.round(
          Number(item.price || 0) *
          Number(item.qty || 1) *
          Number(item.cashbackRate || 0) /
          100
        ),
      0
    )


  const netCost =
    subtotal - totalCashback


  // ─────────────────────────────────────────────
  // CHECKOUT
  // ─────────────────────────────────────────────

  const handleCheckout = async () => {

    if (!address.trim()) {
      setError(
        'Please enter your shipping address.'
      )
      return
    }

    if (items.length === 0) {
      setError(
        'Your cart is empty.'
      )
      return
    }

    setPlacing(true)
    setError('')

    try {

      for (const item of items) {

        // Campaign ID is required by backend.
        // Some cart items may already have campaignId.
        // If not, use _id because campaign itself is stored as cart item.
        const campaignId =
          item.campaignId || item._id

        if (!campaignId) {
          throw new Error(
            'This cart item does not have a campaign ID.'
          )
        }


        await placeOrder({

          campaignId,

          qty:
            Number(item.qty) || 1,

          address:
            address.trim(),

          paymentMethod

        })
      }


      // Clear cart after successful checkout
      localStorage.removeItem(
        CART_KEY
      )

      setItems([])

      navigate(
        '/creator/orders'
      )

    } catch (err) {

      console.error(
        'Order error:',
        err
      )

      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to place order. Please try again.'
      )

    } finally {

      setPlacing(false)

    }
  }


  // ─────────────────────────────────────────────
  // PANEL STYLE
  // ─────────────────────────────────────────────

  const panel = {
    background:
      'rgba(255,255,255,0.04)',

    border:
      '1px solid rgba(255,255,255,0.08)',

    borderRadius: 20,

    padding: 24,

    backdropFilter:
      'blur(20px)'
  }


  return (
    <div className="page-root">

      {/* HEADER */}

      <div className="page-header">

        <div className="page-label">
          <span>Shopping Cart</span>
        </div>

        <h1 className="page-title">
          My Cart
        </h1>

        <p className="page-subtitle">
          {items.length} item
          {items.length !== 1 ? 's' : ''}
          {' '}ready to order
        </p>

      </div>


      {/* ERROR */}

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: '14px 18px',
            borderRadius: 12,
            background:
              'rgba(239,68,68,0.08)',
            border:
              '1px solid rgba(239,68,68,0.2)',
            color: '#f87171',
            fontSize: 13
          }}
        >
          ⚠️ {error}
        </div>
      )}


      {/* EMPTY CART */}

      {items.length === 0 ? (

        <div className="empty-state">

          <p>🛒</p>

          <p>
            Your cart is empty
          </p>

          <Link
            to="/creator/catalog"
            className="btn-primary"
            style={{
              marginTop: 20,
              textDecoration: 'none'
            }}
          >
            Browse Campaigns →
          </Link>

        </div>

      ) : (

        <div
          style={{
            display: 'grid',
            gap: 24
          }}
          className="lg:grid-cols-3"
        >

          {/* ───────────────────────────────────── */}
          {/* ITEMS */}
          {/* ───────────────────────────────────── */}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
            className="lg:col-span-2"
          >

            {items.map(item => (

              <div
                key={item._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  borderRadius: 18,
                  ...panel
                }}
              >

                {/* IMAGE */}

                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 14,
                    background:
                      'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >

                  {item.image ? (

                    <img
                      src={item.image}
                      alt={
                        item.name ||
                        item.title ||
                        'Product'
                      }
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />

                  ) : (

                    <span
                      style={{
                        fontSize: 28
                      }}
                    >
                      📦
                    </span>

                  )}

                </div>


                {/* INFO */}

                <div
                  style={{
                    flex: 1,
                    minWidth: 0
                  }}
                >

                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#fff',
                      margin: '0 0 4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.title ||
                      item.name}
                  </p>

                  <p
                    style={{
                      fontSize: 12,
                      color:
                        'rgba(255,255,255,0.3)',
                      margin: 0
                    }}
                  >
                    {item.brand}
                  </p>

                  {item.cashbackRate > 0 && (

                    <p
                      style={{
                        fontSize: 12,
                        color: '#4ade80',
                        marginTop: 4
                      }}
                    >
                      {item.cashbackRate}%
                      cashback · Save ৳
                      {Math.round(
                        item.price *
                        item.qty *
                        item.cashbackRate /
                        100
                      ).toLocaleString()}
                    </p>

                  )}

                </div>


                {/* QUANTITY */}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 10,
                    background:
                      'rgba(255,255,255,0.05)',
                    border:
                      '1px solid rgba(255,255,255,0.1)'
                  }}
                >

                  <button
                    onClick={() =>
                      updateQty(
                        item._id,
                        -1
                      )
                    }
                    style={{
                      padding: '8px 14px',
                      color:
                        'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                      fontSize: 16
                    }}
                  >
                    −
                  </button>

                  <span
                    style={{
                      padding: '8px 10px',
                      color: '#fff',
                      fontWeight: 600,
                      minWidth: 32,
                      textAlign: 'center',
                      fontSize: 14
                    }}
                  >
                    {item.qty}
                  </span>

                  <button
                    onClick={() =>
                      updateQty(
                        item._id,
                        1
                      )
                    }
                    style={{
                      padding: '8px 14px',
                      color:
                        'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                      fontSize: 16
                    }}
                  >
                    +
                  </button>

                </div>


                {/* PRICE */}

                <div
                  style={{
                    textAlign: 'right'
                  }}
                >

                  <p
                    style={{
                      color: '#fff',
                      fontWeight: 700,
                      margin: 0
                    }}
                  >
                    ৳
                    {(
                      Number(item.price) *
                      Number(item.qty)
                    ).toLocaleString()}
                  </p>

                  <button
                    onClick={() =>
                      removeItem(
                        item._id
                      )
                    }
                    style={{
                      marginTop: 5,
                      border: 'none',
                      background: 'none',
                      color: '#f87171',
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>

                </div>

              </div>

            ))}

          </div>


          {/* ───────────────────────────────────── */}
          {/* SUMMARY */}
          {/* ───────────────────────────────────── */}

          <div>

            <div
              style={{
                ...panel,
                position: 'sticky',
                top: 20
              }}
            >

              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#fff',
                  marginBottom: 20
                }}
              >
                Order Summary
              </h2>


              {/* SUBTOTAL */}

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  marginBottom: 14
                }}
              >

                <span
                  style={{
                    color:
                      'rgba(255,255,255,0.45)'
                  }}
                >
                  Subtotal
                </span>

                <span
                  style={{
                    color: '#fff',
                    fontWeight: 700
                  }}
                >
                  ৳
                  {subtotal.toLocaleString()}
                </span>

              </div>


              {/* CASHBACK */}

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  marginBottom: 14
                }}
              >

                <span
                  style={{
                    color:
                      'rgba(255,255,255,0.45)'
                  }}
                >
                  Total Cashback
                </span>

                <span
                  style={{
                    color: '#4ade80',
                    fontWeight: 700
                  }}
                >
                  -৳
                  {totalCashback.toLocaleString()}
                </span>

              </div>


              {/* SHIPPING */}

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  paddingBottom: 16,
                  borderBottom:
                    '1px solid rgba(255,255,255,0.08)'
                }}
              >

                <span
                  style={{
                    color:
                      'rgba(255,255,255,0.45)'
                  }}
                >
                  Shipping
                </span>

                <span
                  style={{
                    color: '#4ade80'
                  }}
                >
                  Free
                </span>

              </div>


              {/* NET */}

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  marginTop: 18,
                  marginBottom: 20
                }}
              >

                <span
                  style={{
                    color: '#fff',
                    fontWeight: 700
                  }}
                >
                  Net Cost
                </span>

                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: '#8b5cf6'
                  }}
                >
                  ৳
                  {netCost.toLocaleString()}
                </span>

              </div>


              {/* CASHBACK INFO */}

              {totalCashback > 0 && (

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background:
                      'rgba(124,58,237,0.06)',
                    border:
                      '1px solid rgba(124,58,237,0.18)',
                    marginBottom: 16
                  }}
                >

                  <p
                    style={{
                      fontSize: 12,
                      color:
                        'rgba(255,255,255,0.5)',
                      margin: 0
                    }}
                  >
                    💡 You pay{' '}
                    <strong
                      style={{
                        color: '#fff'
                      }}
                    >
                      ৳
                      {subtotal.toLocaleString()}
                    </strong>{' '}
                    now. Cashback of{' '}
                    <strong
                      style={{
                        color: '#4ade80'
                      }}
                    >
                      ৳
                      {totalCashback.toLocaleString()}
                    </strong>{' '}
                    releases after post verification.
                  </p>

                </div>

              )}


              {/* CHECKOUT */}

              {!showCheckout ? (

                <button
                  onClick={() =>
                    setShowCheckout(true)
                  }
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: 14,
                    fontSize: 14
                  }}
                >
                  Proceed to Checkout
                </button>

              ) : (

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                  }}
                >

                  {/* ADDRESS */}

                  <div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6
                      }}
                    >

                      <label
                        className="field-label"
                        style={{
                          margin: 0
                        }}
                      >
                        Shipping Address
                      </label>

                      <Link
                        to="/creator/profile"
                        style={{
                          fontSize: 11,
                          color: '#a78bfa',
                          textDecoration: 'none',
                          fontWeight: 600
                        }}
                      >
                        + Manage Saved Addresses
                      </Link>

                    </div>


                    {savedAddresses.length > 0 && (

                      <select
                        onChange={e => {

                          const selected =
                            savedAddresses.find(
                              a =>
                                a._id ===
                                e.target.value
                            )

                          if (selected) {

                            const formatted =
                              `${selected.fullName || user.name} (${selected.phone || user.phone})\n` +
                              `${selected.street}, ${selected.city}` +
                              `${selected.zip ? ', ' + selected.zip : ''}, ${selected.country}`

                            setAddress(
                              formatted
                            )
                          }

                        }}
                        className="field-select"
                        style={{
                          marginBottom: 8,
                          background: '#0b0f24',
                          color: '#fff'
                        }}
                      >

                        {savedAddresses.map(a => (

                          <option
                            key={a._id}
                            value={a._id}
                            style={{
                              background: '#0b0f24',
                              color: '#fff'
                            }}
                          >
                            {a.label}{' '}
                            {a.isDefault
                              ? '★ (Default)'
                              : ''}{' '}
                            — {a.street}, {a.city}
                          </option>

                        ))}

                      </select>

                    )}


                    <textarea
                      value={address}
                      onChange={e =>
                        setAddress(
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="House, Road, Area, City..."
                      className="field-input"
                      style={{
                        resize: 'none',
                        fontFamily: 'inherit'
                      }}
                    />

                  </div>


                  {/* PAYMENT */}

                  <div>

                    <label className="field-label">
                      Payment Method
                    </label>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginTop: 4
                      }}
                    >

                      {[
                        {
                          id: 'bkash',
                          label: '🔴 bKash',
                          desc: 'Mobile banking'
                        },
                        {
                          id: 'ssl',
                          label: '🟢 SSLCommerz',
                          desc: 'Card / Bank'
                        }
                      ].map(m => (

                        <button
                          key={m.id}
                          onClick={() =>
                            setPaymentMethod(
                              m.id
                            )
                          }
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            background:
                              paymentMethod === m.id
                                ? 'rgba(124,58,237,0.08)'
                                : 'rgba(255,255,255,0.03)',
                            border:
                              paymentMethod === m.id
                                ? '1px solid rgba(124,58,237,0.4)'
                                : '1px solid rgba(255,255,255,0.07)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: 'inherit'
                          }}
                        >

                          <span
                            style={{
                              fontSize: 20
                            }}
                          >
                            {m.label.split(' ')[0]}
                          </span>

                          <div
                            style={{
                              textAlign: 'left'
                            }}
                          >

                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color:
                                  paymentMethod === m.id
                                    ? '#fff'
                                    : 'rgba(255,255,255,0.5)',
                                margin: 0
                              }}
                            >
                              {m.label
                                .split(' ')
                                .slice(1)
                                .join(' ')}
                            </p>

                            <p
                              style={{
                                fontSize: 11,
                                color:
                                  'rgba(255,255,255,0.3)',
                                margin: 0
                              }}
                            >
                              {m.desc}
                            </p>

                          </div>

                        </button>

                      ))}

                    </div>

                  </div>


                  {/* PAY */}

                  <button
                    onClick={handleCheckout}
                    disabled={
                      placing ||
                      !address.trim()
                    }
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: 14,
                      fontSize: 14
                    }}
                  >
                    {placing
                      ? 'Placing Order…'
                      : `Pay ৳${subtotal.toLocaleString()} →`}
                  </button>


                  {/* BACK */}

                  <button
                    onClick={() =>
                      setShowCheckout(false)
                    }
                    className="btn-ghost"
                    style={{
                      width: '100%',
                      padding: '10px'
                    }}
                  >
                    ← Back
                  </button>

                </div>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

export default Cart