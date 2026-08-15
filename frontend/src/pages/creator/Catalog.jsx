import React, { useState, useEffect } from 'react'
import { getCampaigns } from '../../services/campaigns'

const CART_KEY = 'flextag_cart'

const Catalog = () => {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState('cashback')
  const [categories, setCategories] = useState(['All'])
  const [cartMessage, setCartMessage] = useState('')

  useEffect(() => {
    const timer = setTimeout(
      () => fetchCampaigns(),
      search ? 400 : 0
    )

    return () => clearTimeout(timer)
  }, [search, category, sortBy])

  const fetchCampaigns = async () => {
    setLoading(true)

    try {
      const params = {}

      if (category !== 'All') {
        params.category = category
      }

      if (search) {
        params.q = search
      }

      const data = await getCampaigns(params)

      let list = data.campaigns || []

      // Sort campaigns on frontend
      if (sortBy === 'cashback') {
        list.sort(
          (a, b) =>
            Number(b.cashbackRate || 0) -
            Number(a.cashbackRate || 0)
        )
      }

      if (sortBy === 'price_low') {
        list.sort(
          (a, b) =>
            Number(a.price || 0) -
            Number(b.price || 0)
        )
      }

      if (sortBy === 'price_high') {
        list.sort(
          (a, b) =>
            Number(b.price || 0) -
            Number(a.price || 0)
        )
      }

      setCampaigns(list)

      const categoryList = [
        'All',
        ...new Set(
          list
            .map(c => c.category)
            .filter(Boolean)
        )
      ]

      setCategories(categoryList)

    } catch (err) {
      console.error('Failed to load campaigns:', err)
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ADD CAMPAIGN TO CART
  // ─────────────────────────────────────────────────────────────
  const addToCart = (campaign) => {
    try {
      const oldCart = JSON.parse(
        localStorage.getItem(CART_KEY) || '[]'
      )

      const existingIndex = oldCart.findIndex(
        item =>
          item.campaignId === campaign._id ||
          item._id === campaign._id
      )

      if (existingIndex !== -1) {
        const updatedCart = [...oldCart]

        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          qty: Math.min(
            updatedCart[existingIndex].qty + 1,
            campaign.stockLeft
          )
        }

        localStorage.setItem(
          CART_KEY,
          JSON.stringify(updatedCart)
        )

        setCartMessage(
          `${campaign.title} quantity increased`
        )

      } else {
        const cartItem = {
          // IMPORTANT:
          // This is the Campaign ID
          _id: campaign._id,
          campaignId: campaign._id,

          name: campaign.product || campaign.title,
          title: campaign.title,

          brand: campaign.brand,
          brandId: campaign.brandId,

          category: campaign.category,

          price: Number(campaign.price) || 0,

          cashbackRate:
            Number(campaign.cashbackRate) || 0,

          stockLeft:
            Number(campaign.stockLeft) || 0,

          image: campaign.image || '',

          qty: 1
        }

        const updatedCart = [
          ...oldCart,
          cartItem
        ]

        localStorage.setItem(
          CART_KEY,
          JSON.stringify(updatedCart)
        )

        setCartMessage(
          `${campaign.title} added to cart`
        )
      }

      setTimeout(() => {
        setCartMessage('')
      }, 2500)

    } catch (err) {
      console.error('Cart error:', err)
      setCartMessage('Could not add item to cart')
    }
  }

  return (
    <div className="page-root">

      {/* ─────────────────────────────────────────────────────── */}
      {/* HEADER */}
      {/* ─────────────────────────────────────────────────────── */}

      <div className="page-header">

        <div className="page-label">
          <span>Creator Marketplace</span>
        </div>

        <h1 className="page-title">
          Shop Campaigns
        </h1>

        <p className="page-subtitle">
          Browse active campaigns and earn cashback by promoting products.
        </p>

      </div>

      {/* ─────────────────────────────────────────────────────── */}
      {/* CART MESSAGE */}
      {/* ─────────────────────────────────────────────────────── */}

      {cartMessage && (
        <div
          style={{
            marginBottom: 20,
            padding: '13px 18px',
            borderRadius: 12,
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.2)',
            color: '#4ade80',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          ✓ {cartMessage}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* FILTERS */}
      {/* ─────────────────────────────────────────────────────── */}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20
        }}
      >

        {/* SEARCH */}

        <div
          style={{
            flex: 1,
            minWidth: 220
          }}
        >
          <div
            style={{
              position: 'relative'
            }}
          >

            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}
            >
              <circle
                cx="11"
                cy="11"
                r="8"
              />

              <line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
              />
            </svg>

            <input
              value={search}
              onChange={e =>
                setSearch(e.target.value)
              }
              placeholder="Search campaigns or products..."
              className="field-input"
              style={{
                paddingLeft: 42
              }}
            />

          </div>
        </div>

        {/* SORT */}

        <select
          value={sortBy}
          onChange={e =>
            setSortBy(e.target.value)
          }
          className="field-select"
          style={{
            width: 'auto',
            minWidth: 180
          }}
        >

          <option
            value="cashback"
            style={{
              background: '#0d0d20'
            }}
          >
            Highest Cashback
          </option>

          <option
            value="price_low"
            style={{
              background: '#0d0d20'
            }}
          >
            Price: Low → High
          </option>

          <option
            value="price_high"
            style={{
              background: '#0d0d20'
            }}
          >
            Price: High → Low
          </option>

        </select>

      </div>

      {/* ─────────────────────────────────────────────────────── */}
      {/* CATEGORY */}
      {/* ─────────────────────────────────────────────────────── */}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 24
        }}
      >

        {categories.map(c => (

          <button
            key={c}
            onClick={() =>
              setCategory(c)
            }
            style={{
              padding: '8px 18px',
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',

              background:
                category === c
                  ? 'linear-gradient(135deg,#7c3aed,#06b6d4)'
                  : 'rgba(255,255,255,0.04)',

              color:
                category === c
                  ? '#fff'
                  : 'rgba(255,255,255,0.45)',

              border:
                category === c
                  ? 'none'
                  : '1px solid rgba(255,255,255,0.08)',

              boxShadow:
                category === c
                  ? '0 0 20px rgba(124,58,237,0.3)'
                  : 'none'
            }}
          >
            {c}
          </button>

        ))}

      </div>

      {/* ─────────────────────────────────────────────────────── */}
      {/* LOADING */}
      {/* ─────────────────────────────────────────────────────── */}

      {loading ? (

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '80px 0'
          }}
        >
          <div className="spinner" />
        </div>

      ) : campaigns.length === 0 ? (

        /* EMPTY */

        <div className="empty-state">

          <p>🔍</p>

          <p>
            No active campaigns found.
          </p>

          <p
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 8
            }}
          >
            Try another search or category.
          </p>

        </div>

      ) : (

        /* ─────────────────────────────────────────────────────── */
        /* CAMPAIGN GRID */
        /* ─────────────────────────────────────────────────────── */

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill,minmax(220px,1fr))',
            gap: 16
          }}
        >

          {campaigns.map(c => {

            const price =
              Number(c.price) || 0

            const cashback =
              Number(c.cashbackRate) || 0

            const netPrice =
              Math.round(
                price * (1 - cashback / 100)
              )

            const stock =
              Number(c.stockLeft) || 0

            return (

              <div
                key={c._id}
                style={{
                  borderRadius: 18,
                  background:
                    'rgba(255,255,255,0.03)',
                  border:
                    '1px solid rgba(255,255,255,0.07)',
                  overflow: 'hidden',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor =
                    'rgba(124,58,237,0.3)'

                  e.currentTarget.style.transform =
                    'translateY(-3px)'

                  e.currentTarget.style.boxShadow =
                    '0 16px 40px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor =
                    'rgba(255,255,255,0.07)'

                  e.currentTarget.style.transform =
                    'translateY(0)'

                  e.currentTarget.style.boxShadow =
                    'none'
                }}
              >

                {/* IMAGE */}

                <div
                  style={{
                    aspectRatio: '1',
                    background:
                      'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 48,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >

                  {c.image ? (

                    <img
                      src={c.image}
                      alt={c.product || c.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />

                  ) : (

                    <span>📦</span>

                  )}

                  {/* CASHBACK */}

                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      padding: '4px 10px',
                      borderRadius: 8,
                      background:
                        'linear-gradient(135deg,#7c3aed,#06b6d4)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800
                    }}
                  >
                    {cashback}% back
                  </div>

                  {/* OUT OF STOCK */}

                  {stock <= 0 && (

                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'rgba(0,0,0,0.65)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >

                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            'rgba(255,255,255,0.5)'
                        }}
                      >
                        Out of Stock
                      </span>

                    </div>

                  )}

                </div>

                {/* INFO */}

                <div
                  style={{
                    padding: 16
                  }}
                >

                  <p
                    style={{
                      fontSize: 11,
                      color:
                        'rgba(255,255,255,0.3)',
                      marginBottom: 4
                    }}
                  >
                    {c.brand}
                  </p>

                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#fff',
                      marginBottom: 5
                    }}
                  >
                    {c.title}
                  </p>

                  <p
                    style={{
                      fontSize: 12,
                      color:
                        'rgba(255,255,255,0.4)',
                      marginBottom: 12
                    }}
                  >
                    Product: {c.product}
                  </p>

                  {/* PRICE */}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent:
                        'space-between',
                      marginBottom: 12
                    }}
                  >

                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: '#fff'
                      }}
                    >
                      ৳{price.toLocaleString()}
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        color: '#4ade80'
                      }}
                    >
                      Net: ৳
                      {netPrice.toLocaleString()}
                    </span>

                  </div>

                  {/* STOCK */}

                  <p
                    style={{
                      fontSize: 11,
                      color:
                        stock > 0
                          ? 'rgba(74,222,128,0.7)'
                          : 'rgba(248,113,113,0.7)',
                      marginBottom: 12
                    }}
                  >
                    {stock > 0
                      ? `${stock} available`
                      : 'Out of stock'}
                  </p>

                  {/* ADD TO CART */}

                  <button
                    disabled={stock <= 0}
                    onClick={() =>
                      addToCart(c)
                    }
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: 'none',

                      background:
                        stock <= 0
                          ? 'rgba(255,255,255,0.05)'
                          : 'linear-gradient(135deg,#7c3aed,#06b6d4)',

                      color:
                        stock <= 0
                          ? 'rgba(255,255,255,0.25)'
                          : '#fff',

                      fontSize: 13,
                      fontWeight: 700,
                      cursor:
                        stock <= 0
                          ? 'not-allowed'
                          : 'pointer'
                    }}
                  >
                    {stock <= 0
                      ? 'Out of Stock'
                      : 'Add to Cart'}
                  </button>

                </div>

              </div>

            )
          })}

        </div>

      )}

    </div>
  )
}

export default Catalog