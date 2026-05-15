# Sass Navigation Site

一个基于 Vue 3 + Vite 的个人导航站项目，包含首页导航、分类筛选、搜索、个人信息和后台入口。

## Features

- 响应式导航首页
- 分类与标签筛选
- 搜索与快捷访问
- 个人信息展示
- 后台管理入口
- 前端静态构建 + 后端接口

## Tech Stack

- Vue 3
- Vue Router
- Vite
- Node.js / Fastify
- SQLite

## Project Structure

- `src/`：前端页面与样式
- `backend/`：后端服务与数据层
- `deploy/`：部署相关配置
- `dist/`：前端构建产物

## Development

```bash
npm install
npm run dev
npm run backend
```

## Build

```bash
npm run build
```

## Notes

- 默认前端入口为 `index.html`
- 后台管理路径：`/admin/login`
- 生产部署可参考 `deploy/` 目录下的 Nginx 配置
