import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// 获取请求的 headers（附带 token）
const getAuthHeaders = () => {
  const userStr = localStorage.getItem('user')
  if (!userStr) return {}
  try {
    const user = JSON.parse(userStr)
    return { Authorization: `Bearer ${user.token}` }
  } catch (e) {
    return {}
  }
}

export interface TrafficData {
  floor: number
  level: number
}

export interface TrafficResponse {
  aggregated: TrafficData[]
  totalSubmissions: number
  lastUpdatedAt: string | null
}

export const getStoreTraffic = async (storeId: number): Promise<TrafficResponse> => {
  const res = await axios.get(`${API_URL}/traffic/${storeId}`)
  return res.data
}

export const submitStoreTraffic = async (storeId: number, floor: number, level: number): Promise<void> => {
  const res = await axios.post(
    `${API_URL}/traffic`,
    { storeId, floor, level },
    { headers: getAuthHeaders() }
  )
  return res.data
}
