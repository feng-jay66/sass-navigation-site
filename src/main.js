import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import FrontendLoginView from './views/FrontendLoginView.vue'
import FrontendRegisterView from './views/FrontendRegisterView.vue'
import FrontendProfileView from './views/FrontendProfileView.vue'
import AdminLoginView from './views/AdminLoginView.vue'
import AdminDashboardView from './views/AdminDashboardView.vue'
import { ADMIN_TOKEN_KEY, FRONTEND_TOKEN_KEY, clearFrontendSession } from './api'
import './style.css'

const routes = [
  { path: '/', component: HomeView, meta: { requiresFrontendAuth: true } },
  { path: '/login', component: FrontendLoginView, meta: { guestOnlyFrontend: true } },
  { path: '/register', component: FrontendRegisterView, meta: { guestOnlyFrontend: true } },
  { path: '/me', component: FrontendProfileView, meta: { requiresFrontendAuth: true } },
  { path: '/admin/login', component: AdminLoginView },
  { path: '/admin', redirect: '/admin/dashboard' },
  { path: '/admin/dashboard', component: AdminDashboardView, meta: { requiresAdminAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const frontendToken = localStorage.getItem(FRONTEND_TOKEN_KEY)
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY)

  if (to.meta?.requiresFrontendAuth && !frontendToken) {
    clearFrontendSession()
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  }

  if (to.meta?.guestOnlyFrontend && frontendToken) {
    const redirect = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')
      ? to.query.redirect
      : '/'
    return redirect
  }

  if (to.meta?.requiresAdminAuth && !adminToken) {
    return '/admin/login'
  }

  if (to.path === '/admin/login' && adminToken) {
    return '/admin/dashboard'
  }

  return true
})

createApp(App).use(router).mount('#app')
