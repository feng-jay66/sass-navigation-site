# 🚀 Sass Navigation Site
> 一个基于 Vue 3 + Vite 构建的简约个人导航站项目，集成导航、搜索、后台管理与头像统一管理能力

---

## 📊 项目概览
| 项目项 | 内容 | 状态 |
|:-----|:-----|:----:|
| 项目名称 | Sass Navigation Site | ✅ 已上线 |
| 技术栈 | Vue3 + Vite + Fastify + SQLite | ✅ 稳定运行 |
| 核心定位 | 个人导航网站 + 后台管理系统 | ✅ 功能完善 |

---

## ✨ 核心功能
### 前台功能
- ✅ 响应式导航首页布局
- ✅ 分类与标签筛选
- ✅ 全局搜索与快捷访问
- ✅ 个人信息与头像展示（仅展示，无编辑入口）

### 后台功能
- ✅ 独立后台管理系统
- ✅ 站点设置模块：头像预览、上传、重置
- ✅ 前后端接口复用，图片服务器持久化存储

---

## 🔌 技术栈详情
| 分类 | 技术选型 |
|:---|:---|
| 前端 | Vue 3 / Vue Router / Vite |
| 后端 | Node.js / Fastify |
| 数据库 | SQLite |
| 部署 | Docker / Nginx |

---

## 📁 项目结构
 
 
sass-navigation-site/
├── src/          # 前端页面、组件与样式
├── backend/      # 后端服务、接口与数据层
├── deploy/       # 部署相关配置文件
├── dist/         # 前端打包构建产物
└── index.html    # 项目入口文件
 
plaintext  

---

## ✅ 头像管理模块（已完成）
> 📌 **重点**：前台仅展示头像，所有编辑操作统一在后台完成

- 入口路径：后台 → 站点设置
- 支持功能：头像预览、上传头像、重置头像
- 存储方式：服务器文件存储，非 localStorage
- 复用接口：```bash
POST /api/site/profile/avatar    # 上传头像
DELETE /api/site/profile/avatar  # 重置头像
 
## 🚀 开发与构建
 
>环境启动
 
bash  
# 安装依赖
npm install

# 启动前端开发环境
npm run dev

# 启动后端服务
npm run backend
 
 
项目构建
 
bash  
# 生产环境打包
npm run build
 
 
 
 
##📝 下一步优化计划（抖音风格头像交互）
 
增加拖拽上传功能
圆形裁剪框，上传前预览裁剪
优化上传成功醒目动画提示
补充复制头像链接功能
 
 
 
##💡 部署与注意事项
 
⚠️ 注意
 
1. 后台登录地址： /admin/login 
2. 头像修改必须在后台站点设置中操作，前台自动同步
3. 生产部署可参考项目内  docker-compose.yml 、 frontend.Dockerfile  配置
4. 已验证接口、图片资源均可正常访问（状态码 200）