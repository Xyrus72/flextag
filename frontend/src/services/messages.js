import api from './api'

export const getContacts = (params = {}) =>
  api.get('/api/messages/contacts', { params }).then(r => r.data)

export const getConversations = () =>
  api.get('/api/messages/conversations').then(r => r.data)

export const getAllConversations = () =>
  api.get('/api/messages/all-conversations').then(r => r.data)

export const startConversation = (data) =>
  api.post('/api/messages/conversations', data).then(r => r.data)

export const getMessages = (conversationId) =>
  api.get(`/api/messages/conversations/${conversationId}`).then(r => r.data)

export const sendMessage = (data) =>
  api.post('/api/messages', data).then(r => r.data)

export const markConversationAsRead = (conversationId) =>
  api.put(`/api/messages/conversations/${conversationId}/read`).then(r => r.data)
