import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { getOrders } from '../../services/orders'
import { submitPost } from '../../services/posts'
import { generateCaption as generateAICaption } from '../../services/ai'


const PostSubmission = () => {

  const location = useLocation()
  const preState = location.state || {}

  // ─────────────────────────────────────────────────────────────
  // POST SUBMISSION STATE
  // ─────────────────────────────────────────────────────────────

  const [postUrl, setPostUrl] = useState(
    ''
  )

  const [selectedOrderId, setSelectedOrderId] =
    useState(
      preState.orderId || ''
    )

  const [platform, setPlatform] =
    useState('instagram')

  const [orders, setOrders] =
    useState([])

  const [loadingOrders, setLoadingOrders] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [submitted, setSubmitted] =
    useState(false)

  const [error, setError] =
    useState('')


  // ─────────────────────────────────────────────────────────────
  // AI STATE
  // ─────────────────────────────────────────────────────────────

  const [aiPrompt, setAiPrompt] =
    useState('')

  const [aiResponse, setAiResponse] =
    useState('')

  const [aiLoading, setAiLoading] =
    useState(false)

  const [aiError, setAiError] =
    useState('')


  // ─────────────────────────────────────────────────────────────
  // LOAD DELIVERED ORDERS
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {

    setLoadingOrders(true)

    getOrders({
      status: 'delivered'
    })

      .then(data => {

        setOrders(
          data.orders || []
        )

      })

      .catch(err => {

        console.error(
          'Failed to load orders:',
          err
        )

        setError(
          'Failed to load delivered orders.'
        )

      })

      .finally(() => {

        setLoadingOrders(false)

      })

  }, [])


  // ─────────────────────────────────────────────────────────────
  // FIND SELECTED ORDER
  // ─────────────────────────────────────────────────────────────

  const selectedOrder =
    orders.find(
      order =>
        order._id === selectedOrderId
    )


  // ─────────────────────────────────────────────────────────────
  // WHEN ORDER CHANGES
  // CLEAR OLD AI RESPONSE
  // ─────────────────────────────────────────────────────────────

  const handleOrderChange = e => {

    const orderId =
      e.target.value

    setSelectedOrderId(
      orderId
    )

    setAiResponse('')
    setAiError('')
    setError('')

  }


  // ─────────────────────────────────────────────────────────────
  // AI CAPTION GENERATOR
  // REAL API CALL
  // ─────────────────────────────────────────────────────────────

  const generateCaption = async () => {

    // Make sure an order is selected
    if (!selectedOrderId) {

      setAiError(
        'Please select an order first.'
      )

      return

    }


    // Make sure language is selected
    if (!aiPrompt) {

      setAiError(
        'Please select a language.'
      )

      return

    }


    // Make sure order exists
    if (!selectedOrder) {

      setAiError(
        'Selected order could not be found.'
      )

      return

    }


    setAiLoading(true)
    setAiResponse('')
    setAiError('')


    try {

      // Get product information
      const product =
        selectedOrder.product ||
        'this product'


      // Get brand information
      const brand =
        selectedOrder.brand ||
        'our partner brand'


      // Call our backend AI API
      const data =
        await generateAICaption({

          product,

          brand,

          language:
            aiPrompt,

          platform

        })


      // Check response
      if (!data || !data.caption) {

        throw new Error(
          'AI did not return a caption.'
        )

      }


      // Show generated caption
      setAiResponse(
        data.caption
      )


    } catch (err) {

      console.error(
        'AI caption error:',
        err
      )


      const message =
        err.response?.data?.message ||
        err.message ||
        'Failed to generate caption.'


      setAiError(
        message
      )


    } finally {

      setAiLoading(false)

    }

  }


  // ─────────────────────────────────────────────────────────────
  // SUBMIT POST
  // ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {

    if (!postUrl.trim()) {

      setError(
        'Please enter your post URL.'
      )

      return

    }


    if (!selectedOrderId) {

      setError(
        'Please select an order.'
      )

      return

    }


    if (!selectedOrder) {

      setError(
        'Selected order could not be found.'
      )

      return

    }


    setSubmitting(true)
    setError('')


    try {

      await submitPost({

        orderId:
          selectedOrderId,

        campaignId:
          selectedOrder?.campaignId?._id ||
          selectedOrder?.campaignId,

        postUrl:
          postUrl.trim(),

        platform

      })


      setSubmitted(true)


    } catch (err) {

      console.error(
        'Post submission error:',
        err
      )


      setError(
        err.response?.data?.message ||
        'Failed to submit. Please try again.'
      )


    } finally {

      setSubmitting(false)

    }

  }


  // ─────────────────────────────────────────────────────────────
  // COPY AI CAPTION
  // ─────────────────────────────────────────────────────────────

  const copyCaption = async () => {

    if (!aiResponse) {
      return
    }


    try {

      await navigator.clipboard.writeText(
        aiResponse
      )

    } catch (err) {

      console.error(
        'Copy failed:',
        err
      )

    }

  }


  // ─────────────────────────────────────────────────────────────
  // SUBMITTED SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────

  if (submitted) {

    return (

      <div
        className="
          p-4
          lg:p-8
          min-h-screen
          flex
          items-center
          justify-center
        "
      >

        <div
          className="
            text-center
            max-w-md
          "
        >

          {/* Success Icon */}

          <div
            className="
              w-20
              h-20
              rounded-full
              bg-emerald-500/15
              flex
              items-center
              justify-center
              mx-auto
              mb-6
            "
          >

            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
            >

              <path
                d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
              />

              <polyline
                points="22 4 12 14.01 9 11.01"
              />

            </svg>

          </div>


          <h2
            className="
              text-2xl
              font-bold
              text-white
              mb-2
            "
          >
            Post Submitted!
          </h2>


          <p
            className="
              text-zinc-400
              mb-6
            "
          >
            Your post is now under review.
            Keep it live for the full retention
            period to earn your cashback.
          </p>


          <div
            className="
              p-4
              rounded-xl
              bg-white/5
              border
              border-white/5
              text-left
              mb-6
            "
          >

            <div
              className="
                flex
                justify-between
                text-sm
                mb-2
              "
            >

              <span
                className="text-zinc-500"
              >
                Status
              </span>

              <span
                className="
                  text-yellow-400
                  font-semibold
                "
              >
                In Review
              </span>

            </div>


            <div
              className="
                flex
                justify-between
                text-sm
                mb-2
              "
            >

              <span
                className="text-zinc-500"
              >
                Platform
              </span>

              <span
                className="
                  text-white
                  capitalize
                "
              >
                {platform}
              </span>

            </div>


            <div
              className="
                flex
                justify-between
                text-sm
              "
            >

              <span
                className="text-zinc-500"
              >
                Post URL
              </span>

              <span
                className="
                  text-blue-400
                  text-xs
                  truncate
                  max-w-[200px]
                "
              >
                {postUrl}
              </span>

            </div>

          </div>


          <button
            onClick={() => {

              setSubmitted(false)

              setPostUrl('')

              setSelectedOrderId('')

              setAiPrompt('')

              setAiResponse('')

              setAiError('')

              setError('')

            }}

            className="
              px-6
              py-3
              rounded-xl
              bg-white/5
              border
              border-white/10
              text-zinc-300
              font-semibold
              hover:bg-white/10
              transition-all
            "
          >
            Submit Another
          </button>

        </div>

      </div>

    )

  }


  // ─────────────────────────────────────────────────────────────
  // MAIN PAGE
  // ─────────────────────────────────────────────────────────────

  return (

    <div className="page-root">

      <h1
        className="
          text-2xl
          lg:text-3xl
          font-bold
          text-white
          mb-2
        "
      >
        Submit Post
      </h1>


      <p
        className="
          text-zinc-500
          mb-8
        "
      >
        Submit your post URL for cashback verification
      </p>


      <div
        className="
          grid
          lg:grid-cols-2
          gap-6
        "
      >

        {/* ===================================================== */}
        {/* POST SUBMISSION FORM */}
        {/* ===================================================== */}

        <div
          className="
            rounded-2xl
            bg-white/[0.03]
            border
            border-white/5
            p-6
          "
        >

          <h2
            className="
              text-lg
              font-bold
              text-white
              mb-5
            "
          >
            Post Details
          </h2>


          {/* General Error */}

          {error && (

            <p
              className="
                text-xs
                text-red-400
                mb-4
                p-3
                rounded-lg
                bg-red-500/10
                border
                border-red-500/20
              "
            >
              {error}
            </p>

          )}


          <div
            className="space-y-4"
          >

            {/* SELECT ORDER */}

            <div>

              <label
                className="
                  text-xs
                  text-zinc-500
                  font-medium
                  uppercase
                  tracking-wider
                  block
                  mb-1.5
                "
              >
                Select Order
              </label>


              {loadingOrders ? (

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-zinc-500
                    text-sm
                  "
                >

                  <div
                    className="
                      w-4
                      h-4
                      rounded-full
                      border
                      border-zinc-500
                      border-t-transparent
                      animate-spin
                    "
                  />

                  <span>
                    Loading orders...
                  </span>

                </div>

              ) : (

                <select
                  value={selectedOrderId}
                  onChange={handleOrderChange}

                  className="
                    w-full
                    px-4
                    py-3
                    rounded-xl
                    bg-white/5
                    border
                    border-white/10
                    text-white
                    text-sm
                    focus:border-violet-500
                    outline-none
                  "
                >

                  <option value="">
                    Choose a delivered order...
                  </option>


                  {orders.map(order => (

                    <option
                      key={order._id}
                      value={order._id}
                    >
                      {order.product}
                      {' — '}
                      {order.brand}
                      {' ('}
                      {order.orderId}
                      {')'}
                    </option>

                  ))}

                </select>

              )}


              {orders.length === 0 &&
                !loadingOrders && (

                  <p
                    className="
                      text-xs
                      text-zinc-600
                      mt-1
                    "
                  >
                    No delivered orders found.
                    Orders must be delivered before
                    you can submit.
                  </p>

                )}

            </div>


            {/* PLATFORM */}

            <div>

              <label
                className="
                  text-xs
                  text-zinc-500
                  font-medium
                  uppercase
                  tracking-wider
                  block
                  mb-1.5
                "
              >
                Platform
              </label>


              <div
                className="flex gap-2"
              >

                {[
                  'instagram',
                  'tiktok',
                  'facebook'
                ].map(p => (

                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setPlatform(p)
                    }

                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s',
                      border: 'none',

                      background:
                        platform === p
                          ? 'rgba(124,58,237,0.12)'
                          : 'rgba(255,255,255,0.04)',

                      color:
                        platform === p
                          ? '#a78bfa'
                          : 'rgba(255,255,255,0.4)',

                      outline:
                        platform === p
                          ? '1px solid rgba(124,58,237,0.4)'
                          : '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    {p}
                  </button>

                ))}

              </div>

            </div>


            {/* POST URL */}

            <div>

              <label
                className="
                  text-xs
                  text-zinc-500
                  font-medium
                  uppercase
                  tracking-wider
                  block
                  mb-1.5
                "
              >
                Post URL
              </label>


              <input
                value={postUrl}
                onChange={e =>
                  setPostUrl(
                    e.target.value
                  )
                }

                placeholder="
                  https://www.instagram.com/p/...
                "

                className="field-input"
              />


              <p
                className="
                  text-xs
                  text-zinc-600
                  mt-1
                "
              >
                Your post must be public and
                meet campaign requirements
              </p>

            </div>


            {/* SUBMIT */}

            <button
              type="button"
              onClick={handleSubmit}

              disabled={
                !postUrl.trim() ||
                !selectedOrderId ||
                submitting
              }

              className="btn-primary"
              style={{
                width: '100%',
                padding: 14
              }}
            >

              {submitting
                ? 'Submitting…'
                : 'Submit for Verification'}

            </button>

          </div>

        </div>


        {/* ===================================================== */}
        {/* AI CREATIVE ASSISTANT */}
        {/* ===================================================== */}

        <div
          className="
            rounded-2xl
            bg-white/[0.03]
            border
            border-white/5
            p-6
          "
        >

          <h2
            className="
              text-lg
              font-bold
              text-white
              mb-1
            "
          >
            AI Creative Assistant
          </h2>


          <p
            className="
              text-xs
              text-zinc-500
              mb-5
            "
          >
            Generate captions & hashtag ideas
          </p>


          <div
            className="space-y-4"
          >

            {/* LANGUAGE */}

            <div>

              <label
                className="
                  text-xs
                  text-zinc-500
                  font-medium
                  uppercase
                  tracking-wider
                  block
                  mb-1.5
                "
              >
                Language
              </label>


              <div
                className="
                  grid
                  grid-cols-3
                  gap-2
                "
              >

                {[
                  {
                    id: 'bangla',
                    label: 'বাংলা'
                  },
                  {
                    id: 'english',
                    label: 'English'
                  },
                  {
                    id: 'banglish',
                    label: 'Banglish'
                  }
                ].map(language => (

                  <button
                    key={language.id}
                    type="button"

                    onClick={() => {

                      setAiPrompt(
                        language.id
                      )

                      setAiResponse('')
                      setAiError('')

                    }}

                    className={`
                      py-2.5
                      rounded-xl
                      text-sm
                      font-semibold
                      transition-all

                      ${
                        aiPrompt === language.id

                          ? 'bg-violet-500/15 border border-violet-500/30 text-violet-400'

                          : 'bg-white/5 border border-white/5 text-zinc-500 hover:bg-white/10'
                      }
                    `}
                  >
                    {language.label}
                  </button>

                ))}

              </div>

            </div>


            {/* AI ERROR */}

            {aiError && (

              <div
                className="
                  p-3
                  rounded-xl
                  bg-red-500/10
                  border
                  border-red-500/20
                  text-red-400
                  text-xs
                "
              >
                {aiError}
              </div>

            )}


            {/* GENERATE BUTTON */}

            <button
              type="button"
              onClick={generateCaption}

              disabled={
                !aiPrompt ||
                aiLoading ||
                !selectedOrderId
              }

              className="
                w-full
                py-3
                rounded-xl
                bg-violet-500/15
                border
                border-violet-500/30
                text-violet-400
                font-semibold
                hover:bg-violet-500/25
                transition-all
                disabled:opacity-30
                disabled:cursor-not-allowed
              "
            >

              {aiLoading
                ? '✨ Generating...'
                : '✨ Generate Caption'}

            </button>


            {/* NO ORDER */}

            {!selectedOrderId && (

              <p
                className="
                  text-xs
                  text-zinc-600
                "
              >
                Select an order first to
                generate a relevant caption.
              </p>

            )}


            {/* GENERATED CAPTION */}

            {aiResponse && (

              <div
                className="
                  p-4
                  rounded-xl
                  bg-white/5
                  border
                  border-white/5
                "
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    mb-2
                  "
                >

                  <span
                    className="
                      text-xs
                      text-zinc-500
                      font-medium
                      uppercase
                      tracking-wider
                    "
                  >
                    Generated Caption
                  </span>


                  <button
                    type="button"
                    onClick={copyCaption}

                    className="
                      text-xs
                      text-violet-400
                      hover:text-violet-300
                    "
                  >
                    Copy
                  </button>

                </div>


                <p
                  className="
                    text-sm
                    text-zinc-300
                    whitespace-pre-wrap
                    leading-relaxed
                  "
                >
                  {aiResponse}
                </p>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>

  )

}


export default PostSubmission