<template>
  <div class="admin-shell">
    <header class="admin-topbar glass-panel" v-if="isMobile">
      <div>
        <p class="section-eyebrow">Admin Panel</p>
        <strong>导航站后台</strong>
      </div>
      <button type="button" class="mobile-nav-toggle" @click="mobileNavOpen = !mobileNavOpen">
        {{ mobileNavOpen ? '关闭菜单' : '打开菜单' }}
      </button>
    </header>

    <div class="mobile-nav-overlay" :class="{ open: mobileNavOpen }" v-if="isMobile && mobileNavOpen" @click.self="mobileNavOpen = false">
      <div class="mobile-nav-panel">
        <button
          v-for="tab in tabs"
          :key="`mobile-${tab}`"
          type="button"
          :class="['nav-btn', { active: activeTab === tab }]"
          @click="selectTab(tab)"
        >
          {{ tab }}
        </button>
        <button type="button" class="nav-btn danger" @click="logout">退出登录</button>
      </div>
    </div>

    <div class="admin-page">
      <aside class="sidebar">
        <p class="section-eyebrow">Admin Panel</p>
        <h2>导航站后台</h2>
        <button v-for="tab in tabs" :key="tab" type="button" :class="['nav-btn', { active: activeTab === tab }]" @click="selectTab(tab)">
          {{ tab }}
        </button>
        <button type="button" class="nav-btn danger" @click="logout">退出登录</button>
      </aside>

      <main class="admin-main">
        <header class="admin-header">
          <div>
            <p class="section-eyebrow">Now Editing</p>
            <h1>{{ activeTab }}</h1>
            <p class="sub">管理导航站内容并实时影响前台展示</p>
          </div>
          <button type="button" class="secondary" @click="loadAll" :disabled="actionLoading">刷新数据</button>
        </header>

        <div v-if="floatingNotice.visible" :class="['action-toast', floatingNotice.type, { 'is-visible': floatingNotice.visible }]" role="status" aria-live="polite">
          <span class="action-toast-icon">{{ floatingNotice.type === 'success' ? '✓' : '!' }}</span>
          <div>
            <strong>{{ floatingNotice.type === 'success' ? '操作成功' : '操作失败' }}</strong>
            <p>{{ floatingNotice.message }}</p>
          </div>
        </div>

        <p v-if="actionMessage" class="success-text">{{ actionMessage }}</p>
        <p v-if="actionError" class="error-text">{{ actionError }}</p>

        <section v-if="activeTab === '概览'" class="crud-section">
          <div class="admin-grid">
            <button
              type="button"
              :class="['stat-card', 'stat-card-button', item.emphasis]"
              v-for="item in overviewCards"
              :key="item.label"
              @click="handleOverviewCardClick(item)"
            >
              <div class="stat-card-body" :class="item.emphasis">
                <span class="stat-kicker">{{ item.label }}</span>
                <div class="value stat-value-center">{{ item.value }}</div>
                <div class="stat-note stat-note-center">{{ item.sublabel }}</div>
              </div>
            </button>
          </div>

          <div class="admin-grid compact-grid trend-summary-grid">
            <button
              type="button"
              :class="['stat-card', 'stat-card-summary', 'trend-summary-button', item.emphasis]"
              v-for="item in trendCards"
              :key="`trend-${item.label}`"
              @click="handleTrendCardClick(item)"
            >
              <div class="stat-card-body" :class="item.emphasis">
                <span class="stat-kicker">{{ item.label }}</span>
                <div class="value stat-value-center">{{ item.value }}</div>
                <div class="stat-note stat-note-center">{{ item.hint }}</div>
              </div>
            </button>
          </div>

          <div class="panel section-shell dashboard-split" v-if="visitChartPoints.length || quickActions.length">
            <div>
              <div class="panel-header">
                <div>
                  <p class="section-eyebrow">Traffic Trend</p>
                  <h2>访问趋势</h2>
                </div>
              </div>
              <div class="trend-card" v-if="visitChartPoints.length">
                <div class="trend-summary-head">
                  <div>
                    <strong>{{ trendInsight.primary }}</strong>
                    <p>{{ trendInsight.secondary }}</p>
                  </div>
                  <span class="trend-badge">{{ trendInsight.badge }}</span>
                </div>
                <div class="trend-bars">
                  <div class="trend-bar-wrap" v-for="item in visitChartPoints" :key="item.label">
                    <div class="trend-bar-track">
                      <div class="trend-bar" :style="{ height: `${item.height}%` }"></div>
                    </div>
                    <span>{{ item.value }}</span>
                    <strong>{{ item.label }}</strong>
                  </div>
                </div>
                <div class="trend-axis-note">
                  <span>近 7 天访问节奏</span>
                  <span>峰值 {{ trendInsight.peakValue }}</span>
                </div>
              </div>
              <div v-else class="empty">暂无趋势数据</div>
            </div>

            <div>
              <div class="panel-header">
                <div>
                  <p class="section-eyebrow">Quick Actions</p>
                  <h2>快捷操作</h2>
                </div>
              </div>
              <div class="quick-actions-grid">
                <button
                  v-for="item in quickActions"
                  :key="item.label"
                  type="button"
                  class="quick-action-card"
                  @click="selectTab(item.tab)"
                >
                  <span class="stat-kicker">{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <span class="stat-note stat-note-center">{{ item.hint }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="panel section-shell" v-if="recentActivities.length">
            <div class="panel-header">
              <div>
                <p class="section-eyebrow">Recent Activity</p>
                <h2>最近动态</h2>
              </div>
            </div>
            <div class="activity-list">
              <article v-for="item in recentActivities" :key="item.key" class="activity-item">
                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.time }}</p>
                </div>
                <span class="label">{{ item.meta }}</span>
              </article>
            </div>
          </div>

          <div class="panel section-shell" v-if="stats.value?.popularLinks?.length">
            <div class="panel-header">
              <div>
                <p class="section-eyebrow">Popular Links</p>
                <h2>热门网站</h2>
              </div>
            </div>
            <div class="crud-list">
              <article v-for="item in stats.value.popularLinks" :key="`popular-${item.id}`" class="crud-item">
                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.url }}</p>
                </div>
                <div class="item-actions">
                  <span class="label">点击 {{ item.clickCount ?? item.click_count ?? 0 }}</span>
                  <button type="button" class="secondary" @click="jumpToLink(item.id)">查看网站</button>
                </div>
              </article>
            </div>
          </div>

          <div class="panel section-shell" v-if="stats.value?.recentVisits?.length">
            <div class="panel-header">
              <div>
                <p class="section-eyebrow">Recent Visits</p>
                <h2>最近访问</h2>
              </div>
            </div>
            <div class="crud-list">
              <article v-for="(item, index) in stats.value.recentVisits" :key="`visit-${item.id || index}`" class="crud-item">
                <div>
                  <strong>{{ item.title || item.linkTitle || `访问记录 ${index + 1}` }}</strong>
                  <p>{{ item.visitedAt || item.createdAt || item.timestamp || '-' }}</p>
                </div>
                <div class="item-actions">
                  <span class="label">{{ item.url || item.ip || '查看详情' }}</span>
                  <button v-if="item.linkId || item.id" type="button" class="secondary" @click="jumpToLink(item.linkId || item.id)">定位网站</button>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section v-if="activeTab === '分类管理'" class="crud-section">
          <form class="inline-form" @submit.prevent="saveCategory">
            <input v-model="categoryForm.name" placeholder="分类名称" />
            <input v-model="categoryForm.description" placeholder="分类描述" />
            <input v-model="categoryForm.icon" placeholder="图标" />
            <input v-model.number="categoryForm.sortOrder" type="number" placeholder="排序" />
            <label><input v-model="categoryForm.isVisible" type="checkbox" /> 显示</label>
            <button :disabled="actionLoading">{{ categoryForm.id ? '更新' : '新增' }}</button>
            <button type="button" class="secondary" @click="resetCategory">重置</button>
          </form>
          <div class="crud-list">
            <article v-for="item in categories" :key="item.id" class="crud-item">
              <div>
                <strong>{{ item.name }}</strong>
                <p>{{ item.description }}</p>
              </div>
              <div class="item-actions">
                <button type="button" @click="editCategory(item)">编辑</button>
                <button type="button" class="danger" @click="removeCategory(item.id)">删除</button>
              </div>
            </article>
          </div>
        </section>

        <section v-if="activeTab === '网站管理'" class="crud-section">
          <form class="inline-form" @submit.prevent="saveLink">
            <input v-model="linkForm.title" placeholder="网站名称" />
            <input v-model="linkForm.url" placeholder="URL" />
            <input v-model="linkForm.description" placeholder="描述" />
            <select v-model.number="linkForm.categoryId">
              <option disabled value="0">选择分类</option>
              <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
            <input v-model="linkForm.tagIdsText" placeholder="标签ID，逗号分隔" />
            <label><input v-model="linkForm.isFeatured" type="checkbox" /> 推荐</label>
            <label><input v-model="linkForm.isVisible" type="checkbox" /> 显示</label>
            <button :disabled="actionLoading">{{ linkForm.id ? '更新' : '新增' }}</button>
            <button type="button" class="secondary" @click="resetLink">重置</button>
          </form>
          <div class="crud-list">
            <article v-for="item in links" :key="item.id" class="crud-item" :id="`admin-link-${item.id}`">
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.description }}</p>
                <p class="label">{{ item.url }}</p>
              </div>
              <div class="item-actions">
                <button type="button" @click="editLink(item)">编辑</button>
                <button type="button" class="danger" @click="removeLink(item.id)">删除</button>
              </div>
            </article>
          </div>
        </section>

        <section v-if="activeTab === '标签管理'" class="crud-section">
          <form class="inline-form" @submit.prevent="saveTag">
            <input v-model="tagForm.name" placeholder="标签名称" />
            <input v-model="tagForm.color" placeholder="颜色，如 #3b82f6" />
            <button :disabled="actionLoading">{{ tagForm.id ? '更新' : '新增' }}</button>
            <button type="button" class="secondary" @click="resetTag">重置</button>
          </form>
          <div class="crud-list">
            <article v-for="item in tags" :key="item.id" class="crud-item">
              <div><strong>{{ item.name }}</strong><p>{{ item.color }}</p></div>
              <div class="item-actions">
                <button type="button" @click="editTag(item)">编辑</button>
                <button type="button" class="danger" @click="removeTag(item.id)">删除</button>
              </div>
            </article>
          </div>
        </section>

        <section v-if="activeTab === '公告管理'" class="crud-section">
          <form class="inline-form" @submit.prevent="saveAnnouncement">
            <input v-model="announcementForm.title" placeholder="标题" />
            <input v-model="announcementForm.content" placeholder="内容" />
            <label><input v-model="announcementForm.isActive" type="checkbox" /> 启用</label>
            <label><input v-model="announcementForm.isPinned" type="checkbox" /> 置顶</label>
            <button :disabled="actionLoading">{{ announcementForm.id ? '更新' : '新增' }}</button>
            <button type="button" class="secondary" @click="resetAnnouncement">重置</button>
          </form>
          <div class="crud-list">
            <article v-for="item in announcements" :key="item.id" class="crud-item">
              <div><strong>{{ item.title }}</strong><p>{{ item.content }}</p></div>
              <div class="item-actions">
                <button type="button" @click="editAnnouncement(item)">编辑</button>
                <button type="button" class="danger" @click="removeAnnouncement(item.id)">删除</button>
              </div>
            </article>
          </div>
        </section>

        <section v-if="activeTab === '友链管理'" class="crud-section">
          <form class="inline-form" @submit.prevent="saveFriendLink">
            <input v-model="friendForm.name" placeholder="名称" />
            <input v-model="friendForm.url" placeholder="URL" />
            <input v-model="friendForm.description" placeholder="描述" />
            <label><input v-model="friendForm.isActive" type="checkbox" /> 启用</label>
            <button :disabled="actionLoading">{{ friendForm.id ? '更新' : '新增' }}</button>
            <button type="button" class="secondary" @click="resetFriendLink">重置</button>
          </form>
          <div class="crud-list">
            <article v-for="item in friendLinks" :key="item.id" class="crud-item">
              <div><strong>{{ item.name }}</strong><p>{{ item.description }}</p></div>
              <div class="item-actions">
                <button type="button" @click="editFriendLink(item)">编辑</button>
                <button type="button" class="danger" @click="removeFriendLink(item.id)">删除</button>
              </div>
            </article>
          </div>
        </section>

        <section v-if="activeTab === '站点设置'" class="crud-section">
          <form class="stack-form" @submit.prevent="saveSettings">
            <input v-model="settingsForm.siteName" placeholder="站点名称" />
            <input v-model="settingsForm.siteDescription" placeholder="站点描述" />
            <input v-model="settingsForm.heroTitle" placeholder="首页标题" />
            <input v-model="settingsForm.heroSubtitle" placeholder="首页副标题" />
            <div class="settings-avatar-block panel section-shell">
              <div class="panel-header">
                <div>
                  <p class="section-eyebrow">Profile Avatar</p>
                  <h2>个人头像</h2>
                </div>
              </div>
              <div class="settings-avatar-stage">
                <div class="settings-avatar-shell" :class="{ 'is-dragging': avatarDragActive, 'has-crop': !!avatarCropSource, 'has-avatar': !!settingsForm.avatar }" @dragenter.prevent="onAvatarDragEnter" @dragover.prevent="onAvatarDragOver" @dragleave.prevent="onAvatarDragLeave" @drop.prevent="onAvatarDrop">
                  <div class="settings-avatar-preview is-large" v-if="avatarCropPreview || settingsForm.avatar">
                    <img :src="avatarCropPreview || settingsForm.avatar" alt="当前头像" class="settings-avatar-image" />
                  </div>
                  <div v-else class="settings-avatar-preview settings-avatar-fallback is-large">{{ (settingsForm.nickname || 'H').slice(0, 1).toUpperCase() }}</div>

                  <div class="avatar-drop-overlay" v-if="avatarDragActive">
                    <span>拖拽到这里即可替换头像</span>
                  </div>

                  <div v-if="avatarCropSource" class="avatar-crop-layout">
                    <div class="avatar-crop-panel">
                      <div ref="avatarCropViewportRef" class="avatar-crop-viewport" @pointerdown="onCropPointerDown">
                        <img
                          ref="avatarCropImageRef"
                          :src="avatarCropSource"
                          alt="头像裁剪预览"
                          class="avatar-crop-image"
                          :style="avatarCropImageStyle"
                          @load="onAvatarCropImageLoad"
                          draggable="false"
                        />
                        <div class="avatar-crop-mask"></div>
                        <div class="avatar-crop-frame"></div>
                      </div>
                      <div class="avatar-crop-toolbar">
                        <label class="avatar-slider-field">
                          <span>缩放</span>
                          <input v-model.number="avatarCropScale" type="range" min="1" max="3" step="0.01" @input="clampAvatarCropPosition" />
                        </label>
                        <div class="avatar-crop-meta">
                          <span>拖动图片调整头像位置</span>
                          <strong>{{ Math.round(avatarCropScale * 100) }}%</strong>
                        </div>
                      </div>
                    </div>

                    <div class="avatar-crop-sidecard">
                      <div class="avatar-crop-mini-head">
                        <p class="section-eyebrow">TikTok Style</p>
                        <strong>圆形头像预览</strong>
                      </div>
                      <div class="settings-avatar-preview avatar-crop-mini-preview">
                        <img v-if="avatarCropPreview" :src="avatarCropPreview" alt="头像裁剪结果预览" class="settings-avatar-image" />
                        <span v-else>{{ (settingsForm.nickname || 'H').slice(0, 1).toUpperCase() }}</span>
                      </div>
                      <p class="muted">先拖拽或选择图片，再裁剪后上传，效果会更接近抖音头像的圆形展示。</p>
                    </div>
                  </div>
                </div>

                <div class="settings-avatar-actions enhanced-avatar-actions">
                  <input ref="settingsAvatarInputRef" class="hidden-file-input" type="file" accept="image/jpeg,image/png,image/webp" @change="onSettingsAvatarChange" />
                  <div class="avatar-actions-row">
                    <button type="button" class="secondary" :disabled="actionLoading" @click="openSettingsAvatarPicker">选择图片</button>
                    <button type="button" class="secondary" :disabled="actionLoading" @click="openSettingsAvatarPicker">拖拽上传</button>
                    <button type="button" :disabled="actionLoading || !avatarCropSource" @click="applySettingsAvatarCrop">裁剪并上传</button>
                    <button type="button" class="secondary" :disabled="actionLoading || !avatarCropSource" @click="clearAvatarCropState">取消裁剪</button>
                    <button type="button" class="secondary" :disabled="actionLoading || !settingsForm.avatar" @click="resetSettingsAvatar">重置头像</button>
                  </div>
                  <div class="avatar-actions-copy">
                    <p class="muted">支持 JPG / PNG / WebP，最大 5MB。支持拖拽上传、圆形裁剪预览、上传后同步到前台展示。</p>
                    <p class="avatar-status-hint" :class="{ ready: !!avatarCropSource }">
                      {{ avatarCropSource ? '已准备裁剪，确认位置后点击“裁剪并上传”' : '可直接把图片拖到卡片区域，进入头像裁剪步骤' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <input v-model="settingsForm.nickname" placeholder="昵称" />
            <input v-model="settingsForm.email" placeholder="邮箱" />
            <input v-model="settingsForm.github" placeholder="GitHub" />
            <input v-model="settingsForm.blog" placeholder="博客" />
            <textarea v-model="settingsForm.bio" placeholder="个人简介"></textarea>
            <button :disabled="actionLoading">保存设置</button>
          </form>
        </section>

        <section v-if="activeTab === '文件上传'" class="crud-section">
          <form class="inline-form" @submit.prevent="submitUpload">
            <input type="file" accept="image/*" @change="onFileChange" />
            <button :disabled="!uploadFile || actionLoading">上传图片</button>
          </form>
          <p v-if="actionMessage" class="success-text">{{ actionMessage }}</p>
          <p v-if="actionError" class="error-text">{{ actionError }}</p>
          <div v-if="uploadResult" class="upload-preview-card panel section-shell">
            <div class="upload-preview-media">
              <img :src="uploadResult.url" :alt="uploadResult.filename || '上传图片预览'" />
            </div>
            <div class="upload-preview-meta">
              <p class="section-eyebrow">上传结果</p>
              <strong>{{ uploadResult.filename }}</strong>
              <p class="upload-preview-url">{{ uploadResult.url }}</p>
              <div class="item-actions">
                <button type="button" class="secondary" @click="copyUploadUrl(uploadResult.url)">复制链接</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

const router = useRouter()
const tabs = ['概览', '分类管理', '网站管理', '标签管理', '公告管理', '友链管理', '站点设置', '文件上传']
const activeTab = ref('概览')
const stats = ref({ overview: {}, popularLinks: [], recentVisits: [] })
const categories = ref([])
const links = ref([])
const tags = ref([])
const announcements = ref([])
const friendLinks = ref([])
const settingsRaw = ref({})
const uploadFile = ref(null)
const uploadResult = ref(null)
const settingsAvatarInputRef = ref(null)
const avatarCropViewportRef = ref(null)
const avatarCropImageRef = ref(null)
const actionMessage = ref('')
const actionError = ref('')
const actionLoading = ref(false)
const mobileNavOpen = ref(false)
const isMobile = ref(false)
const avatarDragActive = ref(false)
const avatarCropSource = ref('')
const avatarCropPreview = ref('')
const avatarCropScale = ref(1)
const avatarCropNaturalSize = reactive({ width: 1, height: 1 })
const avatarCropOffset = reactive({ x: 0, y: 0 })
const avatarPointerState = reactive({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 })
const floatingNotice = reactive({ visible: false, message: '', type: 'success' })
let actionToastTimer = null
let avatarDragDepth = 0

const categoryForm = reactive({ id: null, name: '', description: '', icon: '', sortOrder: 0, isVisible: true })
const linkForm = reactive({ id: null, title: '', url: '', description: '', categoryId: 0, tagIdsText: '', isFeatured: false, isVisible: true })
const tagForm = reactive({ id: null, name: '', color: '#3b82f6' })
const announcementForm = reactive({ id: null, title: '', content: '', isActive: true, isPinned: false })
const friendForm = reactive({ id: null, name: '', url: '', description: '', isActive: true })
const settingsForm = reactive({ siteName: '', siteDescription: '', heroTitle: '', heroSubtitle: '', nickname: '', email: '', github: '', blog: '', bio: '', avatar: '' })

const overviewCards = computed(() => [
  {
    label: '分类总数',
    value: stats.value.totals?.categories ?? 0,
    sublabel: `显示分类 ${categories.value.filter(item => item.isVisible).length}`,
    emphasis: 'is-key-stat'
  },
  {
    label: '网站总数',
    value: stats.value.totals?.links ?? 0,
    sublabel: `总点击 ${stats.value.totals?.clicks ?? 0}`,
    emphasis: 'is-key-stat'
  },
  {
    label: '标签总数',
    value: stats.value.totals?.tags ?? 0,
    sublabel: `公告 ${stats.value.totals?.announcements ?? 0}`,
    emphasis: ''
  },
  {
    label: '访问记录',
    value: stats.value.totals?.visits ?? 0,
    sublabel: `今日 ${stats.value.totals?.todayVisits ?? 0}`,
    emphasis: 'is-soft-accent'
  }
])

const trendCards = computed(() => {
  const visits = stats.value.recentVisits || []
  const total7d = visits.reduce((sum, item) => sum + Number(item.count || 0), 0)
  const today = visits[visits.length - 1]?.count || 0
  const yesterday = visits[visits.length - 2]?.count || 0
  const delta = Number(today) - Number(yesterday)
  return [
    {
      label: '近 7 天访问',
      value: total7d,
      hint: `${visits.length} 天有数据`,
      emphasis: 'is-key-stat'
    },
    {
      label: '今日访问',
      value: stats.value.totals?.todayVisits ?? 0,
      hint: delta >= 0 ? `较昨日 +${delta}` : `较昨日 ${delta}`,
      emphasis: 'is-soft-accent'
    },
    {
      label: '热门网站',
      value: stats.value.popularLinks?.length ?? 0,
      hint: '按点击数排序',
      emphasis: ''
    },
    {
      label: '友情链接',
      value: stats.value.totals?.friendLinks ?? 0,
      hint: `公告 ${stats.value.totals?.announcements ?? 0}`,
      emphasis: ''
    }
  ]
})

const visitChartPoints = computed(() => {
  const source = stats.value.recentVisits || []
  const max = Math.max(...source.map(item => Number(item.count || 0)), 1)
  return source.map(item => ({
    label: String(item.date || '').slice(5),
    value: Number(item.count || 0),
    height: Math.max(12, Math.round((Number(item.count || 0) / max) * 100))
  }))
})

const trendInsight = computed(() => {
  const visits = stats.value.recentVisits || []
  if (!visits.length) {
    return {
      primary: '暂无趋势数据',
      secondary: '最近访问统计更新后会显示在这里。',
      badge: '等待数据',
      peakValue: 0
    }
  }
  const today = Number(visits[visits.length - 1]?.count || 0)
  const yesterday = Number(visits[visits.length - 2]?.count || 0)
  const peak = visits.reduce((best, item) => Number(item.count || 0) > Number(best.count || 0) ? item : best, visits[0])
  const change = today - yesterday
  const direction = change > 0 ? `较昨日 +${change}` : change < 0 ? `较昨日 ${change}` : '较昨日持平'
  return {
    primary: `今日 ${today} 次访问`,
    secondary: `最近 7 天峰值出现在 ${String(peak.date || '').slice(5) || '最近一天'}，共 ${Number(peak.count || 0)} 次，${direction}`,
    badge: change > 0 ? '上升中' : change < 0 ? '回落中' : '保持稳定',
    peakValue: Number(peak.count || 0)
  }
})

const quickActions = computed(() => [
  { label: '新增网站', value: `${stats.value.totals?.links ?? 0} 个`, hint: '前往网站管理', tab: '网站管理' },
  { label: '新增分类', value: `${stats.value.totals?.categories ?? 0} 类`, hint: '前往分类管理', tab: '分类管理' },
  { label: '上传图片', value: uploadResult.value?.url ? '已上传' : '待操作', hint: '前往文件上传', tab: '文件上传' },
  { label: '站点设置', value: settingsForm.siteName || '未命名', hint: '前往站点设置', tab: '站点设置' }
])

const recentActivities = computed(() => {
  const activity = []
  const latestLink = [...links.value].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]
  const latestCategory = [...categories.value].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]
  const latestAnnouncement = [...announcements.value].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0]

  if (latestLink) {
    activity.push({ key: `link-${latestLink.id}`, title: `网站更新：${latestLink.title}`, time: latestLink.updatedAt || latestLink.createdAt || '-', meta: latestLink.categoryName || '网站管理' })
  }
  if (latestCategory) {
    activity.push({ key: `category-${latestCategory.id}`, title: `分类更新：${latestCategory.name}`, time: latestCategory.updatedAt || latestCategory.createdAt || '-', meta: latestCategory.description || '分类管理' })
  }
  if (latestAnnouncement) {
    activity.push({ key: `announcement-${latestAnnouncement.id}`, title: `公告更新：${latestAnnouncement.title}`, time: latestAnnouncement.updatedAt || latestAnnouncement.createdAt || '-', meta: latestAnnouncement.isActive ? '已启用' : '未启用' })
  }
  return activity
})

