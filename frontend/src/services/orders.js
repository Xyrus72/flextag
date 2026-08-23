import api from './api'

export const getOrders = (params = {}) =>
  api.get('/api/orders', { params }).then(r => r.data)

export const getOrder = (id) =>
  api.get(`/api/orders/${id}`).then(r => r.data)

export const placeOrder = (data) =>
  api.post('/api/orders', data).then(r => r.data)

export const updateOrderStatus = (id, data) =>
  api.put(`/api/orders/${id}/status`, data).then(r => r.data)

export const updateOrder = (id, data) =>
  updateOrderStatus(id, data)
