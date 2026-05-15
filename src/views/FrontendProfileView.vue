<template>
  <div class="page profile-center-page">
    <section class="panel profile-center-panel">
      <div class="panel-header profile-center-header">
        <div>
          <p class="section-eyebrow">User Center</p>
          <h2>前台用户中心</h2>
          <p>查看当前前台账号信息，并可安全退出。</p>
        </div>
        <div class="profile-center-actions">
          <button class="secondary" type="button" @click="goHome">返回首页</button>
          <button class="danger" type="button" @click="logout" :disabled="loading">{{ loading ? '退出中...' : '退出登录' }}</button>
        </div>
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>

      <div v-if="user" class="profile-center-grid">
        <div class="profile-center-card">
          <span class="profile-center-label">用户名</span>
          <strong>{{ user.username }}</strong>
        </div>
        <div class="profile-center-card">
          <span class="profile-center-label">昵称</span>
          <strong>{{ user.nickname || '未设置' }}</strong>
        </div>
        <div class="profile-center-card">
          <span class="profile-center-label">邮箱</span>
          <strong>{{ user.email || '未设置' }}</strong>
        </div>
        <div class="profile-center-card">
          <span class="profile-center-label">最近登录</span>
          <strong>{{ user.lastLoginAt || '暂无' }}</strong>
        </div>
        <div class="profile-center-card profile-center-card-wide">
          <span class="profile-center-label">个人简介</span>
          <p>{{ user.bio || '这个用户还没有填写简介。' }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, clearFrontendSession } from '../api'

const router = useRouter()
const user = ref(null)
const error = ref('')
const loading = ref(false)

const loadMe = async () => {
  try {
    user.value = await api.frontendMe()
  } catch (err) {
    error.value = err.message
  }
}

const goHome = () => {
  router.push('/')
}

const logout = async () => {
  loading.value = true
  error.value = ''
  try {
    await api.frontendLogout()
  } catch (err) {
    error.value = err.message
  } finally {
    clearFrontendSession()
    loading.value = false
    router.replace('/login')
  }
}

onMounted(loadMe)
</script>
