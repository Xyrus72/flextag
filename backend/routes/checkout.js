const express            = require('express')
const router             = express.Router()
const SSLCommerzPayment  = require('sslcommerz-lts')
const Order              = require('../models/Order')
const Campaign           = require('../models/Campaign')
const { requireAuth, requireRole } = require('../middleware/auth')

const STORE_ID   = process.env.SSLCZ_STORE_ID
const STORE_PASS = process.env.SSLCZ_STORE_PASSWORD
const IS_LIVE    = process.env.SSLCZ_IS_LIVE === 'true'
const FRONTEND   = process.env.FRONTEND_URL || 'http://localhost:5173'
const BACKEND    = process.env.BACKEND_URL  || 'http://localhost:5000'

// helper to generate unique order & transaction IDs
const genOrderId = () => 'ORD-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)
const genTranId  = () => 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)

// ── POST /api/checkout/init ────────────────────────────────────────────────
// Creator submits cart items + address → we create pending orders → init SSLCommerz
router.post('/init', requireAuth, requireRole('creator'), async (req, res) => {
  try {
    const { items, address } = req.body
    // items: [{ campaignId, qty }]

    if (!items || !items.length || !address) {
      return res.status(400).json({ message: 'items and address are required.' })
    }

    // Validate all campaigns and compute total
    let totalAmount = 0
    const orderDocs = []

    for (const item of items) {
      const campaign = await Campaign.findById(item.campaignId)
      if (!campaign || campaign.status !== 'active') {
        return res.status(400).json({ message: `Campaign "${item.campaignId}" not found or inactive.` })
      }
      const qty = Number(item.qty) || 1
      if (campaign.stockLeft < qty) {
        return res.status(400).json({ message: `Insufficient stock for "${campaign.product}".` })
      }

      const itemTotal      = campaign.price * qty
      const cashbackAmount = Math.round(itemTotal * campaign.cashbackRate / 100)
      totalAmount += itemTotal

      orderDocs.push({
        orderId:       genOrderId(),
        creatorId:     req.user._id,
        brandId:       campaign.brandId,
        campaignId:    campaign._id,
        product:       campaign.product,
        brand:         campaign.brand,
        image:         campaign.image || '📦',
        qty,
        price:         campaign.price,
        cashbackRate:  campaign.cashbackRate,
        cashbackAmount,
        total:         itemTotal,
        address:       address.trim(),
        paymentMethod: 'sslcommerz',
        paymentStatus: 'pending',
        status:        'processing',
      })
    }

    // Create all orders with pending payment
    const createdOrders = await Order.insertMany(orderDocs)
    const orderIds = createdOrders.map(o => o._id.toString())
    const tran_id = genTranId()

    // Tag orders with the shared transaction ID
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { transactionId: tran_id }
    )

    // Build SSLCommerz init data
    const sslData = {
      total_amount:     totalAmount,
      currency:         'BDT',
      tran_id,
      success_url:      `${BACKEND}/api/checkout/success`,
      fail_url:         `${BACKEND}/api/checkout/fail`,
      cancel_url:       `${BACKEND}/api/checkout/cancel`,
      ipn_url:          `${BACKEND}/api/checkout/ipn`,
      shipping_method:  'Courier',
      product_name:     createdOrders.map(o => o.product).join(', '),
      product_category: 'general',
      product_profile:  'general',
      cus_name:         req.user.name,
      cus_email:        req.user.email,
      cus_add1:         address.trim(),
      cus_city:         'Dhaka',
      cus_postcode:     '1000',
      cus_country:      'Bangladesh',
      cus_phone:        req.user.phone || '01700000000',
      ship_name:        req.user.name,
      ship_add1:        address.trim(),
      ship_city:        'Dhaka',
      ship_postcode:    '1000',
      ship_country:     'Bangladesh',
      // Pass order IDs in value_a so we can retrieve them in callbacks
      value_a:          JSON.stringify(orderIds),
    }

    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASS, IS_LIVE)
    const apiResponse = await sslcz.init(sslData)

    if (apiResponse?.GatewayPageURL) {
      res.json({ url: apiResponse.GatewayPageURL, tran_id })
    } else {
      // SSLCommerz returned an error — clean up pending orders
      await Order.deleteMany({ _id: { $in: orderIds } })
      console.error('[checkout init] SSLCommerz error:', apiResponse)
      res.status(502).json({
        message: 'Payment gateway error. Please check SSLCommerz credentials.',
        detail:  apiResponse?.failedreason || 'Unknown error',
      })
    }
  } catch (err) {
    console.error('[checkout init]', err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// ── POST /api/checkout/success — SSLCommerz redirects here on payment success
router.post('/success', async (req, res) => {
  try {
    const { tran_id, val_id, value_a } = req.body

    if (!tran_id || !val_id) {
      return res.redirect(`${FRONTEND}/creator/checkout/fail?reason=missing_data`)
    }

    // Validate the transaction with SSLCommerz
    const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASS, IS_LIVE)
    const validation = await sslcz.validate({ val_id })

    if (validation?.status !== 'VALID' && validation?.status !== 'VALIDATED') {
      return res.redirect(`${FRONTEND}/creator/checkout/fail?reason=validation_failed`)
    }

    // Parse order IDs
    let orderIds = []
    try { orderIds = JSON.parse(value_a || '[]') } catch { /* ignore */ }

    // Update orders — mark as paid
    const orders = await Order.find({ transactionId: tran_id })
    for (const order of orders) {
      order.paymentStatus = 'paid'
      order.valId         = val_id
      order.paymentDetails = {
        bank_tran_id: req.body.bank_tran_id,
        card_type:    req.body.card_type,
        card_brand:   req.body.card_brand,
        store_amount: req.body.store_amount,
      }
      await order.save()
    }

    // Decrement campaign stock for each order
    for (const order of orders) {
      await Campaign.findByIdAndUpdate(order.campaignId, {
        $inc: { stockLeft: -order.qty, totalOrders: 1 },
      })
    }

    res.redirect(`${FRONTEND}/creator/checkout/success?tran_id=${tran_id}`)
  } catch (err) {
    console.error('[checkout success]', err)
    res.redirect(`${FRONTEND}/creator/checkout/fail?reason=server_error`)
  }
})

// ── POST /api/checkout/fail — SSLCommerz redirects here on payment failure
router.post('/fail', async (req, res) => {
  try {
    const { tran_id } = req.body

    if (tran_id) {
      await Order.updateMany(
        { transactionId: tran_id, paymentStatus: 'pending' },
        { paymentStatus: 'failed', status: 'cancelled' }
      )
    }

    res.redirect(`${FRONTEND}/creator/checkout/fail?reason=payment_failed`)
  } catch (err) {
    console.error('[checkout fail]', err)
    res.redirect(`${FRONTEND}/creator/checkout/fail?reason=server_error`)
  }
})

// ── POST /api/checkout/cancel — SSLCommerz redirects here if user cancels
router.post('/cancel', async (req, res) => {
  try {
    const { tran_id } = req.body

    // Delete the pending orders since user cancelled
    if (tran_id) {
      await Order.deleteMany({ transactionId: tran_id, paymentStatus: 'pending' })
    }

    res.redirect(`${FRONTEND}/creator/cart`)
  } catch (err) {
    console.error('[checkout cancel]', err)
    res.redirect(`${FRONTEND}/creator/cart`)
  }
})

// ── POST /api/checkout/ipn — SSLCommerz server-to-server notification (backup)
router.post('/ipn', async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body

    if (status === 'VALID' || status === 'VALIDATED') {
      const sslcz = new SSLCommerzPayment(STORE_ID, STORE_PASS, IS_LIVE)
      const validation = await sslcz.validate({ val_id })

      if (validation?.status === 'VALID' || validation?.status === 'VALIDATED') {
        await Order.updateMany(
          { transactionId: tran_id, paymentStatus: 'pending' },
          { paymentStatus: 'paid', valId: val_id }
        )
      }
    }

    res.status(200).json({ message: 'IPN received.' })
  } catch (err) {
    console.error('[checkout IPN]', err)
    res.status(200).json({ message: 'IPN error handled.' })
  }
})

module.exports = router
