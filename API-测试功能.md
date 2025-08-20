# API 使用文档

## 上传文件
```bash
curl -X POST -H "X-API-Key: your_api_key" -F "file=@test.jpg" https://your-domain.com/api/upload
```

## 获取文件列表
```bash
curl -H "X-API-Key: your_api_key" https://your-domain.com/api/files
```

## 获取单个文件信息
```bash
curl -H "X-API-Key: your_api_key" https://your-domain.com/api/files/1739241502.jpg
```

## 删除文件
```bash
curl -X DELETE -H "X-API-Key: your_api_key" https://your-domain.com/api/files/1739241502.jpg
```

## 搜索文件
```bash
curl -H "X-API-Key: your_api_key" "https://your-domain.com/api/search?q=keyword"
```

## 总结

- API Key认证（支持Header和URL参数两种方式）

- 文件上传端点 (/api/upload)

- 文件列表获取端点 (/api/files)

- 单个文件信息获取端点 (/api/files/{filename})

- 文件删除端点 (/api/files/{filename})

- 文件搜索端点 (/api/search?q=keyword)
