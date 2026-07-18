import api from './api'

export const getPosts = (params = {}) =>
  api.get('/api/posts', { params }).then(r => r.data)

export const submitPost = (data) =>
  api.post('/api/posts', data).then(r => r.data)

export const approvePost = (id) =>
  api.put(`/api/posts/${id}/approve`).then(r => r.data)

export const rejectPost = (id, reason) =>
  api.put(`/api/posts/${id}/reject`, { reason }).then(r => r.data)
