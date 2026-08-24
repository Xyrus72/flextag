const { sendEmail } = require("./emailService");

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
// 5. Creator receives email notification
// ============================================================

async function releaseExpiredEscrows() {

  try {

    const now = new Date()


    const expiredPosts = await Post.find({

      status: 'approved',

      cashbackReleased: false,

      retentionDeadline: {
        $ne: null,
        $lte: now
      }

    })


    if (expiredPosts.length === 0) {

      return {
        checked: true,
        released: 0
      }
    }


    let releasedCount = 0


    for (const post of expiredPosts) {

      try {


        const transaction = await Transaction.findOne({

          userId: post.creatorId,

          postId: post._id,

          type: 'cashback',

          status: 'pending'

        })


        if (!transaction) {

          console.warn(
            `[Escrow] No pending cashback transaction found for post ${post._id}`
          )

          continue
        }



        transaction.status = 'completed'

        transaction.desc =
          transaction.desc.replace(
            'Cashback in escrow',
            'Cashback released'
          )

        await transaction.save()



        if (post.orderId) {

          await Order.findByIdAndUpdate(
            post.orderId,
            {
              cashbackReleased: true
            }
          )

        }



        post.cashbackReleased = true

        await post.save()



        // Get creator information for email
        const creator = await User.findById(
          post.creatorId
        )



        await User.findByIdAndUpdate(
          post.creatorId,
          {
            $inc: {

              totalEarnings: transaction.amount,

              completedCampaigns: 1

            }
          }
        )



        // ====================================================
        // SEND PAYOUT EMAIL
        // ====================================================

        if (creator && creator.email) {

          try {

            await sendEmail(

              creator.email,

              "FlexTag Cashback Released",

              `
Hello ${creator.name},

Your cashback payment has been released successfully.

Amount:
BDT ${transaction.amount}

Campaign Status:
Completed ✅

Your earnings have been updated in your FlexTag wallet.

Thank you for using FlexTag.

FlexTag Team
              `

            )


            console.log(
              `📧 Cashback email sent to ${creator.email}`
            )


          } catch(emailError) {

            console.error(
              "📧 Email notification failed:",
              emailError.message
            )

          }

        }



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