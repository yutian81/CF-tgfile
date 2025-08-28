# CF-tgfile: 基于 Cloudflare Workers 和 Telegram 的文件存储应用

**本项目是一个全栈应用，利用 Cloudflare Workers 作为后端服务，Telegram 作为文件存储媒介，并提供一个现代化的 Vue 前端界面用于文件上传和管理。**

## ✨ 功能特性

* ​**后端**​: 使用高性能的 [Hono](https://hono.dev/) 框架，运行在 Cloudflare 的边缘网络上。
* ​**前端**​: 使用 [Vue 3](https://vuejs.org/) (Composition API) 和 [Vite](https://vitejs.dev/) 构建，提供响应式的用户体验。
* ​**存储**​: 文件被上传到指定的 Telegram 聊天中，实现免费、无限的（理论上）文件存储。
* ​**数据库**​: 使用 Cloudflare D1（一个基于 SQLite 的无服务器数据库）来存储文件的元数据和映射关系。
* ​**认证**​: 可选的、基于用户名和密码的简单认证机制。
* ​**核心功能**​: 文件拖拽/粘贴上传、进度显示、文件管理、分享和删除。

## 🚀 部署到 Cloudflare Workers

### 第 1 步：准备工作

- **Fork 本仓库**
- **创建 D1 数据库**​，名称随意，假设命名为 `tgfile-db`

### 部署worker

- **创建 Worker**​，链接GitHub，选择仓库中的项目
- **预设框架**：`vite`
- **构建命令**：`npm run build`
- **输出目录**：`dist`
- **点击部署**

### 第 2 步：配置 Worker 的环境变量

* **USERNAME**：登录用户名
* **PASSWORD**：登录密码
* **DOMAIN**: `your.domain.com` (您计划用于访问此服务的域名)
* **ENABLE_AUTH**: `true`(或 `false` 来禁用登录)
* **COOKIE**: `7` (Cookie 有效期，单位：天，默认7天)
* **MAX_SIZE_MB**: `20` (最大上传文件大小，单位：MB，默认20M，超出无效)
* **TG_CHAT_ID**: TG聊天/频道 ID (例如 `-100123456789`)
* **TG_TOKEN**: TG机器人TOKEN

​**绑定D1数据库**

* 绑定变量名：`DATABASE`
* 绑定变量值：选择你创建的数据库 `tgfile-db`

## 💻 本地开发与预览

### 本地开发

1. ​**安装依赖**​
   
   ```bash
   npm install
   ```
2. ​**启动后端服务**
   
   ```bash
   npm run preview
   ```
3. ​**启动前端服务**：需要在另一个终端中运行。
   
   ```
   npm run dev
   ```
4. ​**访问应用**​
   
   * 在浏览器中打开 `http://localhost:5173`

### 本地预览

1. **安装 wrangler**
   
   ```bash
   npm install -g wrangler
   ```
2. **登录 Wrangler**​:
   
   ```bash
   wrangler login
   ```
3. ​**构建前端**​
   
   ```bash
   npm run build
   ```
4. **部署到 Cloudflare**​
   
   ```bash
   wrangler deploy
   ```

## 本地预览

* 服务地址：`http://localhost:8787`

## 📖 API 使用说明

**所有 API 都以`/api` 为前缀**

### 1. 获取配置

* ​**路径**​: `/api/config`
* ​**方法**​:*`GET`
* ​**认证**​: 否

​**示例请求**​

```bash
curl https://your.domain.com/api/config
```

**成功响应 (200 OK)**

```json
{ "maxSizeMB": 20 }
```

### 2. 用户登录

**进行身份验证以获取访问令牌。**

* ​**路径**: `/api/login`
* ​**方法: `POST`
* ​**认证**: 是

**示例请求**:

```bash
curl -X POST https://your.domain.com/api/login \
-H "Content-Type: application/json" \
-d '{
  "username": "your_username",
  "password": "your_password"
}'
```

**成功响应 (200 OK)**:

- 响应头中会包含 `Set-Cookie: auth_token=…;`

```json
{
  "success": true,
  "message": "登录成功"
}
```

## 3. 上传文件

- **路径**: `/api/upload`
- **方法**: `POST`
- **认证**: 是 (需要携带有效的 `auth_token` Cookie)

**示例请求**:

```bash
curl -X POST https://your.domain.com/api/upload \
-H "Cookie: auth_token=your_auth_token_here" \
-F "file=@/path/to/your/image.jpg"
```

**成功响应 (200 OK)**:

```json
{
  "status": 1,
  "msg": "✔ 上传成功",
  "url": "https://your.domain.com/1678886400000.jpg"
}
```

## 4. 获取文件列表

- **路径**: `/api/files`
- **方法**: `GET`
- **认证**: 是

**示例请求**:

```bash
curl https://your.domain.com/api/files \
-H "Cookie: auth_token=your_auth_token_here"
```

**成功响应 (200 OK)**:

```json
{
  "files": [
    {
      "url": "https://your.domain.com/1678886400000.jpg",
      "file_name": "image.jpg",
      "file_size": 102400,
      "created_at": "2025-08-28T08:50:00.000Z"
    },
    {
      "url": "https://your.domain.com/1678886500000.zip",
      "file_name": "archive.zip",
      "file_size": 512000,
      "created_at": "2025-08-28T08:51:40.000Z"
    }
  ]
}
```

## 5. 删除文件

- **路径**: `/api/delete`
- **方法**: `POST`
- **认证**: 是

**示例请求**:

```bash
curl -X POST https://your.domain.com/api/delete \
-H "Content-Type: application/json" \
-H "Cookie: auth_token=your_auth_token_here" \
-d '{ "url": "https://your.domain.com/1678886400000.jpg }'
```

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "message": "文件删除成功"
}
```

## 6. 获取必应背景图

- **路径**: `/api/bing`
- **方法**: `GET`
- **认证**: 否

**示例请求**:

```bash
curl https://your.domain.com/api/bing
```

**成功响应 (200 OK)**:

```json
{
  "status": true,
  "message": "操作成功",
  "data": [
    { "url": "https://cn.bing.com/th?id=OHR.SomeImage_ZH-CN12345.jpg" },
    { "url": "https://cn.bing.com/th?id=OHR.AnotherImage_ZH-CN67890.jpg" }
  ]
}
```
