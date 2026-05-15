<template>
  <div class="auth-shell auth-shell-immersive">
    <div class="auth-scene-layer auth-scene-layer-back"></div>
    <div class="auth-scene-layer auth-scene-layer-glow"></div>

    <div class="auth-page auth-page-immersive">
      <section class="auth-copy auth-copy-immersive glass-panel">
        <div class="auth-copy-main">
          <p class="section-eyebrow">Member Access</p>
          <h2>先登录，再进入前台。</h2>
          <p>
            这是前台用户登录入口。未登录访问首页时，会先跳转到这里完成身份验证。
          </p>
        </div>

        <div class="auth-character-stage" aria-hidden="true">
          <div class="character-halo"></div>
          <div class="character-card">
            <div class="character-head">
              <span class="character-eye left"></span>
              <span class="character-eye right"></span>
              <span class="character-mouth"></span>
            </div>
            <div class="character-body">
              <span class="character-arm left"></span>
              <span class="character-arm right"></span>
              <span class="character-core"></span>
            </div>
          </div>
          <div class="character-shadow"></div>
        </div>

        <div class="spotlight-metrics spotlight-metrics-immersive">
          <div class="metric-chip">
            <strong>Protected</strong>
            <span>前台内容需登录后访问</span>
          </div>
          <div class="metric-chip">
            <strong>Smooth</strong>
            <span>登录后自动跳转回目标页面</span>
          </div>
        </div>
      </section>

      <form class="auth-card auth-card-immersive" @submit.prevent="submit">
        <div class="auth-card-topline">
          <p class="section-eyebrow">Frontend Sign in</p>
          <span class="auth-status-dot"></span>
        </div>
        <h1>前台登录</h1>
        <p class="sub">请输入前台访问账号与密码</p>

        <label class="auth-field">
          <span>用户名</span>
          <input v-model="form.username" autocomplete="username" placeholder="输入前台用户名" />
        </label>

        <label class="auth-field">
          <span>密码</span>
          <input v-model="form.password" type="password" autocomplete="current-password" placeholder="输入登录密码" />
        </label>

        <button class="auth-submit-button" :disabled="loading">{{ loading ? '登录中...' : '进入前台' }}</button>
        <div class="auth-helper-row">
          <span>还没有账号？</span>
          <router-link to="/register">去注册</router-link>
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, setFrontendSession } from '../api'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref('')
const form = reactive({ username: typeof route.query.username === 'string' ? route.query.username : '', password: '' })

const submit = async () => {
  error.value = ''
  loading.value = true
  try {
    const data = await api.frontendLogin(form)
    setFrontendSession(data.token, data.user)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/'
    router.replace(redirect)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
