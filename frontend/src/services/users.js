import api from './api'

export const getLeaderboard = () =>
  api.get('/api/users/leaderboard').then(r => r.data)

export const getMyStats = () =>
  api.get('/api/users/me/stats').then(r => r.data)

export const getUsers = (params = {}) =>
  api.get('/api/users', { params }).then(r => r.data)

export const getUser = (id) =>
  api.get(`/api/users/${id}`).then(r => r.data)

export const updateUser = (id, data) =>
  api.put(`/api/users/${id}`, data).then(r => r.data)

export const verifyUser = (id, isVerified) =>
  api.put(`/api/users/${id}/verify`, { isVerified }).then(r => r.data)

export const getBrandRatings = (params = {}) =>
  api.get('/api/users/brand/ratings', { params }).then(r => r.data)

// ── Shipping Addresses ────────────────────────────────────────────────────────
export const getAddresses = (userId) =>
  api.get(`/api/users/${userId}/addresses`).then(r => r.data)

export const addAddress = (userId, data) =>
  api.post(`/api/users/${userId}/addresses`, data).then(r => r.data)

export const updateAddress = (userId, addrId, data) =>
  api.put(`/api/users/${userId}/addresses/${addrId}`, data).then(r => r.data)

export const deleteAddress = (userId, addrId) =>
  api.delete(`/api/users/${userId}/addresses/${addrId}`).then(r => r.data)

export const setDefaultAddress = (userId, addrId) =>
  api.put(`/api/users/${userId}/addresses/${addrId}/default`).then(r => r.data)

export const getPortfolio = (handle) =>
  api.get(`/api/users/portfolio/${encodeURIComponent(handle)}`).then(r => r.data)

export const getMyReferrals = () =>
  api.get('/api/users/me/referrals').then(r => r.data)

// ── Wishlist ─────────────────────────────────────────────────────────────────
export const getWishlist = () =>
  api.get('/api/users/me/wishlist').then(r => r.data)

export const addToWishlist = (productId) =>
  api.post(`/api/users/me/wishlist/${productId}`).then(r => r.data)

export const removeFromWishlist = (productId) =>
  api.delete(`/api/users/me/wishlist/${productId}`).then(r => r.data)

/** Creator earnings analytics → { monthly, byBrand, lifetime, available, waitingOnPosts, … } */
export const getMyEarnings = (months = 6) =>
  api.get('/api/users/me/earnings', { params: { months } }).then(r => r.data)
