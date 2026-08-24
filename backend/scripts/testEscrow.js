const path = require('path')

// Load backend/.env even if this script is started
// from the main Flextag folder.
require('dotenv').config({
  path: path.join(__dirname, '../.env')
})

const mongoose = require('mongoose')

const User = require('../models/User')
const Campaign = require('../models/Campaign')
const Order = require('../models/Order')
const Post = require('../models/Post')
const Transaction = require('../models/Transaction')

const {
  releaseExpiredEscrows
} = require('../services/escrowService')


// ============================================================
// MODULE 3 - MEMBER 4
// ESCROW PAYOUT TEST
//
// This test will:
//
// 1. Create temporary creator
// 2. Create temporary brand
// 3. Create temporary campaign
// 4. Create temporary order
// 5. Create approved post with expired retention
// 6. Create pending cashback transaction
// 7. Run escrow service
// 8. Verify cashback was released
// 9. Delete all temporary data
// ============================================================


async function runTest() {

  let creator = null
  let brand = null
  let campaign = null
  let order = null
  let post = null
  let transaction = null


  try {

    console.log('')
    console.log('============================================')
    console.log('MODULE 3 - MEMBER 4 ESCROW TEST')
    console.log('============================================')
    console.log('')


    // ========================================================
    // CONNECT TO MONGODB
    // ========================================================

    console.log('1️⃣ Connecting to MongoDB...')

    await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000
      }
    )

    console.log('✅ MongoDB connected')
    console.log('')


    // ========================================================
    // UNIQUE TEST ID
    // ========================================================

    const testId = Date.now()


    // ========================================================
    // CREATE TEST BRAND
    // ========================================================

    console.log('2️⃣ Creating temporary brand...')

    brand = await User.create({

      name:
        'Module 3 Test Brand',

      email:
        `module3-brand-${testId}@flextag-test.com`,

      password:
        'temporary-test-password',

      role:
        'brand',

      companyName:
        'Module 3 Test Brand',

      isVerified:
        true

    })

    console.log(
      `✅ Brand created: ${brand._id}`
    )

    console.log('')


    // ========================================================
    // CREATE TEST CREATOR
    // ========================================================

    console.log('3️⃣ Creating temporary creator...')

    creator = await User.create({

      name:
        'Module 3 Test Creator',

      email:
        `module3-creator-${testId}@flextag-test.com`,

      password:
        'temporary-test-password',

      role:
        'creator',

      instagramHandle:
        '@module3_test',

      followersCount:
        5000,

      totalEarnings:
        100,

      completedCampaigns:
        2

    })

    console.log(
      `✅ Creator created: ${creator._id}`
    )

    console.log(
      `Starting earnings: BDT ${creator.totalEarnings}`
    )

    console.log(
      `Starting completed campaigns: ${creator.completedCampaigns}`
    )

    console.log('')


    // ========================================================
    // CREATE TEST CAMPAIGN
    // ========================================================

    console.log('4️⃣ Creating temporary campaign...')

    campaign = await Campaign.create({

      title:
        'Module 3 Escrow Test Campaign',

      brand:
        'Module 3 Test Brand',

      brandId:
        brand._id,

      product:
        'Test Product',

      category:
        'Test',

      price:
        1000,

      cashbackRate:
        50,

      stock:
        10,

      stockLeft:
        9,

      retentionDays:
        7,

      status:
        'active'

    })

    console.log(
      `✅ Campaign created: ${campaign._id}`
    )

    console.log('')


    // ========================================================
    // CREATE TEST ORDER
    // ========================================================

    console.log('5️⃣ Creating temporary order...')

    order = await Order.create({

      orderId:
        `TEST-ORDER-${testId}`,

      creatorId:
        creator._id,

      brandId:
        brand._id,

      campaignId:
        campaign._id,

      product:
        'Test Product',

      brand:
        'Module 3 Test Brand',

      qty:
        1,

      price:
        1000,

      cashbackRate:
        50,

      cashbackAmount:
        500,

      total:
        1000,

      status:
        'delivered',

      cashbackReleased:
        false

    })

    console.log(
      `✅ Order created: ${order._id}`
    )

    console.log(
      `Cashback amount: BDT ${order.cashbackAmount}`
    )

    console.log('')


    // ========================================================
    // CREATE EXPIRED RETENTION DEADLINE
    // ========================================================

    const expiredDeadline =
      new Date(
        Date.now() - 60 * 1000
      )


    // ========================================================
    // CREATE APPROVED TEST POST
    // ========================================================

    console.log(
      '6️⃣ Creating approved post with expired retention...'
    )

    post = await Post.create({

      creatorId:
        creator._id,

      campaignId:
        campaign._id,

      orderId:
        order._id,

      postUrl:
        'https://instagram.com/p/module3-test',

      platform:
        'instagram',

      status:
        'approved',

      retentionDeadline:
        expiredDeadline,

      cashbackReleased:
        false,

      likes:
        100,

      comments:
        20,

      views:
        1000,

      estimatedReach:
        800

    })

    console.log(
      `✅ Post created: ${post._id}`
    )

    console.log(
      `Retention deadline: ${post.retentionDeadline}`
    )

    console.log('')


    // ========================================================
    // CREATE PENDING ESCROW TRANSACTION
    // ========================================================

    console.log(
      '7️⃣ Creating pending escrow transaction...'
    )

    transaction =
      await Transaction.create({

        userId:
          creator._id,

        type:
          'cashback',

        amount:
          500,

        desc:
          'Cashback in escrow for Module 3 Escrow Test Campaign',

        status:
          'pending',

        orderId:
          order._id,

        postId:
          post._id

      })

    console.log(
      `✅ Transaction created: ${transaction._id}`
    )

    console.log(
      `Before release status: ${transaction.status}`
    )

    console.log('')


    // ========================================================
    // RUN YOUR ESCROW SERVICE
    // ========================================================

    console.log(
      '8️⃣ Running releaseExpiredEscrows()...'
    )

    const result =
      await releaseExpiredEscrows()

    console.log(
      `✅ Escrow checker finished`
    )

    console.log(
      `Released payments: ${result.released}`
    )

    console.log('')


    // ========================================================
    // RELOAD EVERYTHING FROM DATABASE
    // ========================================================

    transaction =
      await Transaction.findById(
        transaction._id
      )

    order =
      await Order.findById(
        order._id
      )

    post =
      await Post.findById(
        post._id
      )

    creator =
      await User.findById(
        creator._id
      )


    // ========================================================
    // SHOW RESULTS
    // ========================================================

    console.log('============================================')
    console.log('TEST RESULTS')
    console.log('============================================')

    console.log(
      `Transaction status: ${transaction.status}`
    )

    console.log(
      `Post cashbackReleased: ${post.cashbackReleased}`
    )

    console.log(
      `Order cashbackReleased: ${order.cashbackReleased}`
    )

    console.log(
      `Creator earnings: BDT ${creator.totalEarnings}`
    )

    console.log(
      `Completed campaigns: ${creator.completedCampaigns}`
    )

    console.log('')


    // ========================================================
    // VERIFY EXPECTED RESULT
    // ========================================================

    const transactionPassed =
      transaction.status === 'completed'

    const postPassed =
      post.cashbackReleased === true

    const orderPassed =
      order.cashbackReleased === true

    const earningsPassed =
      creator.totalEarnings === 600

    const campaignsPassed =
      creator.completedCampaigns === 3

    const releaseCountPassed =
      result.released >= 1


    // ========================================================
    // FINAL RESULT
    // ========================================================

    if (
      transactionPassed &&
      postPassed &&
      orderPassed &&
      earningsPassed &&
      campaignsPassed &&
      releaseCountPassed
    ) {

      console.log('🎉 ========================================')
      console.log('🎉 ESCROW TEST PASSED')
      console.log('🎉 ========================================')

      console.log('')

      console.log(
        '✅ Pending cashback became completed'
      )

      console.log(
        '✅ Post marked cashbackReleased = true'
      )

      console.log(
        '✅ Order marked cashbackReleased = true'
      )

      console.log(
        '✅ Creator earnings increased by BDT 500'
      )

      console.log(
        '✅ Completed campaign count increased'
      )

    } else {

      console.log('❌ ========================================')
      console.log('❌ ESCROW TEST FAILED')
      console.log('❌ ========================================')

      console.log('')

      if (!transactionPassed) {
        console.log(
          '❌ Transaction did not become completed'
        )
      }

      if (!postPassed) {
        console.log(
          '❌ Post cashbackReleased is incorrect'
        )
      }

      if (!orderPassed) {
        console.log(
          '❌ Order cashbackReleased is incorrect'
        )
      }

      if (!earningsPassed) {
        console.log(
          `❌ Expected earnings 600, got ${creator.totalEarnings}`
        )
      }

      if (!campaignsPassed) {
        console.log(
          `❌ Expected completedCampaigns 3, got ${creator.completedCampaigns}`
        )
      }

      if (!releaseCountPassed) {
        console.log(
          '❌ Escrow service reported no released payments'
        )
      }

    }


  } catch (error) {

    console.error('')
    console.error('❌ TEST ERROR')
    console.error(error)

  } finally {

    // ========================================================
    // CLEANUP
    // ========================================================

    console.log('')
    console.log('🧹 Cleaning temporary test data...')


    try {

      if (transaction?._id) {

        await Transaction.findByIdAndDelete(
          transaction._id
        )

      }


      if (post?._id) {

        await Post.findByIdAndDelete(
          post._id
        )

      }


      if (order?._id) {

        await Order.findByIdAndDelete(
          order._id
        )

      }


      if (campaign?._id) {

        await Campaign.findByIdAndDelete(
          campaign._id
        )

      }


      if (creator?._id) {

        await User.findByIdAndDelete(
          creator._id
        )

      }


      if (brand?._id) {

        await User.findByIdAndDelete(
          brand._id
        )

      }


      console.log(
        '✅ Temporary data removed'
      )

    } catch (cleanupError) {

      console.error(
        '⚠️ Cleanup error:',
        cleanupError.message
      )

    }


    // Disconnect database
    await mongoose.disconnect()

    console.log(
      '✅ MongoDB disconnected'
    )

  }

}


// ============================================================
// START TEST
// ============================================================

runTest()