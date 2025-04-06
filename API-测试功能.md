# API 使用文档
此为测试功能，谨慎使用

## 认证方式

所有API请求需携带API Key，可通过以下方式传递：

|方式|示例|
|---|---|
|请求头|`X-API-Key: your_api_key`|
|URL参数|`/api/files?api_key=your_api_key`|

## API端点速查表

### 文件上传

|方法|路径|参数|成功响应|
|---|---|---|---|
|`POST`|`/api/upload`|`file` (文件表单字段)|`{url, file_name, file_size, mime_type}`|

### 文件管理

|方法|路径|说明|成功响应|
|---|---|---|---|
|`GET`|`/api/files`|获取文件列表|`{files: [...]}`|
|`GET`|`/api/files/{path}`|获取单个文件信息|文件信息对象|
|`DELETE`|`/api/files/{path}`|删除指定文件|`{success: true}`|

### 文件搜索

|方法|路径|参数|成功响应|
|---|---|---|---|
|`GET`|`/api/search`|`q` (搜索关键词)|`{files: [...]}`|

## 常用错误码

|状态码|说明|
|---|---|
|400|请求参数错误/文件过大|
|401|API Key无效|
|404|文件不存在|
|500|服务器内部错误|

## 快速示例

```bash
# 上传文件
curl -X POST -H "X-API-Key: xxx" -F "file=@test.jpg" https://domain.com/api/upload

# 删除文件
curl -X DELETE -H "X-API-Key: xxx" https://your-domain.com/api/files/文件名.jpg

# 获取文件列表
curl -H "X-API-Key: xxx" https://domain.com/api/files

# 搜索文件
curl -H "X-API-Key: xxx" https://domain.com/api/search?q=关键词
```
