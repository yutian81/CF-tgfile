# API 文档

## 🔐 认证机制

系统采用双重认证机制，支持 API Token 和 Cookie 会话两种方式。

### 1. API Token 认证（推荐用于脚本/程序）

自动化脚本使用固定的 API Token，通过 `Authorization` 请求头携带。

| Header Key | Header Value | 示例 |
|-----------|-------------|------|
| `Authorization` | `Bearer <your_token>` 或直接 `<your_token>` | `Authorization: Bearer tgfile-admin` |

> **说明**：支持 `Bearer <token>` 和裸 `<token>` 两种格式，系统自动识别。

### 2. Cookie 会话认证（推荐用于浏览器）

用户通过 `/login` 成功登录后，系统设置 `auth_token` Cookie（Base64 编码的 JSON，包含用户名和过期时间）。浏览器自动携带，适用于 Web 界面。

> **注意**：Cookie 有有效期限制（默认 7 天），不适用于长期自动化集成。

### 认证失败处理

- **API 请求**（POST 到 `/upload`、`/delete`、`/search` 等）：若认证失败，**不会返回 JSON 401**，而是返回 **302 重定向**到 `/` 登录页面。API 客户端应自行检测响应状态码并处理跳转。
- **浏览器访问**：自动跳转到登录页。

### 无需认证的公开端点

| 路径 | 说明 |
|------|------|
| `/config` | 获取安全配置信息（如上传大小限制） |

---

## 接口列表

### 1. 文件上传 `/upload`

#### GET — 获取上传页面

返回上传文件的 HTML 页面。

| 属性 | 说明 |
|------|------|
| **路径** | `/upload` |
| **方法** | `GET` |
| **认证** | 必需（Cookie 会话，页面访问会自动携带） |
| **响应** | `200 OK` — `text/html`，上传页面 |

#### POST — 上传文件

将文件发送到 Telegram 频道并记录到 D1 数据库。

| 属性 | 说明 |
|------|------|
| **路径** | `/upload` |
| **方法** | `POST` |
| **认证** | 必需（API Token 或 Cookie） |
| **内容类型** | `multipart/form-data` |

**请求参数：**

| 名称 | 类型 | 位置 | 必填 | 描述 |
|------|------|------|------|------|
| `file` | File | `form-data` | 是 | 待上传的文件 |

**文件大小限制**：默认 20MB，通过 `MAX_SIZE_MB` 环境变量配置（配合自建 TG Bot API 可适当调高）。

**文件类型自动识别：**

| 文件主类型 | TG API 调用 | 字段 |
|-----------|------------|------|
| `image/*` | `sendPhoto` | `photo` |
| `video/*` | `sendVideo` | `video` |
| `audio/*` | `sendAudio` | `audio` |
| 其他 (`application/*`, `text/*`, 等) | `sendDocument` | `document` |

**响应：**

| 状态码 | 说明 |
|--------|------|
| `200 OK` | 上传成功，返回 JSON |
| `400 Bad Request` | 文件大小超过 `MAX_SIZE_MB` 限制 |
| `302 Redirect` | 认证失败，重定向到 `/` |
| `502 Bad Gateway` | Telegram 配置错误或通信失败 |
| `504 Gateway Timeout` | 网络超时 |
| `500 Internal Server Error` | 服务器内部错误（TG 返回数据异常等） |

**成功响应示例：**

```json
{
    "status": 1,
    "msg": "✔ 上传成功",
    "url": "https://your.domain/1703088000000.webp",
    "file": "example.webp",
    "webpSize": 25600
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | int | 1=成功，0=失败 |
| `msg` | string | 提示消息 |
| `url` | string | 文件访问 URL（图片使用时间戳命名，其余文件保留原文件名；WebP 模式下返回 .webp 链接） |
| `file` | string | 最终文件名 |
| `webpSize` | int | 实际文件大小（字节），WebP 模式为转换后精准大小 |

---

### 2. 文件管理 `/admin`

获取文件管理页面（HTML）。

| 属性 | 说明 |
|------|------|
| **路径** | `/admin` |
| **方法** | `GET` |
| **认证** | 必需（Cookie 会话） |
| **响应** | `200 OK` — `text/html`，文件管理页面 |

**功能说明：**
- 卡片网格展示所有已上传文件（含预览缩略图、文件名、大小、上传时间）
- 每页 15 个文件，支持前后翻页
- 搜索框实时按文件名过滤
- 每个卡片提供：**分享**（二维码）、**下载**、**删除** 按钮
- 删除操作会同时从 TG 频道和数据库移除

> **注意**：此接口返回 HTML 页面，非 JSON 数据。如需 JSON 格式的文件列表，请使用 `/search` 接口。

### 3a. 自建 TG Bot API（可选）

系统支持通过环境变量 `TG_API_BASE` 指定自建 Telegram Bot API 服务器地址，默认回退 `https://api.telegram.org`。

