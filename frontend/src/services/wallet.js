import api from './api'

export const getWallet = (params = {}) =>
  api.get('/api/transactions', { params }).then(r => r.data)

export const requestWithdrawal = (data) =>
  api.post('/api/transactions/withdraw', data).then(r => r.data)

export const completeTransaction = (id) =>
  api.put(`/api/transactions/${id}/complete`).then(r => r.data)
