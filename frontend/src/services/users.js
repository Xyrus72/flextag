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
