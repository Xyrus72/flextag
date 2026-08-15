import api from './api'

export const generateCaption = (data) =>
  api.post('/api/ai/caption', data).then(r => r.data)