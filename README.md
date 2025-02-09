# TGFile

## 项目特点
该项目是一个基于 Cloudflare Worker 环境和 telegram 频道存储功能的文件上传、分享、下载、搜索、在线预览系统。支持用户认证，上传的文件将通过 Telegram 机器人发送到指定的频道聊天中。

## 功能
- **用户认证**：可选是否开启身份认证，默认开启 `ENABLE_AUTH = true`，如设置为 `false`，则跳过登录。
- **前端登录**：`ENABLE_AUTH = true`的情况下，需要输入用户名密码登录，`cookie`有效期为默认为7天。
- **文件上传**：用户可以通过拖拽或点击选择文件进行上传，支持多文件上传，支持显示上传进度条百分比。
- **文件管理**：管理员可以查看已上传的文件列表，支持在线预览（图片和视频格式）、分享、下载和删除文件。
   - 分享：会生成一个二维码，二维码框内点击“复制链接”按钮也可复制url链接
   - 下载：直接调用浏览器下载功能
   - 删除：会同步从tg频道中删除上传的文件
- **文件搜索**：用户可以根据文件名搜索已上传的文件。
- **背景图更新**：系统会定期从 Bing 获取背景图，提升用户体验。

## 2025-02-09 更新
- 解决webp图片上传失败的问题
- 文件管理页面删除文件时，可以同步从tg频道删除消息
- 文件管理页面点击分享可生成二维码
- **注意**：本次更新需要重写D1数据表，先删除在D1中生成的表文件，重新访问项目主页以生成新的表文件

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
   打开浏览器，访问 `http://你绑定的域名`，首次登录会要求输入用户名和密码，然后进行文件上传和管理。二次登录会跳过登录环节，直接进入上传页面，cookie 有效期为 7 天，超过 7 天会要求重新登录。你也可以在环境变量中设置 COOKIE 变量改变有效期

## 已知问题
- 上传超过20M的视频文件无法生成直链，无法在线播放，原因未知，可能时tg的限制

## Plan 计划
- 增加更多文件格式的在线预览
- 文件管理页面增加分页功能

## 鸣谢
感谢这位[大佬](https://github.com/0-RTT/telegraph)给予的灵感，有一些代码借鉴于此

## 贡献
欢迎任何形式的贡献！请提交问题或拉取请求。

## 许可证
该项目采用 MIT 许可证，详细信息请查看 LICENSE 文件。
