import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import AdminLoginView from './views/AdminLoginView.vue'
import AdminDashboardView from './views/AdminDashboardView.vue'
import './style.css'

const routes = [
  { path: '/', component: HomeView },
  { path: '/admin/login', component: AdminLoginView },
  { path: '/admin', redirect: '/admin/dashboard' },
  { path: '/admin/dashboard', component: AdminDashboardView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  if (to.path.startsWith('/admin') && to.path !== '/admin/login') {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      return '/admin/login'
    }
  }
  if (to.path === '/admin/login' && localStorage.getItem('adminToken')) {
    return '/admin/dashboard'
  }
  return true
})

createApp(App).use(router).mount('#app')
