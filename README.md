# TGFile

## 项目特点
该项目是一个基于 Cloudflare Worker 环境和 telegram 频道存储功能的文件上传、管理、搜索、在线预览系统。系统支持用户认证，上传的文件将通过 Telegram 机器人发送到指定的频道聊天中。

## 功能
- **用户认证**：可选是否开启身份认证，默认开启 `ENABLE_AUTH = true`，如设置为 `false`，则跳过登录。
- **前端登录**：`ENABLE_AUTH = true`的情况下，需要输入用户名密码登录，`cookie`有效期为默认为7天。
- **文件上传**：用户可以通过拖拽或点击选择文件进行上传，支持多文件上传。
- **文件管理**：管理员可以查看已上传的文件列表，支持在线预览（图片和视频格式）、复制链接、下载和删除文件。
- **文件搜索**：用户可以根据文件名搜索已上传的文件。
- **背景图更新**：系统会定期从 Bing 获取背景图，提升用户体验。

## 部署方法

1. **粘贴代码**：
   - 新建一个 worker，复制 `_worker.js` 的内容粘贴到项目中并部署

2. **绑定数据库（必须）**：
   - 创建一个D1数据库，数据库名随意，例如：`tgflie`
   - 在worker项目的设置中绑定刚刚创建的数据库，变量名：`DATABASE`

3. **配置环境变量**：  
   | 变量名 | 变量值 | 是否必须 | 备注 |
   | ----- | ------ | ------- | ---- |
   | DOMAIN | 你项目绑定的域名 | √ |    |
   | USERNAME | 登录用户名 | × |    |
   | PASSWORD | 登录密码 | × |    |
   | COOKIE | 7 | × | cookie有效期，默认为7 |
   | ENABLE_AUTH | true / false | × | 默认为true，如果设为false，则不启用登录 |
   | TG_BOT_TOKEN | TG机器人 token | √ | 获取方式请自行谷歌，下同 |
   | TG_CHAT_ID | TG频道ID | √ | 是频道ID，不是机器人ID，格式为`-10*****062333` |
   | MAX_SIZE_MB | 1024 | × | 上传的单文件大小上限，默认为1g |

## 访问应用
   打开浏览器，访问 `http://你绑定的域名`，进行文件上传和管理。

## 已知问题
- webp格式的图片上传会失败
- 删除文件时只删除了数据库中的表，没有同步从tg频道删除文件

## Plan 计划
- 修复上述两个bug
- 增加更多文件格式的在线预览
- 为文件链接生存二维码便于分享

## 鸣谢
感谢这位[大佬](https://github.com/0-RTT/telegraph)给予的灵感，有一些代码借鉴于此

## 贡献
欢迎任何形式的贡献！请提交问题或拉取请求。

## 许可证
该项目采用 MIT 许可证，详细信息请查看 LICENSE 文件。
