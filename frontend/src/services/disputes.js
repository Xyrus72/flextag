import api from './api'

export const getDisputes = (params = {}) =>
  api.get('/api/disputes', { params }).then(r => r.data)

export const getDispute = (id) =>
  api.get(`/api/disputes/${id}`).then(r => r.data)

export const fileDispute = (data) =>
  api.post('/api/disputes', data).then(r => r.data)

export const replyToDispute = (id, text) =>
  api.post(`/api/disputes/${id}/messages`, { text }).then(r => r.data)

export const investigateDispute = (id) =>
  api.put(`/api/disputes/${id}/investigate`).then(r => r.data)

export const resolveDispute = (id, data) =>
  api.put(`/api/disputes/${id}/resolve`, data).then(r => r.data)
