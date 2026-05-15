export const API_BASE = import.meta.env.VITE_API_BASE || ''

function getToken() {
  return localStorage.getItem('adminToken') || ''
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const hasJsonBody = options.body !== undefined && !(options.body instanceof FormData)
  if (hasJsonBody) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  })
  const rawText = await response.text()
  let json

  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch (error) {
    const preview = rawText.slice(0, 200).replace(/\s+/g, ' ').trim()
    throw new Error(preview ? `服务端返回了非 JSON 内容：${preview}` : '服务端返回了空响应')
  }

  if (!response.ok || json?.code !== 0) {
    throw new Error(json?.message || '请求失败')
  }
  return json.data
}

export const api = {
  getHome: () => request('/api/site/home'),
  searchSites: (keyword) => request(`/api/site/search?keyword=${encodeURIComponent(keyword)}`),
  clickLink: (id) => request(`/api/site/link/${id}/click`, { method: 'POST' }),
  login: (payload) => request('/api/admin/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/api/admin/auth/me'),
  getStats: () => request('/api/admin/dashboard/stats'),
  getCategories: () => request('/api/admin/categories'),
  createCategory: (payload) => request('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id, payload) => request(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCategory: (id) => request(`/api/admin/categories/${id}`, { method: 'DELETE' }),
  getLinks: () => request('/api/admin/links'),
  createLink: (payload) => request('/api/admin/links', { method: 'POST', body: JSON.stringify(payload) }),
  updateLink: (id, payload) => request(`/api/admin/links/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteLink: (id) => request(`/api/admin/links/${id}`, { method: 'DELETE' }),
  getTags: () => request('/api/admin/tags'),
  createTag: (payload) => request('/api/admin/tags', { method: 'POST', body: JSON.stringify(payload) }),
  updateTag: (id, payload) => request(`/api/admin/tags/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTag: (id) => request(`/api/admin/tags/${id}`, { method: 'DELETE' }),
  getAnnouncements: () => request('/api/admin/announcements'),
  createAnnouncement: (payload) => request('/api/admin/announcements', { method: 'POST', body: JSON.stringify(payload) }),
  updateAnnouncement: (id, payload) => request(`/api/admin/announcements/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAnnouncement: (id) => request(`/api/admin/announcements/${id}`, { method: 'DELETE' }),
  getFriendLinks: () => request('/api/admin/friend-links'),
  createFriendLink: (payload) => request('/api/admin/friend-links', { method: 'POST', body: JSON.stringify(payload) }),
  updateFriendLink: (id, payload) => request(`/api/admin/friend-links/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteFriendLink: (id) => request(`/api/admin/friend-links/${id}`, { method: 'DELETE' }),
  getSettings: () => request('/api/admin/settings'),
  updateSettings: (payload) => request('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  upload: (formData) => request('/api/admin/upload', { method: 'POST', body: formData }),
  uploadPublicAvatar: (formData) => request('/api/site/profile/avatar', { method: 'POST', body: formData }),
  resetPublicAvatar: () => request('/api/site/profile/avatar', { method: 'DELETE' })
}
