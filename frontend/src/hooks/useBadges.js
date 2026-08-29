import { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * Live counts for the sidebar badges.
 *
 * The nav used to show hardcoded numbers — "3" brands to verify, "2" disputes —
 * that were never true and quietly taught everyone to ignore badges. These come
 * from the database, refresh every minute, and simply disappear at zero.
 */
const REFRESH_MS = 60_000

export default function useBadges() {
  const [counts, setCounts] = useState({})

  useEffect(() => {
    let alive = true
    const load = () => api.get('/api/stats/badges')
      .then(r => { if (alive) setCounts(r.data || {}) })
      .catch(() => {})   // a failed badge fetch must never break the shell
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  return counts
}
