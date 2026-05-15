<template>
  <div class="page" :class="theme">
    <nav class="top-nav fade-in-up">
      <div class="top-nav-brand">
        <span class="top-nav-mark"></span>
        <span class="top-nav-brand-title">{{ settings.site?.value?.siteName || 'Personal Navigation' }}</span>
      </div>
      <div class="top-nav-links top-nav-links-centered">
        <a class="top-nav-link" href="#content-start">导航</a>
        <a class="top-nav-link" href="#profile-section">关于我</a>
        <router-link class="top-nav-link" to="/me">用户中心</router-link>
        <a class="top-nav-link" href="/admin/login">后台</a>
      </div>
    </nav>

    <header class="hero fade-in-up fade-delay-1">
      <div class="hero-copy">
        <div class="hero-copy-main">
          <p class="hero-badge">{{ settings.site?.value?.siteName || 'Personal Navigation' }}</p>
          <h1>让常用网站，<span class="hero-highlight">像 iPhone 官网一样优雅呈现。</span></h1>
        </div>
        <div class="hero-actions">
          <button class="primary-cta" @click="scrollToContent">浏览导航</button>
          <button class="secondary" @click="toggleTheme">{{ theme === 'dark' ? '切换浅色' : '切换深色' }}</button>
          <router-link class="quick-link" to="/me">我的账号</router-link>
          <button class="secondary" type="button" @click="logoutFrontend">退出前台</button>
        </div>
      </div>

      <div class="hero-side hero-side-mobile-compact">
        <div class="hero-search-shell glass-panel fade-in-up fade-delay-3">
          <div class="hero-search-copy">
            <span class="hero-search-kicker">Quick Access</span>
            <strong>搜索、筛选、直达。</strong>
          </div>
          <form class="search-box search-box-desktop-elevated section-shell" @submit.prevent="triggerSearch">
            <input
              v-model="keyword"
              placeholder="搜索网站 / 描述 / 标签 / 分类"
              @keydown.enter.prevent="triggerSearch"
            />
            <div class="search-actions-row">
              <button type="submit" class="search-submit" :disabled="searchLoading">
                <span v-if="searchLoading" class="search-spinner" aria-hidden="true"></span>
                <span>{{ searchLoading ? '搜索中...' : '搜索' }}</span>
              </button>
              <button type="button" class="search-clear" @click="clearSearch">清空</button>
            </div>
          </form>
          <div v-if="showSearchFeedback" class="search-feedback-panel">
            <div v-if="searchLoading" class="search-feedback-state search-feedback-loading">
              <span class="search-spinner" aria-hidden="true"></span>
              <span>正在搜索相关内容…</span>
            </div>
            <div v-else-if="searchExecuted && !searchResults.length" class="search-feedback-state search-feedback-empty">
              <strong>未找到结果</strong>
              <p>试试更短的关键词，或者换成分类、标签名称再搜一次。</p>
            </div>
            <div v-else-if="searchResults.length" class="search-results-list">
              <button
                v-for="item in searchResults"
                :key="item.key"
                type="button"
                class="search-result-item"
                @click="jumpToSearchResult(item)"
              >
                <div class="search-result-main">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.subtitle }}</p>
                </div>
                <div class="search-result-meta">
                  <span class="search-result-kind">{{ item.kindLabel }}</span>
                  <div v-if="item.tags?.length" class="search-result-tags">
                    <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <section class="section fade-in-up fade-delay-2" v-if="announcements.length">
      <div class="section-shell">
        <div class="section-title-row">
          <div>
            <p class="section-eyebrow">Latest Updates</p>
            <h2>公告</h2>
          </div>
        </div>
        <div class="notice-list links-grid">
          <article class="notice" v-for="item in announcements" :key="item.id">
            <strong>{{ item.title }}</strong>
            <p>{{ item.content }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section fade-in-up fade-delay-2" id="featured-section">
      <div class="section-shell">
        <div class="section-title-row">
          <div>
            <p class="section-eyebrow">Featured</p>
            <h2>推荐网站</h2>
          </div>
          <span class="section-lead">更常用、也更值得放在第一屏看到。</span>
        </div>
        <div class="links-grid links-grid-featured">
          <article class="site-card featured" v-for="site in featuredLinks" :key="site.id" :id="`site-card-${site.id}`">
            <div class="site-card-topline">
              <span class="site-card-kicker">Featured site</span>
              <span class="tag hot">推荐</span>
            </div>
            <div class="site-head"><strong>{{ site.title }}</strong></div>
            <p>{{ site.description }}</p>
            <div class="site-card-meta-row">
              <span class="site-card-meta-pill">{{ site.categoryName }}</span>
              <span class="site-card-meta-note">精选导航推荐</span>
            </div>
            <div class="meta"><span v-for="tag in site.tags" :key="tag.id" class="tag">{{ tag.name }}</span></div>
            <button class="link-button" type="button" @click="openLink(site)">打开链接</button>
          </article>
        </div>
      </div>
    </section>

    <section class="section fade-in-up fade-delay-3" id="content-start">
      <div class="section-shell">
        <div class="section-title-row">
          <div>
            <p class="section-eyebrow">Categories</p>
            <h2>分类导航</h2>
          </div>
          <span class="section-lead">按场景快速切换，把常用工具整齐收进一个入口。</span>
        </div>
        <div class="chips">
          <button
            v-for="cat in filterCategories"
            :key="cat"
            type="button"
            :class="['chip', { active: activeCategory === cat }]"
            @click="activeCategory = cat"
          >
            {{ cat }}
          </button>
        </div>
      </div>
    </section>

    <section class="section fade-in-up fade-delay-3">
      <div v-if="filteredSections.length" class="section-stack">
        <div class="panel section-shell panel-spacious" v-for="section in filteredSections" :key="section.id" :id="`section-${section.id}`">
          <div class="panel-header panel-header-spacious">
            <div>
              <p class="section-eyebrow">{{ section.name }}</p>
              <h2>{{ section.description || section.name }}</h2>
            </div>
            <span class="label">{{ section.links.length }} 个站点</span>
          </div>
          <div class="links-grid">
            <article class="site-card" v-for="site in section.links" :key="site.id" :id="`site-card-${site.id}`">
              <div class="site-head">
                <strong>{{ site.title }}</strong>
                <span class="label">点击 {{ site.clickCount }}</span>
              </div>
              <p>{{ site.description }}</p>
              <div class="site-card-meta-row">
                <span class="site-card-meta-pill site-card-url">{{ site.url }}</span>
                <span class="site-card-meta-note">{{ section.name }}</span>
              </div>
              <div class="meta">
                <span v-for="tag in site.tags" :key="tag.id" class="tag">{{ tag.name }}</span>
              </div>
              <button class="link-button" type="button" @click="openLink(site)">访问网站</button>
            </article>
          </div>
        </div>
      </div>
      <div v-else class="empty">没有找到匹配的网站</div>
    </section>

    <section class="section fade-in-up fade-delay-4" id="profile-section">
      <div class="profile-grid">
        <div class="panel section-shell">
          <div class="panel-header">
            <div>
              <p class="section-eyebrow">Profile</p>
              <h2>个人信息</h2>
            </div>
          </div>
          <div class="profile">
            <div v-if="settings.profile?.value?.avatar" class="avatar avatar-image-shell">
              <img :src="settings.profile?.value?.avatar" alt="个人头像" class="avatar-static-image" />
            </div>
            <div v-else class="avatar">{{ profileInitial }}</div>
            <div>
              <p>昵称：{{ settings.profile?.value?.nickname || 'H' }}</p>
              <p>简介：{{ settings.profile?.value?.bio || '欢迎来到我的导航站' }}</p>
              <p>邮箱：{{ settings.profile?.value?.email || '-' }}</p>
              <p>GitHub：{{ settings.profile?.value?.github || '-' }}</p>
              <p>博客：{{ settings.profile?.value?.blog || '-' }}</p>
            </div>
          </div>
        </div>
        <div class="panel section-shell">
          <div class="panel-header">
            <div>
              <p class="section-eyebrow">Friends</p>
              <h2>友情链接</h2>
            </div>
          </div>
          <ul class="friend-list">
            <li v-for="item in friendLinks" :key="item.id">
              <a :href="item.url" target="_blank" rel="noreferrer">{{ item.name }}</a>
              <span>{{ item.description }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, clearFrontendSession } from '../api'

const router = useRouter()
const data = ref({ settings: {}, categories: [], featuredLinks: [], announcements: [], friendLinks: [] })
const keyword = ref('')
const activeCategory = ref('全部')
const theme = ref(localStorage.getItem('siteTheme') || 'light')
const searchLoading = ref(false)
const searchExecuted = ref(false)
const searchResults = ref([])

const load = async () => {
  data.value = await api.getHome()
}

const normalizeText = (value) => String(value ?? '').trim().toLowerCase()
const normalizeTags = (tags = []) => tags.map(tag => typeof tag === 'string' ? tag : tag?.name).filter(Boolean)

const matchesKeyword = (site, categoryName, normalizedKeyword) => {
  const fields = [
    site.title,
    site.name,
    site.description,
    categoryName,
    ...(normalizeTags(site.tags || []))
  ]

  return fields.some(field => normalizeText(field).includes(normalizedKeyword))
}

const mapSiteToSearchResult = (site, categoryName = '') => ({
  key: `site-${site.id}`,
  type: 'external',
  kindLabel: '外部网站',
  title: site.title || site.name || '未命名网站',
  subtitle: site.description || categoryName || site.url,
  tags: normalizeTags(site.tags || []),
  target: site,
  targetId: `site-card-${site.id}`
})

const buildSearchResults = (result, searchKeyword) => {
  const normalizedKeyword = normalizeText(searchKeyword)
  const list = []
  const sourceItems = result.items || []

  if (sourceItems.length) {
    sourceItems.forEach(site => {
      if (matchesKeyword(site, site.categoryName || '', normalizedKeyword)) {
        list.push(mapSiteToSearchResult(site, site.categoryName || ''))
      }
    })
  }

  ;(result.featuredLinks || []).forEach(site => {
    if (matchesKeyword(site, site.categoryName || '', normalizedKeyword)) {
      list.push(mapSiteToSearchResult(site, site.categoryName || ''))
    }
  })

  ;(result.categories || []).forEach(section => {
    const categoryName = section.name || ''
    const sectionFields = [categoryName, section.description]
    if (sectionFields.some(field => normalizeText(field).includes(normalizedKeyword))) {
      list.push({
        key: `section-${section.id}`,
        type: 'anchor',
        kindLabel: '页面分区',
        title: categoryName,
        subtitle: section.description || '跳转到对应分类区块',
        tags: ['分类'],
        targetId: `section-${section.id}`,
        categoryName
      })
    }

    ;(section.links || []).forEach(site => {
      if (matchesKeyword(site, categoryName, normalizedKeyword)) {
        list.push(mapSiteToSearchResult(site, categoryName))
      }
    })
  })

  const deduped = []
  const seen = new Set()
  for (const item of list) {
    if (seen.has(item.key)) continue
    seen.add(item.key)
    deduped.push(item)
  }
  return deduped
}

const triggerSearch = async () => {
  const trimmed = keyword.value.trim()
  if (!trimmed) {
    await clearSearch()
    return
  }

  searchLoading.value = true
  searchExecuted.value = false
  try {
    const result = await api.searchSites(trimmed)
    if (result.categories) data.value.categories = result.categories
    if (result.featuredLinks) data.value.featuredLinks = result.featuredLinks
    searchResults.value = buildSearchResults(result, trimmed)
    searchExecuted.value = true
  } finally {
    searchLoading.value = false
  }
}

const clearSearch = async () => {
  keyword.value = ''
  searchLoading.value = false
  searchExecuted.value = false
  searchResults.value = []
  activeCategory.value = '全部'
  await load()
}

const openLink = async (site) => {
  window.open(site.url, '_blank', 'noopener,noreferrer')
  try {
    await api.clickLink(site.id)
  } catch (error) {
    console.error('click tracking failed', error)
  }
}

const highlightElement = (element) => {
  if (!element) return
  element.classList.add('search-target-highlight')
  window.setTimeout(() => element.classList.remove('search-target-highlight'), 1800)
}

const jumpToSearchResult = async (item) => {
  if (item.type === 'external' && item.target) {
    const targetElement = document.getElementById(item.targetId)
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      highlightElement(targetElement)
    }
    await openLink(item.target)
    return
  }

  if (item.type === 'anchor' && item.targetId) {
    if (item.categoryName) {
      activeCategory.value = item.categoryName
      await nextTick()
    }
    const targetElement = document.getElementById(item.targetId)
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      highlightElement(targetElement)
    }
  }
}

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('siteTheme', theme.value)
  document.documentElement.dataset.theme = theme.value
}

const scrollToContent = () => {
  document.getElementById('content-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const logoutFrontend = async () => {
  try {
    await api.frontendLogout()
  } catch (error) {
    console.error('frontend logout failed', error)
  } finally {
    clearFrontendSession()
    router.replace('/login')
  }
}

const settings = computed(() => data.value.settings || {})
const announcements = computed(() => data.value.announcements || [])
const friendLinks = computed(() => data.value.friendLinks || [])
const featuredLinks = computed(() => data.value.featuredLinks || [])
const filterCategories = computed(() => ['全部', ...(data.value.categories || []).map(item => item.name)])
const filteredSections = computed(() => {
  const source = data.value.categories || []
  if (activeCategory.value === '全部') return source
  return source.filter(item => item.name === activeCategory.value)
})
const profileInitial = computed(() => (settings.value.profile?.value?.nickname || 'H').slice(0, 1).toUpperCase())
const showSearchFeedback = computed(() => searchLoading.value || searchExecuted.value)

onMounted(async () => {
  document.documentElement.dataset.theme = theme.value
  await load()
})
</script>
