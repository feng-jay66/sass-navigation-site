# 个人导航站实施计划

> For Hermes: 用该计划直接在 /www/wwwroot/sass 落地完整 MVP。

**目标：** 构建一个可部署的个人导航站 MVP，包含前台、后台、后端 API、SQLite 数据层、JWT 登录、上传、统计和 Docker/Nginx 部署配置。

**架构：** 使用单仓多应用方案：前端一个 Vite Vue3 SPA，同时提供前台 `/` 与后台 `/admin` 路由；后端使用 Node.js + Fastify 提供 `/api` 接口与静态上传；数据库使用 SQLite 以便当前环境快速自测，并保留可迁移到 MySQL 的 SQL 初始化文件。Nginx 统一代理 `/`、`/admin`、`/api`、`/uploads`。

**技术栈：** Vue 3、Vite、Vue Router、Node.js、Fastify、better-sqlite3、JWT、Multer/@fastify multipart、Docker Compose、Nginx。

---

## Task 1: 初始化后端工程与依赖
- 创建 backend/package.json
- 安装 Fastify、JWT、SQLite、multipart、cors
- 创建基础目录结构

## Task 2: 建立数据库与初始化数据
- 创建 backend/data/app.db 初始化逻辑
- 创建 schema 与 seed
- 预置 admin/admin123456 账号（bcrypt）

## Task 3: 实现统一响应与鉴权中间件
- 统一返回 { code, message, data }
- Bearer Token 校验
- 后台接口保护

## Task 4: 实现公开站点接口
- GET /api/site/home
- GET /api/site/search
- POST /api/site/link/:id/click

## Task 5: 实现后台认证接口
- POST /api/admin/auth/login
- GET /api/admin/auth/me
- POST /api/admin/auth/logout

## Task 6: 实现分类 CRUD
- GET/POST/PUT/DELETE /api/admin/categories

## Task 7: 实现链接 CRUD
- GET/POST/PUT/DELETE /api/admin/links

## Task 8: 实现标签/公告/友链/设置接口
- tags announcements friend-links settings

## Task 9: 实现上传与统计接口
- POST /api/admin/upload
- GET /api/admin/dashboard/stats

## Task 10: 改造前端为完整站点+后台
- Vue Router
- 登录页
- 后台管理页
- 前台调用真实 API
- 深浅色切换

## Task 11: 部署配置
- Dockerfile(frontend/backend)
- docker-compose.yml
- nginx.conf/default.conf

## Task 12: 端到端测试
- 启动后端与前端
- curl 验证登录/鉴权/CRUD/公开接口
- 构建验证
