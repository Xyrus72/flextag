import api from './api'

export const getDisputes = async () => {
  const res = await api.get('/api/disputes')
  return res.data
}

export const getDispute = async (id) => {
  const res = await api.get(`/api/disputes/${id}`)
  return res.data
}

export const createDispute = async (disputeData) => {
  const res = await api.post('/api/disputes', disputeData)
  return res.data
}

export const resolveDispute = async (id, data) => {
  const res = await api.put(`/api/disputes/${id}/resolve`, data)
  return res.data
}

export const rejectDispute = async (id, data) => {
  const res = await api.put(`/api/disputes/${id}/reject`, data)
  return res.data
}
