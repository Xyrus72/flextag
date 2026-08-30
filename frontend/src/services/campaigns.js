import api from './api'

export const getCampaigns = (params = {}) =>
  api.get('/api/campaigns', { params }).then(r => r.data)

export const getCampaign = (id) =>
  api.get(`/api/campaigns/${id}`).then(r => r.data)

export const createCampaign = (data) =>
  api.post('/api/campaigns', data).then(r => r.data)

export const updateCampaign = (id, data) =>
  api.put(`/api/campaigns/${id}`, data).then(r => r.data)

export const deleteCampaign = (id) =>
  api.delete(`/api/campaigns/${id}`).then(r => r.data)

// ── Campaign report card ─────────────────────────────────────────────────────
export const getCampaignReport = (id) =>
  api.get(`/api/campaigns/${id}/report`).then(r => r.data)

export const shareCampaignReport = (id) =>
  api.post(`/api/campaigns/${id}/report/share`).then(r => r.data)

export const unshareCampaignReport = (id) =>
  api.delete(`/api/campaigns/${id}/report/share`).then(r => r.data)
