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

// Product approval
export const getAdminProducts = (params = {}) =>
  api.get('/api/admin/products', { params }).then(r => r.data)

export const approveProduct = (id) =>
  api.put(`/api/admin/products/${id}/approve`).then(r => r.data)

export const rejectProduct = (id, reason) =>
  api.put(`/api/admin/products/${id}/reject`, { reason }).then(r => r.data)

// Instagram ID Verification
export const lookupInstagram = (username, max_posts = 30) => api.post('/api/admin/instagram-lookup', { username, max_posts }).then(r => r.data)

export const igVerifyCreator = (id, igVerified) =>
  api.put(`/api/admin/creators/${id}/ig-verify`, { igVerified }).then(r => r.data)

// ── Fraud review ─────────────────────────────────────────────────────────────
export const getFraudQueue = (params = {}) =>
  api.get('/api/admin/fraud', { params }).then(r => r.data)

export const getFraudDetail = (id) =>
  api.get(`/api/admin/fraud/${id}`).then(r => r.data)

export const blockUser = (id, reason) =>
  api.post(`/api/admin/fraud/${id}/block`, { reason }).then(r => r.data)

export const unblockUser = (id) =>
  api.post(`/api/admin/fraud/${id}/unblock`).then(r => r.data)

export const vouchUser = (id, { note = '', whitelisted = true } = {}) =>
  api.post(`/api/admin/fraud/${id}/vouch`, { note, whitelisted }).then(r => r.data)

export const rescanFraud = () =>
  api.post('/api/admin/fraud/rescan').then(r => r.data)
