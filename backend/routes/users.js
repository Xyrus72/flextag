const express = require('express');
const router = express.Router();

const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth')

// other routes above...


/*
====================================================
GET /api/users/me/stats
Creator dashboard statistics
====================================================
*/

router.get('/me/stats', requireAuth, async (req, res) => {

  try {

    console.log("==============================");
    console.log("LOGGED USER:");
    console.log(req.user);
    console.log("==============================");


    const user = req.user;


    if (user.role === 'creator') {


      const Order = require('../models/Order');
      const Post = require('../models/Post');
      const Transaction = require('../models/Transaction');


      const [orders, posts, txResult] =
      await Promise.all([


        Order.find({
          creatorId: user._id
        }),


        Post.find({
          creatorId: user._id
        }),


        Transaction.aggregate([

          {
            $match: {

              userId: user._id,
              type: "cashback",
              status: "completed"

            }
          },


          {
            $group: {

              _id: null,

              total: {
                $sum: "$amount"
              }

            }
          }

        ])

      ]);



      console.log(
        "Orders:",
        orders.length
      );


      console.log(
        "Posts:",
        posts.length
      );


      console.log(
        "Transactions:",
        txResult
      );



      const activeCampaigns =
        orders.filter(
          o =>
          o.status !== "delivered" &&
          o.status !== "cancelled"
        ).length;



      const completedPosts =
        posts.filter(
          p =>
          p.status === "approved"
        ).length;



      const totalEarned =
        txResult[0]?.total || 0;



      return res.json({

        totalEarned,

        activeCampaigns,

        completedPosts,

        engagementRate:
          user.engagementRate || 0

      });

    }

    if (user.role === 'brand') {
      const Campaign = require('../models/Campaign');
      const Order = require('../models/Order');
      const Post = require('../models/Post');
      
      const [campaigns, orders] = await Promise.all([
        Campaign.find({ brandId: user._id }),
        Order.find({ brandId: user._id }).populate('creatorId', 'name').sort({ createdAt: -1 })
      ]);
      
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      
      const campaignIds = campaigns.map(c => c._id);
      
      const posts = await Post.find({ campaignId: { $in: campaignIds } });
      const uniqueCreators = new Set(posts.map(p => p.creatorId?.toString()));
      const totalCreators = uniqueCreators.size;
      
      const cashbackDisbursed = orders
        .filter(o => o.cashbackReleased)
        .reduce((sum, o) => sum + (o.cashbackAmount || 0), 0);
        
      const recentOrders = orders.slice(0, 5);

      return res.json({
        activeCampaigns,
        totalCreators,
        cashbackDisbursed,
        recentOrders
      });
    }

    return res.json({});


  }

  catch(error){

    console.error(
      "STATS ERROR:",
      error
    );


    res.status(500).json({

      message:"Server error"

    });

  }

});


// other routes below...


module.exports = router;