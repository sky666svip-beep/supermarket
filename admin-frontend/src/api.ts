import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
})

// Hardcode admin userId = 1 for demo purposes
// In a real app, this would be retrieved from a login session
api.interceptors.request.use(config => {
  config.headers['X-User-Id'] = '2'
  return config
})

export const deleteNotice = (id: number) => api.delete(`/notice/${id}`).then(res => res.data)
export const uploadImage = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data)
}

// Feedbacks API
export const getAdminFeedbacks = () => api.get('/admin/feedbacks').then(res => res.data)
export const updateAdminFeedbackStatus = (id: number, status: string) => api.put(`/admin/feedbacks/${id}/status`, { status }).then(res => res.data)
export const replyAdminFeedback = (id: number, reply: string) => api.put(`/admin/feedbacks/${id}/reply`, { reply }).then(res => res.data)

export default api
