import api from './api'

/** Start an SSLCommerz payment session → { url, tran_id }. Redirect the browser to `url`. */
export const initCheckout = ({ items, address }) =>
  api.post('/api/checkout/init', { items, address }).then(r => r.data)
