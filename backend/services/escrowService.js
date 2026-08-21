const Post = require('../models/Post')
const Transaction = require('../models/Transaction')
const Order = require('../models/Order')
const User = require('../models/User')


// ============================================================
// RELEASE EXPIRED ESCROWS
//
// This function looks for approved creator posts whose
// retention period has finished.
//
// When retention finishes:
//
// 1. Pending cashback becomes completed
// 2. Order cashbackReleased becomes true
// 3. Post cashbackReleased becomes true
// 4. Creator earnings increase
// ============================================================

async function releaseExpiredEscrows() {

  try {

    const now = new Date()


    // ----------------------------------------------------------
    // Find posts where:
    //
    // status = approved
    // cashback has NOT been released
    // retention deadline has already passed
    // ----------------------------------------------------------

    const expiredPosts = await Post.find({

      status: 'approved',

      cashbackReleased: false,

      retentionDeadline: {
        $ne: null,
        $lte: now
      }

    })


    // Nothing needs to be released
    if (expiredPosts.length === 0) {

      return {
        checked: true,
        released: 0
      }
    }


    let releasedCount = 0


    // ----------------------------------------------------------
    // Process every expired post
    // ----------------------------------------------------------

    for (const post of expiredPosts) {

      try {

        // ------------------------------------------------------
        // Find the pending cashback transaction
        // created when the post was approved
        // ------------------------------------------------------

        const transaction = await Transaction.findOne({

          userId: post.creatorId,

          postId: post._id,

          type: 'cashback',

          status: 'pending'

        })


        // If transaction does not exist,
        // skip this post instead of crashing the server.
        if (!transaction) {

          console.warn(
            `[Escrow] No pending cashback transaction found for post ${post._id}`
          )

          continue
        }


        // ------------------------------------------------------
        // Mark cashback transaction as COMPLETED
        // ------------------------------------------------------

        transaction.status = 'completed'

        transaction.desc =
          transaction.desc.replace(
            'Cashback in escrow',
            'Cashback released'
          )

        await transaction.save()


        // ------------------------------------------------------
        // Update Order
        // ------------------------------------------------------

        if (post.orderId) {

          await Order.findByIdAndUpdate(
            post.orderId,
            {
              cashbackReleased: true
            }
          )

        }


        // ------------------------------------------------------
        // Update Post
        // ------------------------------------------------------

        post.cashbackReleased = true

        await post.save()


        // ------------------------------------------------------
        // Add money to creator earnings
        // ------------------------------------------------------

        await User.findByIdAndUpdate(
          post.creatorId,
          {
            $inc: {

              totalEarnings: transaction.amount,

              completedCampaigns: 1

            }
          }
        )


        releasedCount++


        console.log(
          `[Escrow] Released BDT ${transaction.amount} for post ${post._id}`
        )


      } catch (postError) {

        console.error(
          `[Escrow] Failed to release post ${post._id}:`,
          postError.message
        )

      }

    }


    return {

      checked: true,

      released: releasedCount

    }


  } catch (error) {

    console.error(
      '[Escrow] Release checker failed:',
      error.message
    )


    return {

      checked: false,

      released: 0,

      error: error.message

    }

  }

}


module.exports = {
  releaseExpiredEscrows
}