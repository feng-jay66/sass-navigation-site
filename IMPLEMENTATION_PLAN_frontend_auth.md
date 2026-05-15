# Frontend Independent Auth Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 为前台站点建立独立用户体系，包含前台用户表、注册/登录/退出接口、前台登录守卫与用户中心。

**Architecture:** 后端在现有 Fastify + SQLite 架构上新增 `site_user` 独立数据模型与 `siteAuthenticate` 鉴权中间件；前端在现有 Vue Router 基础上新增 `/register` 与 `/me` 页面，并将前台 token 与后台管理员 token 完全隔离。

**Tech Stack:** Vue 3, Vue Router, Fastify, better-sqlite3, bcryptjs, JWT

---

## Scope

- 新增独立前台用户表，不复用 `admin_user`
- 新增前台注册接口
- 新增前台登录 / 退出 / 当前用户接口
- 前台首页继续受登录守卫保护
- 新增前台用户中心页面
- 保持后台 `/admin/*` 认证逻辑不受影响

## Files to Modify

- Modify: `/www/wwwroot/sass/backend/src/db.js`
- Modify: `/www/wwwroot/sass/backend/src/app.js`
- Modify: `/www/wwwroot/sass/src/api.js`
- Modify: `/www/wwwroot/sass/src/main.js`
- Modify: `/www/wwwroot/sass/src/views/HomeView.vue`
- Create: `/www/wwwroot/sass/src/views/FrontendRegisterView.vue`
- Create: `/www/wwwroot/sass/src/views/FrontendProfileView.vue`
- Modify: `/www/wwwroot/sass/src/views/FrontendLoginView.vue`
- Modify: `/www/wwwroot/sass/src/style.css`

## Verification Commands

- `cd /www/wwwroot/sass && npm run build`
- `cd /www/wwwroot/sass && node backend/src/app.js` or restart existing service
- `curl` registration/login/me/logout endpoints with JSON payloads
- HTTPS route checks for `/login`, `/register`, `/me`, `/`

## Acceptance Criteria

- 未注册用户可在 `/register` 创建前台账号
- 注册后可在 `/login` 登录前台
- 登录成功后访问 `/` 与 `/me`
- 未登录访问 `/` 和 `/me` 会跳转 `/login`
- 前台退出后重新访问 `/` 会再次跳转 `/login`
- 后台 `/admin/login` 与 `/admin/dashboard` 保持可用
