'use strict'
/**
 * Deadline Reminder Job — sends automated email reminders at 48h, 24h, and 6h
 * before campaign posting deadlines. Prevents duplicate sends by tracking which
 * reminders have already been sent via campaign.remindersSent array.
 */

const Campaign = require('../models/Campaign')
const User = require('../models/User')
const { sendDeadlineReminder } = require('../utils/mailer')

const HOUR = 3_600_000
const timers = []

const WINDOWS = [
  { key: '48h', hoursWindow: 48 },
  { key: '24h', hoursWindow: 24 },
  { key: '6h',  hoursWindow: 6 },
]

/**
 * Send deadline reminders for campaigns with deadlines in the next time window.
 * Only sends each reminder once per campaign.
 */
async function sendDeadlineReminders() {
  try {
    const now = new Date()
    let sent = 0

    for (const window of WINDOWS) {
      // Calculate the time range for this window
      // We want to send the reminder when there are approx X hours left
      const beforeWindow = new Date(now.getTime() + (window.hoursWindow * HOUR))
      const afterWindow = new Date(now.getTime() + ((window.hoursWindow - 0.5) * HOUR)) // 0.5 hour buffer

      // Find campaigns with deadlines in this window that haven't had this reminder sent yet
      const campaigns = await Campaign.find({
        status: 'active',
        deadline: { $gte: afterWindow, $lte: beforeWindow },
        remindersSent: { $ne: window.key }, // Hasn't sent this reminder yet
      }).populate('brandId', 'name email')

      for (const campaign of campaigns) {
        try {
          // Get creators who have active orders for this campaign but haven't submitted posts yet
          const Order = require('../models/Order')
          const Post = require('../models/Post')

          const orders = await Order.find({ campaignId: campaign._id, status: 'delivered' })
            .select('creatorId')
            .lean()

          const creatorIds = [...new Set(orders.map(o => o.creatorId))]

          // Find creators without posts for this campaign
          const postsSubmitted = await Post.find({ campaignId: campaign._id }).select('creatorId').lean()
          const creatorsWithPosts = new Set(postsSubmitted.map(p => p.creatorId?.toString() || String(p.creatorId)))

          const creatorsNeedingReminder = creatorIds.filter(
            id => !creatorsWithPosts.has(String(id))
          )

          // Fetch creator emails and send reminders
          const creators = await User.find({ _id: { $in: creatorsNeedingReminder } })
            .select('email name')
            .lean()

          const hoursLeft = Math.round((campaign.deadline - now) / HOUR)

          for (const creator of creators) {
            if (creator.email) {
              try {
                await sendDeadlineReminder(creator.email, {
                  title: campaign.title,
                  brand: campaign.brand,
                  hoursLeft,
                }, window.key)
                sent++
              } catch (err) {
                console.warn(
                  `[deadline reminders] failed to send ${window.key} reminder to ${creator.email} for campaign ${campaign._id}:`,
                  err.message
                )
              }
            }
          }

          // Mark this reminder as sent
          await Campaign.findByIdAndUpdate(campaign._id, {
            $addToSet: { remindersSent: window.key },
          })
        } catch (err) {
          console.warn(
            `[deadline reminders] error processing campaign ${campaign._id}:`,
            err.message
          )
        }
      }
    }

    return { sent, scannedWindows: WINDOWS.length }
  } catch (err) {
    console.error('[deadline reminders] fatal error:', err.message)
    return { error: err.message }
  }
}

const log = (name) => (r) => r && console.log(`[deadline reminders] ${name}:`, JSON.stringify(r))
const warn = (name) => (e) => console.warn(`[deadline reminders] ${name} errored: ${e.message}`)

/**
 * Start the deadline reminder scheduler.
 * Runs every 30 minutes (1800s) to check for campaigns with approaching deadlines.
 */
function start() {
  if (process.env.DEADLINE_REMINDERS === 'off' || process.env.NODE_ENV === 'test') return

  // Run immediately on startup (after a 10s delay to ensure DB is ready)
  const t3 = setTimeout(() => sendDeadlineReminders().then(log('initial-check')).catch(warn('initial-check')), 10_000)
  timers.push(t3)

  // Then run every 30 minutes
  const t1 = setInterval(
    () => sendDeadlineReminders().then(log('periodic-check')).catch(warn('periodic-check')),
    30 * 60 * 1000
  )
  t1.unref?.()
  timers.push(t1)

  console.log('[deadline reminders] scheduled: check every 30 minutes for 48h/24h/6h windows')
}

function stop() {
  for (const t of timers.splice(0)) clearTimeout(t)
}

module.exports = { start, stop, sendDeadlineReminders }
