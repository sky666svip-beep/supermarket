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
export const deleteAdminFeedback = (id: number) => api.delete(`/admin/feedbacks/${id}`).then(res => res.data)

// Community Admin APIs
export const getAdminPosts = (status?: string) => api.get('/community-admin/posts', { params: { status } }).then(res => res.data)
export const updatePostStatus = (id: number, status: string) => api.put(`/community-admin/posts/${id}/status`, { status }).then(res => res.data)
export const updatePostAttributes = (id: number, attributes: { isTop?: boolean, isElite?: boolean }) => api.put(`/community-admin/posts/${id}/attributes`, attributes).then(res => res.data)
export const getAdminReports = () => api.get('/community-admin/reports').then(res => res.data)
export const updateReportStatus = (id: number, status: string) => api.put(`/community-admin/reports/${id}/status`, { status }).then(res => res.data)
export const deleteAdminReport = (id: number) => api.delete(`/community-admin/reports/${id}`).then(res => res.data)

export default api
