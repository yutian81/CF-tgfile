## 认证
所有API请求需要包含有效的API密钥，可以通过以下方式提供：

请求头：
```
X-API-Key: your_api_key
```

URL参数：
```
/api/files?api_key=your_api_key
```

## 端点
### 1.上传文件
请求:
- 方法: POST
- 路径: /api/upload
- 内容类型: multipart/form-data
- 参数: file (要上传的文件)

成功响应 (200):
```json
{
  "url": "https://your-domain.com/12345.jpg",
  "file_name": "example.jpg",
  "file_size": 1024,
  "mime_type": "image/jpeg"
}
```

错误响应:
- 400: 无效请求/文件过大
- 401: 未授权
- 500: 服务器错误

