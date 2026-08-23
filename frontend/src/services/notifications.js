import api from './api'

/** → { notifications: [...], unread } */
export const getNotifications = () => api.get('/api/notifications').then(r => r.data)

/** Mark all (or one, by id) as read → { unread } */
export const markNotificationsRead = (id) =>
  api.put('/api/notifications/read', null, { params: id ? { id } : {} }).then(r => r.data)
