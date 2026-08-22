import axios from 'axios'
import { API_URL } from '../config'

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,          // send cookies (session) with every request
  headers: { 'Content-Type': 'application/json' },
})

export default api
