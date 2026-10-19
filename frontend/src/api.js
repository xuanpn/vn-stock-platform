import axios from 'axios'

// In production on Vercel, reads VITE_API_BASE_URL (e.g. your Render/Railway backend)
// In local development, defaults to '/api' which is proxied to http://localhost:8000
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')}/api`
  : '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000
})

export const getSignals    = (params) => api.get('/signals', { params }).then(r => r.data)
export const getStock      = (symbol)  => api.get(`/stock/${symbol}`).then(r => r.data)
export const getSeasonal   = ()        => api.get('/seasonal').then(r => r.data)
export const getMacro      = ()        => api.get('/macro').then(r => r.data)
export const getScreener   = (params) => api.get('/screener', { params }).then(r => r.data)
export const getWatchlist  = ()        => api.get('/watchlist').then(r => r.data)

// Portfolio / Simulation APIs
export const getPortfolio  = ()        => api.get('/portfolio').then(r => r.data)
export const buyStock      = (payload) => api.post('/portfolio/buy', payload).then(r => r.data)
export const sellStock     = (payload) => api.post('/portfolio/sell', payload).then(r => r.data)
export const resetPortfolio= (payload) => api.post('/portfolio/reset', payload).then(r => r.data)

export default api