const avatarCropImageStyle = computed(() => ({
  transform: `translate(${avatarCropOffset.x}px, ${avatarCropOffset.y}px) scale(${avatarCropScale.value})`
}))

watch(avatarCropScale, () => {
  clampAvatarCropPosition()
  updateAvatarCropPreview()
})

const updateViewportState = () => {
  isMobile.value = window.innerWidth <= 1180
  if (!isMobile.value) mobileNavOpen.value = false
}

const selectTab = (tab) => {
  activeTab.value = tab
  mobileNavOpen.value = false
}

const scrollAdminTop = () => {
  document.querySelector('.admin-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const showFloatingNotice = (message, type = 'success') => {
  floatingNotice.message = message
  floatingNotice.type = type
  floatingNotice.visible = true
  if (actionToastTimer) {
    window.clearTimeout(actionToastTimer)
  }
  actionToastTimer = window.setTimeout(() => {
    floatingNotice.visible = false
  }, 2600)
}

const handleOverviewCardClick = (item) => {
  if (item.label === '分类总数') {
    selectTab('分类管理')
    scrollAdminTop()
    return
  }
  if (item.label === '网站总数') {
    selectTab('网站管理')
    scrollAdminTop()
    return
  }
  if (item.label === '标签总数') {
    selectTab('标签管理')
    scrollAdminTop()
    return
  }
  if (item.label === '访问记录') {
    document.querySelector('.panel .crud-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const handleTrendCardClick = (item) => {
  if (item.label === '近 7 天访问' || item.label === '今日访问') {
    document.querySelector('.trend-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  if (item.label === '热门网站') {
    document.querySelector('.panel .crud-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  if (item.label === '友情链接') {
    selectTab('友链管理')
    scrollAdminTop()
  }
}

const jumpToLink = (id) => {
  if (!id) return
  selectTab('网站管理')
  scrollAdminTop()
  requestAnimationFrame(() => {
    const target = document.getElementById(`admin-link-${id}`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.add('is-highlighted')
      window.setTimeout(() => target.classList.remove('is-highlighted'), 1800)
    }
  })
}

const loadAll = async () => {
  const [s, c, l, t, a, f, setting] = await Promise.all([
    api.getStats(), api.getCategories(), api.getLinks(), api.getTags(), api.getAnnouncements(), api.getFriendLinks(), api.getSettings()
  ])
  stats.value = s
  categories.value = c.items || c
  links.value = l.items || l
  tags.value = t.items || t
  announcements.value = a.items || a
  friendLinks.value = f.items || f
  settingsRaw.value = setting
  settingsForm.siteName = setting.site?.value?.siteName || ''
  settingsForm.siteDescription = setting.site?.value?.siteDescription || ''
  settingsForm.heroTitle = setting.hero?.value?.title || ''
  settingsForm.heroSubtitle = setting.hero?.value?.subtitle || ''
  settingsForm.nickname = setting.profile?.value?.nickname || ''
  settingsForm.email = setting.profile?.value?.email || ''
  settingsForm.github = setting.profile?.value?.github || ''
  settingsForm.blog = setting.profile?.value?.blog || ''
  settingsForm.bio = setting.profile?.value?.bio || ''
  settingsForm.avatar = setting.profile?.value?.avatar || ''
}

const logout = () => {
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminUser')
  router.push('/admin/login')
}

const setActionState = ({ message = '', error = '', loading = false } = {}) => {
  actionMessage.value = message
  actionError.value = error
  actionLoading.value = loading
}

const withAction = async (message, task) => {
  setActionState({ loading: true })
  try {
    const result = await task()
    setActionState({ message, loading: false })
    if (message) {
      showFloatingNotice(message, 'success')
    }
    return result
  } catch (error) {
    const errorMessage = error.message || '操作失败'
    setActionState({ error: errorMessage, loading: false })
    showFloatingNotice(errorMessage, 'error')
    throw error
  }
}

const confirmAndRun = async (text, message, task) => {
  if (!window.confirm(text)) return false
  await withAction(message, task)
  return true
}

const validateAvatarFile = (file) => {
  if (!file) {
    setActionState({ error: '请选择头像图片' })
    return false
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    setActionState({ error: '仅支持 JPG、PNG、WebP 图片' })
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    setActionState({ error: '头像图片不能超过 5MB' })
    return false
  }
  return true
}

const clearAvatarCropState = () => {
  avatarCropSource.value = ''
  avatarCropPreview.value = ''
  avatarCropScale.value = 1
  avatarCropOffset.x = 0
  avatarCropOffset.y = 0
  avatarCropNaturalSize.width = 1
  avatarCropNaturalSize.height = 1
  avatarPointerState.active = false
}

const clampAvatarCropPosition = () => {
  const viewport = avatarCropViewportRef.value
  if (!viewport) return
  const rect = viewport.getBoundingClientRect()
  const baseWidth = Math.max(avatarCropNaturalSize.width, 1)
  const baseHeight = Math.max(avatarCropNaturalSize.height, 1)
  const fitScale = Math.max(rect.width / baseWidth, rect.height / baseHeight)
  const displayWidth = baseWidth * fitScale * avatarCropScale.value
  const displayHeight = baseHeight * fitScale * avatarCropScale.value
  const maxOffsetX = Math.max(0, (displayWidth - rect.width) / 2)
  const maxOffsetY = Math.max(0, (displayHeight - rect.height) / 2)
  avatarCropOffset.x = Math.min(maxOffsetX, Math.max(-maxOffsetX, avatarCropOffset.x))
  avatarCropOffset.y = Math.min(maxOffsetY, Math.max(-maxOffsetY, avatarCropOffset.y))
}

const updateAvatarCropPreview = () => {
  if (!avatarCropSource.value || !avatarCropImageRef.value || !avatarCropViewportRef.value) return
  const img = avatarCropImageRef.value
  const viewport = avatarCropViewportRef.value
  const rect = viewport.getBoundingClientRect()
  const sourceWidth = img.naturalWidth || avatarCropNaturalSize.width
  const sourceHeight = img.naturalHeight || avatarCropNaturalSize.height
  if (!sourceWidth || !sourceHeight || !rect.width || !rect.height) return

  const fitScale = Math.max(rect.width / sourceWidth, rect.height / sourceHeight)
  const totalScale = fitScale * avatarCropScale.value
  const canvasSize = 320
  const sx = (sourceWidth / 2) - ((rect.width / 2) + avatarCropOffset.x) / totalScale
  const sy = (sourceHeight / 2) - ((rect.height / 2) + avatarCropOffset.y) / totalScale
  const sw = rect.width / totalScale
  const sh = rect.height / totalScale
  const safeSx = Math.min(Math.max(0, sx), Math.max(0, sourceWidth - sw))
  const safeSy = Math.min(Math.max(0, sy), Math.max(0, sourceHeight - sh))

  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvasSize, canvasSize)
  ctx.save()
  ctx.beginPath()
  ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, safeSx, safeSy, sw, sh, 0, 0, canvasSize, canvasSize)
  ctx.restore()
  avatarCropPreview.value = canvas.toDataURL('image/png')
}

const prepareAvatarFile = async (file) => {
  if (!validateAvatarFile(file)) return
  clearAvatarCropState()
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取图片失败，请重试'))
    reader.readAsDataURL(file)
  })
  avatarCropSource.value = source
  actionMessage.value = ''
  actionError.value = ''
}

const onAvatarCropImageLoad = (event) => {
  avatarCropNaturalSize.width = event.target.naturalWidth || 1
  avatarCropNaturalSize.height = event.target.naturalHeight || 1
  avatarCropScale.value = 1.12
  avatarCropOffset.x = 0
  avatarCropOffset.y = 0
  clampAvatarCropPosition()
  updateAvatarCropPreview()
}

const onCropPointerDown = (event) => {
  if (!avatarCropSource.value) return
  avatarPointerState.active = true
  avatarPointerState.startX = event.clientX
  avatarPointerState.startY = event.clientY
  avatarPointerState.originX = avatarCropOffset.x
  avatarPointerState.originY = avatarCropOffset.y
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

const onCropPointerMove = (event) => {
  if (!avatarPointerState.active) return
  avatarCropOffset.x = avatarPointerState.originX + (event.clientX - avatarPointerState.startX)
  avatarCropOffset.y = avatarPointerState.originY + (event.clientY - avatarPointerState.startY)
  clampAvatarCropPosition()
  updateAvatarCropPreview()
}

const onCropPointerUp = (event) => {
  avatarPointerState.active = false
  event?.target?.releasePointerCapture?.(event.pointerId)
}

const onAvatarDragEnter = () => {
  avatarDragDepth += 1
  avatarDragActive.value = true
}

const onAvatarDragOver = () => {
  avatarDragActive.value = true
}

const onAvatarDragLeave = () => {
  avatarDragDepth = Math.max(0, avatarDragDepth - 1)
  if (avatarDragDepth === 0) {
    avatarDragActive.value = false
  }
}

const onAvatarDrop = async (event) => {
  avatarDragDepth = 0
  avatarDragActive.value = false
  const file = event.dataTransfer?.files?.[0] || null
  if (!file) return
  await prepareAvatarFile(file)
}

const applySettingsAvatarCrop = async () => {
  if (!avatarCropPreview.value) {
    setActionState({ error: '请先完成头像裁剪' })
    return
  }

  const blob = await fetch(avatarCropPreview.value).then(res => res.blob())
  const formData = new FormData()
  formData.append('file', blob, `avatar-${Date.now()}.png`)

  const result = await withAction('头像上传成功，已同步前台展示', () => api.uploadPublicAvatar(formData))
  settingsForm.avatar = result.path || result.url || ''
  clearAvatarCropState()
  await loadAll()
}

const resetCategory = () => Object.assign(categoryForm, { id: null, name: '', description: '', icon: '', sortOrder: 0, isVisible: true })
const editCategory = (item) => Object.assign(categoryForm, item)
const saveCategory = async () => {
  const payload = { ...categoryForm }
  if (payload.id) await withAction('分类已更新', () => api.updateCategory(payload.id, payload))
  else await withAction('分类已创建', () => api.createCategory(payload))
  resetCategory(); await loadAll()
}
const removeCategory = async (id) => {
  await confirmAndRun('确定删除这个分类吗？', '分类已删除', async () => {
    await api.deleteCategory(id)
    await loadAll()
  })
}

const resetLink = () => Object.assign(linkForm, { id: null, title: '', url: '', description: '', categoryId: 0, tagIdsText: '', isFeatured: false, isVisible: true })
const editLink = (item) => Object.assign(linkForm, { ...item, tagIdsText: (item.tags || []).map(tag => tag.id).join(',') })
const saveLink = async () => {
  const payload = { ...linkForm, tagIds: linkForm.tagIdsText.split(',').map(v => Number(v.trim())).filter(Boolean) }
  if (payload.id) await withAction('网站已更新', () => api.updateLink(payload.id, payload))
  else await withAction('网站已创建', () => api.createLink(payload))
  resetLink(); await loadAll()
}
const removeLink = async (id) => {
  await confirmAndRun('确定删除这个网站吗？', '网站已删除', async () => {
    await api.deleteLink(id)
    await loadAll()
  })
}

const resetTag = () => Object.assign(tagForm, { id: null, name: '', color: '#3b82f6' })
const editTag = (item) => Object.assign(tagForm, item)
const saveTag = async () => {
  if (tagForm.id) await withAction('标签已更新', () => api.updateTag(tagForm.id, tagForm))
  else await withAction('标签已创建', () => api.createTag(tagForm))
  resetTag(); await loadAll()
}
const removeTag = async (id) => {
  await confirmAndRun('确定删除这个标签吗？', '标签已删除', async () => {
    await api.deleteTag(id)
    await loadAll()
  })
}

const resetAnnouncement = () => Object.assign(announcementForm, { id: null, title: '', content: '', isActive: true, isPinned: false })
const editAnnouncement = (item) => Object.assign(announcementForm, item)
const saveAnnouncement = async () => {
  if (announcementForm.id) await withAction('公告已更新', () => api.updateAnnouncement(announcementForm.id, announcementForm))
  else await withAction('公告已创建', () => api.createAnnouncement(announcementForm))
  resetAnnouncement(); await loadAll()
}
const removeAnnouncement = async (id) => {
  await confirmAndRun('确定删除这条公告吗？', '公告已删除', async () => {
    await api.deleteAnnouncement(id)
    await loadAll()
  })
}

const resetFriendLink = () => Object.assign(friendForm, { id: null, name: '', url: '', description: '', isActive: true })
const editFriendLink = (item) => Object.assign(friendForm, item)
const saveFriendLink = async () => {
  if (friendForm.id) await withAction('友链已更新', () => api.updateFriendLink(friendForm.id, friendForm))
  else await withAction('友链已创建', () => api.createFriendLink(friendForm))
  resetFriendLink(); await loadAll()
}
const removeFriendLink = async (id) => {
  await confirmAndRun('确定删除这个友链吗？', '友链已删除', async () => {
    await api.deleteFriendLink(id)
    await loadAll()
  })
}

const openSettingsAvatarPicker = () => {
  settingsAvatarInputRef.value?.click()
}

const onSettingsAvatarChange = async (event) => {
  const file = event.target.files?.[0] || null
  event.target.value = ''
  if (!file) return
  await prepareAvatarFile(file)
}

const resetSettingsAvatar = async () => {
  await withAction('头像已重置', async () => {
    await api.resetPublicAvatar()
    settingsForm.avatar = ''
    clearAvatarCropState()
    await loadAll()
  })
}

const saveSettings = async () => {
  await withAction('站点设置已保存', () => api.updateSettings({
    site: { siteName: settingsForm.siteName, siteDescription: settingsForm.siteDescription },
    hero: { title: settingsForm.heroTitle, subtitle: settingsForm.heroSubtitle },
    profile: { nickname: settingsForm.nickname, email: settingsForm.email, github: settingsForm.github, blog: settingsForm.blog, bio: settingsForm.bio, avatar: settingsForm.avatar }
  }))
  await loadAll()
}

const onFileChange = (event) => { uploadFile.value = event.target.files?.[0] || null }
const submitUpload = async () => {
  if (!uploadFile.value) {
    setActionState({ error: '请先选择图片文件' })
    return
  }

  const formData = new FormData()
  formData.append('file', uploadFile.value)
  uploadResult.value = null
  uploadResult.value = await withAction('图片上传成功', async () => {
    const result = await api.upload(formData)
    return {
      ...result,
      url: result.url || result.path || ''
    }
  })
}

const copyUploadUrl = async (url) => {
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    setActionState({ message: '链接已复制' })
    showFloatingNotice('链接已复制', 'success')
  } catch {
    const temp = document.createElement('textarea')
    temp.value = url
    document.body.appendChild(temp)
    temp.select()
    document.execCommand('copy')
    document.body.removeChild(temp)
    setActionState({ message: '链接已复制' })
    showFloatingNotice('链接已复制', 'success')
  }
}

onMounted(() => {
  updateViewportState()
  window.addEventListener('resize', updateViewportState)
  window.addEventListener('pointermove', onCropPointerMove)
  window.addEventListener('pointerup', onCropPointerUp)
  loadAll()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportState)
  window.removeEventListener('pointermove', onCropPointerMove)
  window.removeEventListener('pointerup', onCropPointerUp)
  if (actionToastTimer) {
    window.clearTimeout(actionToastTimer)
  }
})
</script>
