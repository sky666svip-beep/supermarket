import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
})

api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user')
  if (config.headers) {
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user && user.id) {
          if (typeof config.headers.set === 'function') {
            config.headers.set('X-User-Id', user.id.toString())
          } else {
            config.headers['X-User-Id'] = user.id.toString()
          }
        } else {
          if (typeof config.headers.delete === 'function') config.headers.delete('X-User-Id')
          else delete config.headers['X-User-Id']
        }
      } catch (e) {}
    } else {
      if (typeof config.headers.delete === 'function') config.headers.delete('X-User-Id')
      else delete config.headers['X-User-Id']
    }
  }
  return config
})

// Auth APIs
export const login = (data: any) => api.post('/auth/login', data).then(res => res.data)
export const register = (data: any) => api.post('/auth/register', data).then(res => res.data)
export const updatePassword = (data: any) => api.put('/auth/password', data).then(res => res.data)
export const updateProfile = (data: any) => api.put('/auth/profile', data).then(res => res.data)
export const bindEmail = (data: any) => api.put('/auth/email', data).then(res => res.data)
export const forgotPassword = (data: any) => api.post('/auth/forgot-password', data).then(res => res.data)
export const sendVerificationCode = (data: { email: string, type: string }) => api.post('/auth/send-code', data).then(res => res.data)


// Customer APIs
export const getStores = (params?: { city?: string, district?: string }) => api.get('/customer/stores', { params }).then(res => res.data)
export const getRegions = () => api.get('/customer/regions').then(res => res.data)
export const getChecklist = () => api.get('/customer/checklist').then(res => res.data)
export const addChecklist = (title: string) => api.post('/customer/checklist', { title }).then(res => res.data)
export const updateChecklist = (id: number, isCompleted: boolean) => api.put(`/customer/checklist/${id}`, { isCompleted }).then(res => res.data)
export const deleteChecklist = (id: number) => api.delete(`/customer/checklist/${id}`).then(res => res.data)
export const submitFeedback = (storeId: number, facilityType: string, message: string, images?: string[]) => api.post('/customer/feedback', { storeId, facilityType, message, images }).then(res => res.data)
export const getFeedbackHistory = () => api.get('/customer/feedback').then(res => res.data)
export const deleteFeedback = (id: number) => api.delete(`/customer/feedback/${id}`).then(res => res.data)

// Staff APIs
export const getTodos = () => api.get('/staff/todos').then(res => res.data)
export const submitMaintenance = (location: string, message: string) => api.post('/staff/maintenance', { location, message }).then(res => res.data)
export const submitPatrol = (area: string, status: string, message: string) => api.post('/staff/patrol', { area, status, message }).then(res => res.data)

// Item Memos APIs
export const getItemMemos = () => api.get('/customer/memos').then(res => res.data)
export const createItemMemo = (data: any) => api.post('/customer/memos', data).then(res => res.data)
export const updateItemMemo = (id: number, data: any) => api.put(`/customer/memos/${id}`, data).then(res => res.data)
export const deleteItemMemo = (id: number) => api.delete(`/customer/memos/${id}`).then(res => res.data)
export const uploadImage = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data)
}

// Notice & Activity APIs
export const getNotices = (params?: { urgent?: boolean }) => api.get('/notice', { params }).then(res => res.data)
export const getActivities = (params?: { storeId?: number, storeIds?: string }) => api.get('/activities', { params }).then(res => res.data.data || [])

// Community APIs
export const getPosts = (params?: { category?: string, tab?: string, page?: number, limit?: number, storeId?: number }) => api.get('/posts', { params }).then(res => res.data)
export const getPostDetail = (id: number) => api.get(`/posts/${id}`).then(res => res.data)
export const publishPost = (data: any) => api.post('/posts', data).then(res => res.data)
export const updatePost = (id: number, data: any) => api.put(`/posts/${id}`, data).then(res => res.data)
export const deletePost = (id: number) => api.delete(`/posts/${id}`).then(res => res.data)
export const likePost = (id: number) => api.post(`/posts/${id}/like`).then(res => res.data)
export const collectPost = (id: number) => api.post(`/posts/${id}/collect`).then(res => res.data)
export const reportPost = (id: number, data: { reason: string, description: string }) => api.post(`/posts/${id}/report`, data).then(res => res.data)
export const getPostInteraction = (id: number) => api.get(`/posts/${id}/interaction`).then(res => res.data)

export const getComments = (postId: number) => api.get(`/comments/post/${postId}`).then(res => res.data)
export const publishComment = (data: any) => api.post('/comments', data).then(res => res.data)
export const likeComment = (id: number) => api.post(`/comments/${id}/like`).then(res => res.data)
export const reportComment = (id: number, data: { reason: string, description: string }) => api.post(`/comments/${id}/report`, data).then(res => res.data)

export const getMyPosts = () => api.get('/posts/my').then(res => res.data)
export const getMyCollections = () => api.get('/posts/collections').then(res => res.data)
export const getMyReceivedComments = () => api.get('/comments/my/received').then(res => res.data)

// Traffic APIs
export const getStoreTraffic = (storeId: number) => api.get(`/traffic/${storeId}`).then(res => res.data)
export const submitStoreTraffic = (storeId: number, floor: number, level: number) => api.post('/traffic', { storeId, floor, level }).then(res => res.data)

// Parking APIs
export const getParkingRules = () => api.get('/parking').then(res => res.data)
