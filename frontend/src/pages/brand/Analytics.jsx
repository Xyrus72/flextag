import React, { useState, useEffect } from 'react'
import { getCampaigns } from '../../services/campaigns'
import { getOrders } from '../../services/orders'
import { getPosts } from '../../services/posts'


const Analytics = () => {

  const [period, setPeriod] = useState('month')

  const [campaigns, setCampaigns] = useState([])

  const [kpis, setKpis] = useState({

    posts: 0,

    likes: 0,

    comments: 0,

    views: 0,

    reach: 0,

    cashbackPaid: 0,

    engagement: 0,

    cpe: 0,

    roi: 0

  })

  const [monthlyData, setMonthlyData] = useState([])

  const [loading, setLoading] = useState(true)


  // ============================================================
  // LOAD ANALYTICS
  // ============================================================

  useEffect(() => {

    const load = async () => {

      try {

        const [
          campData,
          ordersData,
          postsData
        ] = await Promise.all([

          getCampaigns({
            status: 'all'
          }),

          getOrders({
            status: 'all'
          }),

          getPosts()

        ])


        const camps =
          campData.campaigns || []

        const orders =
          ordersData.orders || []

        const posts =
          postsData.posts || []


        // ======================================================
        // CAMPAIGN BREAKDOWN
        // ======================================================

        const enriched = camps.map(c => {

          const campOrders =
            orders.filter(o =>

              o.campaignId?._id === c._id ||

              o.campaignId === c._id

            )


          const campPosts =
            posts.filter(p =>

              p.campaignId?._id === c._id ||

              p.campaignId === c._id

            )


          const likes =
            campPosts.reduce(
              (sum, p) =>
                sum + (p.likes || 0),
              0
            )


          const comments =
            campPosts.reduce(
              (sum, p) =>
                sum + (p.comments || 0),
              0
            )


          const views =
            campPosts.reduce(
              (sum, p) =>
                sum + (p.views || 0),
              0
            )


          const reach =
            campPosts.reduce(
              (sum, p) =>
                sum + (p.estimatedReach || 0),
              0
            )


          const cashbackPaid =
            campOrders

              .filter(
                o => o.cashbackReleased
              )

              .reduce(
                (sum, o) =>
                  sum +
                  (o.cashbackAmount || 0),

                0
              )


          const engagements =
            likes + comments


          const cpe =
            engagements > 0
              ? cashbackPaid / engagements
              : 0


          return {

            id: c._id,

            name:
              c.product ||
              c.title,

            posts:
              campPosts.length,

            likes,

            comments,

            views,

            reach,

            engagements,

            cashbackPaid,

            budget:
              c.budgetCap || 0,

            cpe,

            status:
              c.status

          }

        })


        setCampaigns(enriched)


        // ======================================================
        // GLOBAL ANALYTICS
        // ======================================================

        const totalPosts =
          posts.length


        const totalLikes =
          posts.reduce(
            (sum, p) =>
              sum + (p.likes || 0),
            0
          )


        const totalComments =
          posts.reduce(
            (sum, p) =>
              sum + (p.comments || 0),
            0
          )


        const totalViews =
          posts.reduce(
            (sum, p) =>
              sum + (p.views || 0),
            0
          )


        const totalReach =
          posts.reduce(
            (sum, p) =>
              sum +
              (p.estimatedReach || 0),
            0
          )


        const totalCashback =
          orders

            .filter(
              o => o.cashbackReleased
            )

            .reduce(
              (sum, o) =>
                sum +
                (o.cashbackAmount || 0),

              0
            )


        const totalEngagement =
          totalLikes +
          totalComments


        // ======================================================
        // CPE
        // Requirement:
        // Total Cashback Paid / Total Engagements Generated
        // ======================================================

        const cpe =
          totalEngagement > 0

            ? totalCashback /
              totalEngagement

            : 0


        // ======================================================
        // ROI
        //
        // We use generated reach as the available performance
        // indicator. The requirements document does not specify
        // a separate monetary ROI formula.
        // ======================================================

        const roi =
          totalCashback > 0 &&
          totalReach > 0

            ? (
                totalReach /
                totalCashback
              ) * 100

            : 0


        setKpis({

          posts:
            totalPosts,

          likes:
            totalLikes,

          comments:
            totalComments,

          views:
            totalViews,

          reach:
            totalReach,

          cashbackPaid:
            totalCashback,

          engagement:
            totalEngagement,

          cpe,

          roi

        })


        // ======================================================
        // MONTHLY DATA
        // ======================================================

        const monthNames = [

          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec'

        ]


        const byMonth = {}


        orders.forEach(o => {

          const d =
            new Date(o.createdAt)


          const key =
            monthNames[d.getMonth()]


          if (!byMonth[key]) {

            byMonth[key] = {

              month: key,

              orders: 0,

              cashback: 0

            }

          }


          byMonth[key].orders += 1


          byMonth[key].cashback +=
            o.cashbackAmount || 0

        })


        setMonthlyData(
          Object.values(byMonth)
            .slice(-6)
        )

      } catch (err) {

        console.error(
          '[Analytics]',
          err
        )

      } finally {

        setLoading(false)

      }

    }


    load()

  }, [])


  const maxOrders =
    Math.max(
      ...monthlyData.map(
        d => d.orders
      ),
      1
    )


  return (

    <div className="page-root">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between mb-8">

        <div>

          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Campaign Analytics
          </h1>

          <p className="text-zinc-500 mt-1">
            Real-time campaign performance & ROI
          </p>

        </div>


        <div className="flex bg-white/5 rounded-xl p-1">

          {[
            'week',
            'month',
            'year'
          ].map(p => (

            <button

              key={p}

              onClick={() =>
                setPeriod(p)
              }

              className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                period === p
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}

            >

              {p}

            </button>

          ))}

        </div>

      </div>


      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">


        {[
          {
            label: 'Total Posts',
            value: kpis.posts,
            icon: '📝'
          },

          {
            label: 'Likes',
            value: kpis.likes.toLocaleString(),
            icon: '❤️'
          },

          {
            label: 'Comments',
            value: kpis.comments.toLocaleString(),
            icon: '💬'
          },

          {
            label: 'Views',
            value: kpis.views.toLocaleString(),
            icon: '👁️'
          },

          {
            label: 'Estimated Reach',
            value: kpis.reach.toLocaleString(),
            icon: '📣'
          },

          {
            label: 'Cashback Paid',
            value:
              `৳${kpis.cashbackPaid.toLocaleString()}`,
            icon: '💸'
          },

          {
            label: 'CPE',
            value:
              `৳${kpis.cpe.toFixed(2)}`,
            icon: '📊'
          },

          {
            label: 'ROI',
            value:
              `${kpis.roi.toFixed(2)}%`,
            icon: '📈'
          }

        ].map(k => (

          <div

            key={k.label}

            className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:-translate-y-1 transition-all"

          >

            <span className="text-xl block mb-2">
              {k.icon}
            </span>


            <p className="text-2xl font-extrabold text-white">

              {loading
                ? '...'
                : k.value}

            </p>


            <p className="text-xs text-zinc-500 mt-1">
              {k.label}
            </p>

          </div>

        ))}

      </div>


      {/* ======================================================
          MONTHLY ORDERS
      ====================================================== */}

      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6 mb-8">

        <h2 className="text-lg font-bold text-white mb-6">
          Monthly Orders
        </h2>


        {loading ? (

          <div className="flex justify-center py-10">

            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />

          </div>

        ) : monthlyData.length === 0 ? (

          <div className="text-center py-10 text-zinc-500 text-sm">

            No data yet

          </div>

        ) : (

          <div className="flex items-end gap-3 h-48">

            {monthlyData.map(d => (

              <div

                key={d.month}

                className="flex-1 flex flex-col items-center gap-2"

              >

                <span className="text-xs text-zinc-400 font-semibold">

                  {d.orders}

                </span>


                <div

                  className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-cyan-500"

                  style={{
                    height:
                      `${(d.orders / maxOrders) * 100}%`,
                    minHeight: '4px'
                  }}

                />


                <span className="text-xs text-zinc-600">
                  {d.month}
                </span>

              </div>

            ))}

          </div>

        )}

      </div>


      {/* ======================================================
          CAMPAIGN BREAKDOWN
      ====================================================== */}

      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">

        <h2 className="text-lg font-bold text-white mb-5">
          Campaign Breakdown
        </h2>


        {loading ? (

          <div className="flex justify-center py-10">

            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />

          </div>

        ) : campaigns.length === 0 ? (

          <div className="text-center py-10 text-zinc-500 text-sm">

            No campaigns yet

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b border-white/5">

                  {[
                    'Campaign',
                    'Posts',
                    'Likes',
                    'Comments',
                    'Views',
                    'Reach',
                    'CPE',
                    'Cashback',
                    'Budget',
                    'Status'
                  ].map(h => (

                    <th

                      key={h}

                      className="text-left text-xs text-zinc-500 font-semibold uppercase tracking-wider px-3 py-3"

                    >

                      {h}

                    </th>

                  ))}

                </tr>

              </thead>


              <tbody>

                {campaigns.map(c => {

                  const pct =
                    c.budget > 0

                      ? Math.min(
                          100,
                          Math.round(
                            (c.cashbackPaid /
                              c.budget) *
                              100
                          )
                        )

                      : 0


                  return (

                    <tr

                      key={c.id}

                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"

                    >

                      <td className="px-3 py-3 text-sm font-medium text-white">
                        {c.name}
                      </td>


                      <td className="px-3 py-3 text-sm text-zinc-300">
                        {c.posts}
                      </td>


                      <td className="px-3 py-3 text-sm text-zinc-300">
                        {c.likes.toLocaleString()}
                      </td>


                      <td className="px-3 py-3 text-sm text-zinc-300">
                        {c.comments.toLocaleString()}
                      </td>


                      <td className="px-3 py-3 text-sm text-zinc-300">
                        {c.views.toLocaleString()}
                      </td>


                      <td className="px-3 py-3 text-sm text-zinc-300">
                        {c.reach.toLocaleString()}
                      </td>


                      <td className="px-3 py-3 text-sm text-violet-400 font-semibold">
                        ৳{c.cpe.toFixed(2)}
                      </td>


                      <td className="px-3 py-3 text-sm text-emerald-400 font-semibold">
                        ৳{c.cashbackPaid.toLocaleString()}
                      </td>


                      <td className="px-3 py-3">

                        {c.budget > 0 ? (

                          <div className="flex items-center gap-2">

                            <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">

                              <div

                                className={`h-full rounded-full ${
                                  pct > 80
                                    ? 'bg-red-500'
                                    : pct > 50
                                      ? 'bg-yellow-500'
                                      : 'bg-emerald-500'
                                }`}

                                style={{
                                  width:
                                    `${pct}%`
                                }}

                              />

                            </div>


                            <span className="text-xs text-zinc-400">
                              {pct}%
                            </span>

                          </div>

                        ) : (

                          <span className="text-xs text-zinc-600">
                            Unlimited
                          </span>

                        )}

                      </td>


                      <td className="px-3 py-3">

                        <span

                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : c.status === 'pending'
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-zinc-500/10 text-zinc-500'
                          }`}

                        >

                          {c.status}

                        </span>

                      </td>

                    </tr>

                  )

                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>

  )

}


export default Analytics