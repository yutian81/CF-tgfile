
### **项目 API 文档**

**基地址 (Base URL)**: `https://<你的Worker域名>`

---

#### 1. 登录认证接口

**`POST /login`**

用于用户登录并获取身份验证 Cookie。

- **请求方法**: `POST`
    
- **请求头**: `Content-Type: application/json`
    
- **请求体**:
    
    ```json
    {
      "username": "string",
      "password": "string"
    }
    ```
    
- **成功响应 (200 OK)**:
    
    - **响应头**: `Set-Cookie: auth_token=…`
        
    - **响应体**: `"登录成功"`
        
- **失败响应 (401 Unauthorized)**:
    
    - **响应体**: `"认证失败"`
        

---

#### 2. 文件上传接口

**`POST /upload`**

用于上传文件到 Telegram，并将文件信息保存到数据库。

- **请求方法**: `POST`
    
- **请求头**: `Content-Type: multipart/form-data`
    
- **请求体**:
    
    - `file` (文件): 必须包含一个名为 `file` 的文件。
        
- **成功响应 (200 OK)**:
    
    - **响应头**: `Content-Type: application/json`
        
    - **响应体**:

        ```json
        {
          "status": 1,
          "msg": "✔ 上传成功",
          "url": "string"
        }
        ```
        
- **失败响应 (400, 500, 502, 504)**:
    
    - **响应头**: `Content-Type: application/json`
        
    - **响应体**:

        ```json
        {
          "status": 0,
          "msg": "✘ 上传失败",
          "error": "string"
        }
        ```
        
        可能的错误类型包括：`文件超过…MB限制` (400), `Telegram参数配置错误` (502), `未找到文件` (400), `未获取到文件ID` (500) 等。
        

---

#### 3. 文件管理接口

**`GET /admin`**

用于获取文件列表的 HTML 页面。该接口需要身份验证。

- **请求方法**: `GET`
    
- **请求头**: `Cookie: auth_token=…`
    
- **响应**: 返回一个包含所有已上传文件列表的 HTML 页面。
    

---

#### 4. 文件删除接口

**`POST /delete`**

用于从数据库和 Telegram 频道中删除文件。该接口需要身份验证。

- **请求方法**: `POST`
    
- **请求头**: `Content-Type: application/json`
    
- **请求体**:

    ```json
    {
      "url": "string"
    }
    ```
    
- **成功响应 (200 OK)**:
    
    - **响应头**: `Content-Type: application/json`
        
    - **响应体**:
        
        ```json
        {
          "success": true,
          "message": "文件删除成功"
        }
        ```
        
- **失败响应 (400, 404, 500)**:
    
    - **响应头**: `Content-Type: application/json`
        
    - **响应体**:
        
        ```json
        {
          "error": "string"
        }
        ```
        
        可能的错误包括：`无效的URL` (400), `文件不存在` (404), `Telegram 消息删除失败` (500) 等。
        

---

#### 5. 文件搜索接口

**`POST /search`**

用于根据文件名搜索已上传的文件。该接口需要身份验证。

- **请求方法**: `POST`
    
- **请求头**: `Content-Type: application/json`
    
- **请求体**:

    ```json
    {
      "query": "string"
    }
    ```
    
- **成功响应 (200 OK)**:
    
    - **响应头**: `Content-Type: application/json`
        
    - **响应体**:
        
        ```json
        {
          "files": [
            {
              "url": "string",
              "fileId": "string",
              "message_id": "integer",
              "created_at": "string",
              "file_name": "string",
              "file_size": "integer",
              "mime_type": "string"
            }
          ]
        }
        ```
        
- **失败响应 (500)**:
    
    - **响应头**: `Content-Type: application/json`
        
    - **响应体**:
        
        ```json
        {
          "error": "string"
        }
        ```
        

---

#### 6. 文件下载/访问接口

**`GET /<文件名>`**

用于通过 URL 直接访问已上传的文件。

- **请求方法**: `GET`
    
- **请求头**: 无需特殊请求头。
    
- **响应**:
    
    - **成功响应**: 返回文件的二进制内容，附带正确的 `Content-Type` 和 `Content-Disposition` 头。
        
    - **失败响应 (404, 500)**: 返回纯文本错误信息，如 `文件不存在` 或 `服务器内部错误`。
        

---

#### 7. 必应背景图接口

**`GET /bing`**

用于获取必应每日图片。

- **请求方法**: `GET`
    
- **请求头**: 无需特殊请求头。
    
- **响应 (200 OK)**:
    
    - **响应头**: `Content-Type: application/json`
        
    - **响应体**:
          
        ```json
        {
          "status": true,
          "message": "操作成功",
          "data": [
            {
              "url": "string"
            }
          ]
        }
        ```
        

---

#### 8. 配置接口

**`GET /config`**

用于获取前端所需的配置信息。

- **请求方法**: `GET`
    
- **请求头**: 无需特殊请求头。
    
- **响应 (200 OK)**:
    
    - **响应头**: `Content-Type: application/json`
        
    - **响应体**:

        ```json
        {
          "maxSizeMB": "number"
        }
        ```