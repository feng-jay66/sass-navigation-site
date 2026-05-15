export const API_BASE = import.meta.env.VITE_API_BASE || ''

export const FRONTEND_TOKEN_KEY = 'siteUserToken'
export const FRONTEND_USER_KEY = 'siteUser'
export const ADMIN_TOKEN_KEY = 'adminToken'
export const ADMIN_USER_KEY = 'adminUser'

export function getToken(tokenType = 'admin') {
  if (tokenType === 'site') {
    return localStorage.getItem(FRONTEND_TOKEN_KEY) || ''
  }
  return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export function clearFrontendSession() {
  localStorage.removeItem(FRONTEND_TOKEN_KEY)
  localStorage.removeItem(FRONTEND_USER_KEY)
}

export function setFrontendSession(token, user) {
  localStorage.setItem(FRONTEND_TOKEN_KEY, token)
  localStorage.setItem(FRONTEND_USER_KEY, JSON.stringify(user || null))
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const hasJsonBody = options.body !== undefined && !(options.body instanceof FormData)
  if (hasJsonBody) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }
  const tokenType = options.tokenType || 'admin'
  const token = getToken(tokenType)
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

  if (response.status === 401 && tokenType === 'site') {
    clearFrontendSession()
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

  frontendRegister: (payload) => request('/api/site/auth/register', { method: 'POST', body: JSON.stringify(payload), tokenType: 'site' }),
  frontendLogin: (payload) => request('/api/site/auth/login', { method: 'POST', body: JSON.stringify(payload), tokenType: 'site' }),
  frontendMe: () => request('/api/site/auth/me', { tokenType: 'site' }),
  frontendLogout: () => request('/api/site/auth/logout', { method: 'POST', body: JSON.stringify({}), tokenType: 'site' }),

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
