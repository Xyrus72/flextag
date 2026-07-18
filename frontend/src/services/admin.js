import api from './api'

export const getAdminStats = () =>
  api.get('/api/admin/stats').then(r => r.data)

export const getAdminAnalytics = () =>
  api.get('/api/admin/analytics').then(r => r.data)

export const getAdminFinancial = () =>
  api.get('/api/admin/financial').then(r => r.data)

export const getSettings = () =>
  api.get('/api/settings').then(r => r.data)

export const updateSettings = (data) =>
  api.put('/api/settings', data).then(r => r.data)

export const getDisputes = (params = {}) =>
  api.get('/api/disputes', { params }).then(r => r.data)

export const resolveDispute = (id, resolution) =>
  api.put(`/api/disputes/${id}/resolve`, { resolution }).then(r => r.data)

export const investigateDispute = (id) =>
  api.put(`/api/disputes/${id}/investigate`).then(r => r.data)

export const getCategories = () =>
  api.get('/api/categories').then(r => r.data)

export const createCategory = (data) =>
  api.post('/api/categories', data).then(r => r.data)

export const updateCategory = (id, data) =>
  api.put(`/api/categories/${id}`, data).then(r => r.data)

export const deleteCategory = (id) =>
  api.delete(`/api/categories/${id}`).then(r => r.data)
