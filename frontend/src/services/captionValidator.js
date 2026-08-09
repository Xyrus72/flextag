import api from './api'

export const validateCaption = ({ caption, campaignId }) =>
  api.post('/api/caption/validate', { caption, campaignId }).then(r => r.data)
