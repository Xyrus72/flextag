import api from './api'

export const getBrandReviews = async (brandId) => {
  const res = await api.get(`/api/reviews/brand/${brandId}`)
  return res.data
}

export const getProductReviews = async (productId) => {
  const res = await api.get(`/api/reviews/product/${productId}`)
  return res.data
}

export const submitBrandReview = async (reviewData) => {
  const res = await api.post('/api/reviews', reviewData)
  return res.data
}
