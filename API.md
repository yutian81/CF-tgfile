# API 说明文档

## 🔐 认证机制 (Authentication)

本系统采用双重认证机制，确保 Web 界面用户和自动化 API 客户端都能安全访问受限接口。

### 1. API Token 认证 (推荐用于脚本/程序)

对于需要永久和无会话访问的自动化脚本或客户端，请使用固定的 API Token。

- **Token 来源：** Worker 环境变量中配置的 `API_TOKEN`。
- **如何使用：** 将 Token 放置在所有受保护请求的 `Authorization` Header 中，使用 `Bearer` 方案。

|**Header 键 (Key)**|**Header 值 (Value)**|**示例**|
|---|---|---|
|`Authorization`|`Bearer <您的 API Token>`|`Authorization: Bearer my-secure-api-key-12345`|

### 2. Cookie 会话认证 (推荐用于浏览器)

Web 界面用户通过 `/login` 成功登录后，系统会返回带有过期时间的 `auth_token` Cookie  
浏览器将自动携带此 Cookie 进行后续操作，但 cookie 存在有效期限制，不适用于自动化集成

- **Token 来源：** `/login` 成功后设置的 `auth_token` Cookie。
- **如何使用：** 浏览器自动处理。

---

## 接口列表 (API Endpoints)

### 1. 文件上传 (Upload File)

用于上传文件到 Telegram 并记录到 D1 数据库。

|**属性**|**说明**|
|---|---|
|**路径**|`/upload`|
|**方法**|`POST`|
|**认证**|必需 (API Token 或 Cookie)|
|**内容类型**|`multipart/form-data`|

#### 请求参数 (Request Parameters)

|**名称**|**类型**|**位于**|**描述**|
|---|---|---|---|
|`file`|文件|`form-data`|待上传的文件内容。|

#### 响应 (Response)

|**状态码**|**响应内容**|**描述**|
|---|---|---|
|`200 OK`|`application/json`|上传成功。|
|`400 Bad Request`|`application/json`|文件大小超过限制 (`MAX_SIZE_MB`)。|
|`401 Unauthorized`|重定向到 `/`|认证失败 (API Token 或 Cookie 无效)。|
|`5xx Error`|`application/json`|Telegram 配置错误或服务器内部错误。|

**成功响应示例:**

```json
{
    "status": 1,
    "msg": "✔ 上传成功",
    "url": "https://your.domain/1703088000000.webp"
}
```

### 2. 文件列表与管理 (Admin/List Files)

用于获取所有已上传文件的列表。

|**属性**|**说明**|
|---|---|
|**路径**|`/admin`|
|**方法**|`GET`|
|**认证**|必需 (API Token 或 Cookie)|
|**内容类型**|N/A|

#### 响应 (Response)

- **注意：** 此接口设计为返回 **HTML 页面**，用于 Web 管理界面展示。如果需要返回 JSON 数据，建议使用 `/search` 接口或另行创建专用 JSON 接口。

|**状态码**|**响应内容**|**描述**|
|---|---|---|
|`200 OK`|`text/html`|返回文件管理页面 HTML 内容。|
|`401 Unauthorized`|重定向到 `/`|认证失败。|

### 3. 文件搜索 (Search Files)

用于根据文件名模糊搜索文件。

|**属性**|**说明**|
|---|---|
|**路径**|`/search`|
|**方法**|`POST`|
|**认证**|必需 (API Token 或 Cookie)|
|**内容类型**|`application/json`|

#### 请求参数 (Request Parameters)

|**名称**|**类型**|**位于**|**描述**|
|---|---|---|---|
|`query`|`string`|`body`|搜索关键词 (模糊匹配 `file_name`)。|

#### 响应 (Response)

|**状态码**|**响应内容**|**描述**|
|---|---|---|
|`200 OK`|`application/json`|搜索结果列表。|
|`401 Unauthorized`|重定向到 `/`|认证失败。|

**成功响应示例:**

```json
{
    "files": [
        {
            "url": "https://your.domain/...",
            "file_name": "example.png",
            "file_size": 102400,
            // ... 其他字段
        }
    ]
}
```

### 4. 文件删除 (Delete File)

用于从数据库和 Telegram 频道中删除文件。

|**属性**|**说明**|
|---|---|
|**路径**|`/delete`|
|**方法**|`POST`|
|**认证**|必需 (API Token 或 Cookie)|
|**内容类型**|`application/json`|

#### 请求参数 (Request Parameters)

|**名称**|**类型**|**位于**|**描述**|
|---|---|---|---|
|`url`|`string`|`body`|文件的完整 URL (即数据库中的 `url` 字段)。|

#### 响应 (Response)

|**状态码**|**响应内容**|**描述**|
|---|---|---|
|`200 OK`|`application/json`|删除成功。|
|`404 Not Found`|`application/json`|文件不存在。|
|`401 Unauthorized`|重定向到 `/`|认证失败。|
|`5xx Error`|`application/json`|服务器内部错误或 Telegram 消息删除失败。|

**成功响应示例:**

JSON

```
{
    "success": true,
    "message": "文件删除成功"
}
```

---

## 🔒 公共接口 (Public Endpoints)

以下接口无需任何认证即可访问。

### 5. 获取 Bing 背景图 (Bing Wallpaper)

用于获取 Bing 每日高清背景图 URL 列表。

|**属性**|**说明**|
|---|---|
|**路径**|`/bing`|
|**方法**|`GET`|
|**认证**|否|

**响应示例:**

```json
{
    "status": true,
    "message": "操作成功",
    "data": [
        { "url": "https://cn.bing.com/th?id=OHR...." },
        // ... 更多图片
    ]
}
```

### 6. 获取配置信息 (Configuration)

用于获取上传限制等安全配置信息。

|**属性**|**说明**|
|---|---|
|**路径**|`/config`|
|**方法**|`GET`|
|**认证**|否|

**响应示例:**

```json
{
    "maxSizeMB": 20
}
```