**自建 API 的优势：**
- 突破官方 20MB 单文件限制（`--max-file-size` 可调至 ~2000MB）
- 上传和下载走自有服务器，网络更稳定
- 所有 API 接口（`sendDocument` / `getFile` / `deleteMessage` 等）完全兼容，代码无需其他改动

**配置方式：**
- 在 Cloudflare Worker 环境变量中添加 `TG_API_BASE`，值为自建服务器地址
- 例如：`TG_API_BASE=https://api.tgtg.eu.cc`
- 同时调高 `MAX_SIZE_MB` 以匹配服务器配置

---

### 3. 文件搜索 `/search`

按文件名模糊搜索已上传的文件，返回 JSON 格式的文件列表。

| 属性 | 说明 |
|------|------|
| **路径** | `/search` |
| **方法** | `POST` |
| **认证** | 必需（API Token 或 Cookie） |
| **内容类型** | `application/json` |

**请求参数（JSON Body）：**

| 名称 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `query` | string | 是 | 搜索关键词，对 `file_name` 和 `webp_file_name` 进行模糊匹配（大小写不敏感） |

**响应：**

| 状态码 | 说明 |
|--------|------|
| `200 OK` | 返回文件列表 JSON |
| `500 Internal Server Error` | 搜索执行失败 |

**成功响应示例：**

```json
{
    "files": [
        {
            "url": "https://your.domain/1703088000000.png",
            "webp_url": "https://your.domain/1703088000000.webp",
            "fileId": "AgACAgQAAxk...",
            "message_id": 12345,
            "created_at": "2025-01-01T00:00:00.000Z",
            "file_name": "example.png",
            "webp_file_name": "example.webp",
            "file_size": 102400,
            "mime_type": "image/png"
        }
    ]
}
```

---

### 4. 文件删除 `/delete`

从数据库和 Telegram 频道中删除指定文件。

| 属性 | 说明 |
|------|------|
| **路径** | `/delete` |
| **方法** | `POST` |
| **认证** | 必需（API Token 或 Cookie） |
| **内容类型** | `application/json` |

**请求参数（JSON Body）：**

| 名称 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `url` | string | 是 | 文件在数据库中的 `url` 或 `webp_url` 字段值（完整 URL） |

**响应：**

| 状态码 | 说明 |
|--------|------|
| `200 OK` | 删除成功，返回 JSON |
| `400 Bad Request` | URL 参数无效 |
| `404 Not Found` | 文件中不存在 |
| `500 Internal Server Error` | 服务器内部错误 |

**成功响应示例：**

**正常删除：**
```json
{
    "success": true,
    "message": "文件删除成功"
}
```

**TG 消息已不存在时（仍从数据库删除）：**
```json
{
    "success": true,
    "message": "Telegram消息已不存在，但已从数据库移除"
}
```

**TG 删除失败时（仍从数据库删除）：**
```json
{
    "success": true,
    "message": "文件已从数据库删除，但Telegram消息删除失败: ..."
}
```

> **注意**：即使 Telegram 消息删除失败，数据库记录也会被删除，防止数据残留。

---

### 5. 获取配置 `/config`（公开接口）

获取文件上传限制等安全配置信息。**无需认证**。

| 属性 | 说明 |
|------|------|
| **路径** | `/config` |
| **方法** | `GET` |
| **认证** | 否（公开接口） |
| **响应** | `200 OK` — `application/json` |

**响应示例：**

```json
{
    "maxSizeMB": 20
}
```

> 当前仅返回 `maxSizeMB` 字段，后续可扩展返回更多公开配置。

---

### 6. 文件直链访问（隐式接口）

所有上传的文件通过 `https://<domain>/<timestamp>.<ext>` 格式的 URL 直接访问，自动处理：

- **缓存**：响应自动写入 Cloudflare Cache，一年有效期
- **CORS**：`Access-Control-Allow-Origin: *`，允许跨域引用
- **WebP 自动重定向**：当 `WEBP_ENABLED=true` 且访问原始 URL（如 `.png`）时，301 重定向到对应的 `.webp` 链接
- **Content-Disposition**：`inline` 方式返回，携带正确文件名（UTF-8 编码）
- **内容嗅探防护**：`X-Content-Type-Options: nosniff`

**可用预览格式：**

| 类型 | 扩展名 |
|------|--------|
| 图片 | jpg, jpeg, png, gif, webp, svg, icon |
| 视频 | mp4, webm |
| 音频 | mp3, wav, ogg |
| 其他 | 显示 📄 占位符 |

---

## 📝 完整数据字段说明

搜索和管理页面返回的文件对象包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | string | 原始文件访问 URL |
| `webp_url` | string | WebP 文件访问 URL（启用 WebP 模式时） |
| `fileId` | string | Telegram 文件 ID，用于获取实际文件 |
| `message_id` | int | Telegram 频道消息 ID |
| `created_at` | string | ISO 8601 时间戳 |
| `file_name` | string | 原始文件名 |
| `webp_file_name` | string | WebP 文件名（启用 WebP 模式时） |
| `file_size` | int | 文件大小（字节） |
| `mime_type` | string | 文件的 MIME 类型 |
