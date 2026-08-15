import api from './api'

// ─────────────────────────────────────────────────────────────
// GET ALL CAMPAIGNS
// Used by Creator Catalog
// ─────────────────────────────────────────────────────────────
export const getCampaigns = (params = {}) =>
  api.get('/api/campaigns', { params }).then(r => r.data)


// ─────────────────────────────────────────────────────────────
// GET SINGLE CAMPAIGN
// ─────────────────────────────────────────────────────────────
export const getCampaign = (id) =>
  api.get(`/api/campaigns/${id}`).then(r => r.data)


// ─────────────────────────────────────────────────────────────
// CREATE CAMPAIGN
// Used by Brand CampaignBuilder
// ─────────────────────────────────────────────────────────────
export const createCampaign = (data) =>
  api.post('/api/campaigns', data).then(r => r.data)


// ─────────────────────────────────────────────────────────────
// UPDATE CAMPAIGN
// Used by Brand/Admin
// ─────────────────────────────────────────────────────────────
export const updateCampaign = (id, data) =>
  api.put(`/api/campaigns/${id}`, data).then(r => r.data)


// ─────────────────────────────────────────────────────────────
// DELETE CAMPAIGN
// Used by Brand/Admin
// ─────────────────────────────────────────────────────────────
export const deleteCampaign = (id) =>
  api.delete(`/api/campaigns/${id}`).then(r => r.data)