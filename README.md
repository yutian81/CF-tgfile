# TGFile

## 项目特点
基于 Cloudflare Workers + D1 数据库 + Telegram Bot 的文件存储、分享、下载、搜索及在线预览系统。上传的文件通过 Telegram 机器人发送到指定频道，生成可直接访问的直链。

## 功能

### 文件操作
- **文件上传**：支持拖拽、点击选择、Ctrl+V 粘贴上传，支持多文件同时上传
  - 图片文件以时间戳命名（如 `1703088000000.png`），其他文件保留原文件名（如 `项目报告.pdf`），同名文件直接覆盖
  - 非图片文件在上传预览区按类型显示对应图标（PDF/Word/Excel/压缩包/代码/音视频等）
  - 上传时显示进度条百分比
  - 上传完成后可一键复制 URL / Markdown / HTML 三种格式的链接
  - 单文件大小限制可通过 `MAX_SIZE_MB` 配置（默认 20MB）
  - 由于 TG 官方 API 限制，单文件最大 20MB（使用官方 Bot API）；若需上传更大文件，需自行部署 [TG-BOT-API](https://github.com/tdlib/telegram-bot-api) 实现分片上传

- **文件管理**：管理员页面以卡片网格展示所有已上传的文件
  - **分页浏览**：每页 15 个文件，支持前后翻页
  - **在线预览**：图片、视频、音频、**PDF**直接预览；**文本/代码文件**点击后懒加载内容预览；其余文件按类型显示对应图标（PDF/Word/Excel/压缩包/代码/视频/音频等均有专属图标）
  - **分享**：生成二维码，扫码或点击复制链接
  - **下载**：一键下载原文件
  - **删除**：同步从 TG 频道中删除消息和文件，若 TG 消息已不存在则仅清理数据库

- **文件搜索**：按文件名模糊搜索，大小写不敏感

### 用户认证
- **双重认证机制**：
  - **API Token 认证**：在请求头 `Authorization` 中携带固定密钥，适合脚本和第三方集成
  - **Cookie 会话认证**：浏览器登录后自动维持会话，有效期可配置
- **可选开关**：`ENABLE_AUTH=false` 可完全跳过登录，直接进入上传页面

### WebP 转换（可选）
- 利用 Cloudflare Images 的免费额度（每月 5000 次唯一转换），将 JPEG/PNG/GIF 图片自动转换为 WebP 格式
- 转换后文件大小更小，加载更快
- 开启方法：环境变量 `WEBP_ENABLED=true`
- **注意**：需绑定自定义域名才能使用 WebP 转换功能

### 公开 API
- `/config` 接口无需认证，返回上传大小限制等安全配置信息
- 详细 API 文档见 [API.md](./API.md)

### 界面特色
- 毛玻璃（Frosted Glass）UI 设计
- Bing 每日背景图自动轮换（每小时更新）
- 统一的模态框提示系统（showModal / showAlert / showConfirm），替代浏览器原生弹窗
- 响应式布局，移动端适配

## 环境变量说明

| 变量名 | 变量值 | 是否必须 | 说明 |
|--------|--------|----------|------|
| `DOMAIN` | 绑定的域名 | 否 | 用于生成文件访问链接和 WebP 转换（推荐配置），不配置不影响正常部署和上传 |
| `TG_BOT_TOKEN` | Telegram Bot Token | **是** | BotFather 获取 |
| `TG_CHAT_ID` | Telegram 频道 ID | **是** | 格式如 `-1001234567890` |
| `DATABASE` | D1 数据库绑定 | **是** | 在 Cloudflare Dashboard 中绑定，变量名必须为 `DATABASE` |
| `USERNAME` | 登录用户名 | 否 | 默认 `admin`（若未设置，手动部署时需在 CF 环境变量中配置；Actions 部署通过 Secrets 传入） |
| `PASSWORD` | 登录密码 | 否 | 默认 `admin`（同上） |
| `API_TOKEN` | API 接口固定密钥 | 否 | 默认 `tgfile-admin` |
| `ENABLE_AUTH` | `true` / `false` | 否 | 是否开启身份认证，默认 `true` |
| `WEBP_ENABLED` | `true` / `false` | 否 | 是否开启 WebP 转换，默认 `false` |
| `TG_API_BASE` | 自建 TG Bot API 地址 | 否 | 留空则走官方 `https://api.telegram.org`。自建 API 可突破上传大小限制，但 `--local` 模式下文件下载需额外配置 |
| `MAX_SIZE_MB` | 数字 | 否 | 单文件上传大小限制（MB），默认 `20`。走官方 API 时受 Telegram 下载限制 20MB，不宜设大；配合自建 TG Bot API 可酌情调高 |
| `COOKIE` | 数字 | 否 | Cookie 有效期（天），默认 `7` |

## 部署方法

本项目提供两种部署方式：

| 方式 | 推荐度 | 适用场景 |
|------|--------|----------|
| **手动部署**（粘贴代码） | ⭐ 推荐 | 只想快速用起来，无需自动化 |
| **GitHub Actions 自动部署** | ✅ | 需要在代码更新后自动同步到 CF Worker |

---

### 方式一：手动部署（推荐）

#### 1. 新建 Worker
- 登录 Cloudflare Dashboard，进入 **Workers & Pages**
- 创建一个新的 Worker
- 将 `_worker.js` 的全部内容复制粘贴到 Worker 编辑器中并部署

#### 2. 绑定 D1 数据库
- 在 Cloudflare Dashboard 中进入 **D1**，创建一个新数据库（如 `tgfile-db`）
- 返回 Worker 的 **设置 → 绑定**，添加 D1 数据库绑定：
  - 变量名称：`DATABASE`
  - 选择刚刚创建的数据库

#### 3. 配置环境变量
在 Worker 的 **设置 → 环境变量** 中添加上述表格中的变量，**至少需配置**：
- `TG_BOT_TOKEN` — Telegram Bot Token
- `TG_CHAT_ID` — Telegram 频道 ID

> 若未配置 `USERNAME` / `PASSWORD`，默认值为 **`admin` / `admin`**。首次登录请使用此账号。

#### 4. 绑定自定义域名（推荐）
- 在 Worker 的 **触发器** 中绑定自定义域名
- 同时将 `DOMAIN` 环境变量设置为该域名

---

### 方式二：GitHub Actions 自动部署

> 前提：已从本仓库 Fork 到自己的 GitHub

工作流模板位于 `.github/workflows/deploy-to-cfwk.yml~`，如需使用请**去掉文件名末尾的 `~`** 使其生效。

#### 1. 配置 GitHub Secrets

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加：

| Secret 名称 | 说明 | 是否必须 |
|-------------|------|----------|
| `CF_API_TOKEN` | Cloudflare API Token（需有 Workers & D1 权限） | **是** |
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID（设为 **Variables**） | **是** |
| `TG_BOT_TOKEN` | Telegram Bot Token | **是** |
| `TG_CHAT_ID` | Telegram 频道 ID | **是** |
| `USERNAME` | 登录用户名（可选） | 否 |
| `PASSWORD` | 登录密码（可选） | 否 |
| `DOMAIN` | 自定义域名，不带 https（可选） | 否 |

> `DOMAIN` 为可选变量，Actions 部署时不传入，部署后可在 CF Dashboard 手动配置。

#### 2. 触发部署

自动触发条件：
- 向 `main` 分支推送 `_worker.js` 或 `wrangler.toml`

手动触发：
- 在 GitHub 仓库的 **Actions → 自动部署到 CF Worker → Run workflow**

部署成功后，工作流会自动输出 Worker 管理后台链接。

## 环境变量配置对照

> 手动部署在 CF Dashboard 中配，Actions 部署在 GitHub Secrets 中配。

| 变量 | 手动部署 | Actions 部署 |
|------|----------|-------------|
| `TG_BOT_TOKEN` | CF Dashboard 环境变量 | GitHub Secrets `TG_BOT_TOKEN` |
| `TG_CHAT_ID` | CF Dashboard 环境变量 | GitHub Secrets `TG_CHAT_ID` |
| `DATABASE` | CF Dashboard D1 绑定 | wrangler.toml `[[d1_databases]]` |
| `USERNAME` / `PASSWORD` | CF Dashboard 环境变量（默认 `admin`/`admin`） | GitHub Secrets（可选） |
| `DOMAIN` | CF Dashboard 环境变量（可选） | 部署后在 CF Dashboard 手动配置 |

## 访问应用
- 打开浏览器访问绑定的域名（或 Worker 分配的 `.workers.dev` 域名）
- 首次访问需要登录（默认用户名/密码：`admin`/`admin`）
- 登录成功后自动跳转到上传页面
- Cookie 有效期默认 7 天，可通过 `COOKIE` 环境变量调整

## 数据库表结构
系统首次运行时自动创建 `files` 表，结构如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | TEXT PRIMARY KEY | 原始文件访问 URL |
| `webp_url` | TEXT UNIQUE | WebP 文件访问 URL（仅 WebP 模式启用时） |
| `fileId` | TEXT NOT NULL | Telegram 文件 ID |
| `message_id` | INTEGER NOT NULL | Telegram 消息 ID |
| `created_at` | INTEGER NOT NULL | 创建时间戳（ISO 8601 格式） |
| `file_name` | TEXT | 原始文件名 |
| `webp_file_name` | TEXT | WebP 文件名（仅 WebP 模式启用时） |
| `file_size` | INTEGER | 文件大小（字节），WebP 模式下为转换后的实际大小 |
| `mime_type` | TEXT | 文件 MIME 类型 |

> 如果是**从旧版升级**且旧表未包含 `webp_url` / `webp_file_name` 列，需手动执行以下 SQL：
> ```sql
> ALTER TABLE files ADD COLUMN webp_url TEXT;
> CREATE UNIQUE INDEX idx_webp_url ON files (webp_url) WHERE webp_url IS NOT NULL;
> ALTER TABLE files ADD COLUMN webp_file_name TEXT;
> ```
> **新部署无需执行任何 SQL**，系统自动建表。

## 更新日志

### 2026-06-28
- 升级 Wrangler 至 v4，移除 `wrangler.toml` 中的 D1 数据库 ID 硬编码（v4 自动绑定）
- 更新 GitHub Actions 部署工作流（`deploy-to-cfwk.yml~` 模板）
- 优化 README 部署文档，区分手动部署和 Actions 部署

### 2025-12-17
- 增加 WebP 图片自动转换（基于 CF Images API）
- 优化上传响应，返回 `file`（最终文件名）和 `webpSize`（实际大小）
- 增加固定 API Token 认证机制（`API_TOKEN` 环境变量）
- 大幅精简代码，优化性能

### 2025-02-11
- 为前端页面增加 Font Awesome 图标和页面描述

### 2025-02-09
- 修复 WebP 图片上传失败的问题
- 文件管理页面删除文件时同步从 TG 频道删除消息
- 文件管理页面增加二维码分享功能

### 2025-02 (初始版本)
- 基础文件上传、管理、搜索功能
- 用户登录认证
- Bing 每日背景图

## 后续计划
- 增加更多文件格式的在线预览
- 文件管理页面增加批量删除功能

## 鸣谢
感谢这位[大佬](https://github.com/0-RTT/telegraph)给予的灵感，有一些代码借鉴于此。

## 贡献
欢迎提交 Issue 或 Pull Request！

## 许可证
MIT License