import api from './api'

/** Brand balance + ledger → { balance, funded, spent, refunded, pendingFunding, entries, gatewayReady, enforce, minFunding } */
export const getBrandWallet = (params = {}) =>
  api.get('/api/brand-wallet', { params }).then(r => r.data)

/** Card / bKash top-up → { url } (send the browser there) */
export const initBrandFunding = (amount) =>
  api.post('/api/brand-wallet/fund/init', { amount }).then(r => r.data)

/** "I sent a bank transfer" — credited only once an admin confirms it. */
export const declareBankTransfer = (amount, reference) =>
  api.post('/api/brand-wallet/fund/declare', { amount, reference }).then(r => r.data)

// ── Admin ───────────────────────────────────────────────────────────────────
export const getPlatformFloat = () =>
  api.get('/api/brand-wallet/admin/overview').then(r => r.data)

export const confirmBankTransfer = (id) =>
  api.post(`/api/brand-wallet/admin/confirm/${id}`).then(r => r.data)

export const creditBrand = (data) =>
  api.post('/api/brand-wallet/admin/credit', data).then(r => r.data)
