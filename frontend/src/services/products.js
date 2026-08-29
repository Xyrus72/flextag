import api from './api'

export const getProducts = (params = {}) =>
  api.get('/api/products', { params }).then(r => r.data)

export const getProduct = (id) =>
  api.get(`/api/products/${id}`).then(r => r.data)

export const createProduct = (data) =>
  api.post('/api/products', data).then(r => r.data)

export const updateProduct = (id, data) =>
  api.put(`/api/products/${id}`, data).then(r => r.data)

export const getMyProducts = () =>
  api.get('/api/products/my').then(r => r.data)

export const getProductReviews = (id) =>
  api.get(`/api/products/${id}/reviews`).then(r => r.data)

/** Bulk import. dryRun=true validates without writing anything. */
export const importProducts = (csv, dryRun = false) =>
  api.post('/api/products/import', { csv, dryRun }).then(r => r.data)
