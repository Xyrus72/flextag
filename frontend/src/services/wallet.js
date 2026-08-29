import api from './api'

export const getWallet = (params = {}) =>
  api.get('/api/transactions', { params }).then(r => r.data)

export const requestWithdrawal = (data) =>
  api.post('/api/transactions/withdraw', data).then(r => r.data)

export const completeTransaction = (id) =>
  api.put(`/api/transactions/${id}/complete`).then(r => r.data)

export const topUpWallet = (data) =>
  api.post('/api/transactions/topup', data).then(r => r.data)

// ── Payout queue (admin) ─────────────────────────────────────────────────────
export const getPayouts = (params = {}) =>
  api.get('/api/transactions/payouts', { params }).then(r => r.data)

export const sendPayout = (id) =>
  api.post(`/api/transactions/payouts/${id}/send`).then(r => r.data)

export const rejectPayout = (id, reason) =>
  api.post(`/api/transactions/payouts/${id}/reject`, { reason }).then(r => r.data)

export const reconcilePayout = (id, reference) =>
  api.post(`/api/transactions/payouts/${id}/reconcile`, { reference }).then(r => r.data)

export const runPayoutQueue = (data = {}) =>
  api.post('/api/transactions/payouts/run', data).then(r => r.data)
