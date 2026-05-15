<template>
  <div class="auth-shell">
    <div class="auth-page">
      <section class="auth-copy glass-panel">
        <div>
          <p class="section-eyebrow">Admin Access</p>
          <h2>像 Apple 一样克制、清晰、专注的后台入口。</h2>
          <p>统一手机与电脑端体验，使用更轻盈的玻璃质感和更强的可读性，让后台操作也保持高级感。</p>
        </div>
        <div class="spotlight-metrics">
          <div class="metric-chip">
            <strong>Responsive</strong>
            <span>手机 / 平板 / 电脑自适应</span>
          </div>
          <div class="metric-chip">
            <strong>Focused</strong>
            <span>减少噪音，专注管理内容</span>
          </div>
        </div>
      </section>

      <form class="auth-card" @submit.prevent="submit">
        <p class="section-eyebrow">Sign in</p>
        <h1>后台登录</h1>
        <p class="sub">请输入你的管理员账号与密码</p>
        <input v-model="form.username" placeholder="用户名" />
        <input v-model="form.password" type="password" placeholder="密码" />
        <button :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
        <p v-if="error" class="error-text">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const form = reactive({ username: '', password: '' })

const submit = async () => {
  error.value = ''
  loading.value = true
  try {
    const data = await api.login(form)
    localStorage.setItem('adminToken', data.token)
    localStorage.setItem('adminUser', JSON.stringify(data.userInfo))
    router.push('/admin/dashboard')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
