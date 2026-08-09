import api from './api'

export const initCheckout = ({ items, address }) =>
  api.post('/api/checkout/init', { items, address }).then(r => r.data)
