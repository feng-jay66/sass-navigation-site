<template>
  <div class="auth-shell auth-shell-immersive">
    <div class="auth-scene-layer auth-scene-layer-back"></div>
    <div class="auth-scene-layer auth-scene-layer-glow"></div>

    <div class="auth-page auth-page-immersive">
      <section class="auth-copy auth-copy-immersive glass-panel">
        <div class="auth-copy-main">
          <p class="section-eyebrow">Create Account</p>
          <h2>注册前台账号。</h2>
          <p>创建独立前台用户后，你就可以登录访问首页和个人中心，不再和后台管理员账号混用。</p>
        </div>

        <div class="spotlight-metrics spotlight-metrics-immersive">
          <div class="metric-chip">
            <strong>Independent</strong>
            <span>前台用户与后台管理员完全分离</span>
          </div>
          <div class="metric-chip">
            <strong>Fast</strong>
            <span>注册成功后可直接跳转登录</span>
          </div>
        </div>
      </section>

      <form class="auth-card auth-card-immersive" @submit.prevent="submit">
        <div class="auth-card-topline">
          <p class="section-eyebrow">Frontend Register</p>
          <span class="auth-status-dot"></span>
        </div>
        <h1>前台注册</h1>
        <p class="sub">填写你的前台账号信息</p>

        <label class="auth-field">
          <span>用户名</span>
          <input v-model="form.username" autocomplete="username" placeholder="至少 3 位" />
        </label>

        <label class="auth-field">
          <span>昵称</span>
          <input v-model="form.nickname" autocomplete="nickname" placeholder="显示名称" />
        </label>

        <label class="auth-field">
          <span>邮箱</span>
          <input v-model="form.email" type="email" autocomplete="email" placeholder="可选" />
        </label>

        <label class="auth-field">
          <span>密码</span>
          <input v-model="form.password" type="password" autocomplete="new-password" placeholder="至少 6 位" />
        </label>

        <button class="auth-submit-button" :disabled="loading">{{ loading ? '注册中...' : '创建前台账号' }}</button>
        <p v-if="success" class="success-text">{{ success }}</p>
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
const success = ref('')
const form = reactive({ username: '', nickname: '', email: '', password: '' })

const submit = async () => {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    await api.frontendRegister(form)
    success.value = '注册成功，正在跳转登录页...'
    setTimeout(() => {
      router.replace({ path: '/login', query: { username: form.username } })
    }, 600)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
