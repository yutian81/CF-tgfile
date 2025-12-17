// 数据库初始化（首次）
let isDatabaseInitialized = false;

async function initDatabase(config) {
  if (isDatabaseInitialized) return;
  try {
    await config.database
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS files (
        url TEXT PRIMARY KEY,
        webp_url TEXT UNIQUE,
        fileId TEXT NOT NULL,
        message_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        file_name TEXT,
        webp_file_name TEXT,
        file_size INTEGER,
        webp_file_size INTEGER,
        mime_type TEXT
      )
    `
      )
      .run();
    isDatabaseInitialized = true;
  } catch (error) {
    console.error('[error] Database initialization failed:', error);
    throw new Response('数据库初始化失败', { status: 500 });
  }
}

// 导出函数
export default {
  async fetch(request, env) {
    // 环境变量配置
    const config = {
      domain: env.DOMAIN,
      database: env.DATABASE,
      username: env.USERNAME || 'admin',
      password: env.PASSWORD || 'admin',
      apiToken: env.API_TOKEN || 'tgfile-admin',
      enableAuth: env.ENABLE_AUTH === 'true', // 是否开启身份认证，默认不开启
      webpEnabled: env.WEBP_ENABLED === 'true', // 是否开启 WebP 转换，默认不开启
      tgBotToken: env.TG_BOT_TOKEN,
      tgChatId: env.TG_CHAT_ID,
      cookie: Number(env.COOKIE) || 7, // cookie有效期默认为 7
      maxSizeMB: Number(env.MAX_SIZE_MB) || 20, // 上传单文件大小默认为20M
    };

    // 初始化数据库
    await initDatabase(config);

    // 路由处理
    const { pathname } = new URL(request.url);

    // 统一认证检查
    const publicRoutes = ['/config', '/bing'];
    const authRoutes = ['/', '/login'];

    if (config.enableAuth) {
      if (!publicRoutes.includes(pathname) && !authRoutes.includes(pathname)) {
        if (!authenticate(request, config)) {
          return Response.redirect(`${new URL(request.url).origin}/`, 302);
        }
      }
    }

    if (pathname === '/config') {
      const safeConfig = { maxSizeMB: config.maxSizeMB };
      return new Response(JSON.stringify(safeConfig), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const routes = {
      '/': () => handleAuthRequest(request, config),
      '/login': () => handleLoginRequest(request, config),
      '/upload': () => handleUploadRequest(request, config),
      '/admin': () => handleAdminRequest(request, config),
      '/delete': () => handleDeleteRequest(request, config),
      '/search': () => handleSearchRequest(request, config),
      '/bing': handleBingImagesRequest,
    };
    const handler = routes[pathname];
    if (handler) return await handler();

    // 处理文件访问请求
    return await handleFileRequest(request, config);
  },
};

// 处理身份认证
function authenticate(request, config) {
  // 检查 API Token (固定密钥认证)
  const authHeader = request.headers.get('Authorization');
  if (config.apiToken && authHeader) {
    // 提取 Token 值，支持 Bearer 格式或直接 Token
    const tokenValue = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
    if (tokenValue === config.apiToken) return true;
  }

  // 检查 Cookie (会话认证，仅在 API Token 认证失败时检查)
  const cookies = request.headers.get('Cookie') || '';
  const authToken = cookies.match(/auth_token=([^;]+)/); // 获取cookie中的auth_token
  if (authToken) {
    try {
      const tokenData = JSON.parse(atob(authToken[1]));
      const now = Date.now();
      if (now > tokenData.expiration) return false; // 检查token是否过期
      return tokenData.username === config.username; // 如果token有效，返回用户名是否匹配
    } catch (error) {
      console.error('[error] Authentication token parsing failed:', error);
      return false;
    }
  }
  return false; // 两种认证方式都失败
}

// 处理路由
async function handleAuthRequest(request, config) {
  if (config.enableAuth) {
    const isAuthenticated = authenticate(request, config);
    if (!isAuthenticated) return handleLoginRequest(request, config); // 认证失败，跳转到登录页面
    return handleUploadRequest(request, config); // 认证通过，跳转到上传页面
  }
  return handleUploadRequest(request, config); // 如果没有启用认证，直接跳转到上传页面
}

// 处理登录
async function handleLoginRequest(request, config) {
  if (request.method === 'POST') {
    const { username, password } = await request.json();

    if (username === config.username && password === config.password) {
      // 登录成功，设置 cookie 有效期为 config.cookie 天
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + config.cookie);
      const expirationTimestamp = expirationDate.getTime();
      const tokenData = JSON.stringify({
        username: config.username,
        expiration: expirationTimestamp,
      }); // 创建token数据，包含用户名和过期时间

      const token = btoa(tokenData);
      const cookie = `auth_token=${token}; Path=/; HttpOnly; Secure; Expires=${expirationDate.toUTCString()}`;
      return new Response('登录成功', {
        status: 200,
        headers: {
          'Set-Cookie': cookie,
          'Content-Type': 'text/plain',
        },
      });
    }
    return new Response('身份认证失败', { status: 401 });
  }
  const html = generateLoginPage();
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

// 支持预览的文件类型
function getPreviewHtml(url) {
  const ext = (url.split('.').pop() || '').toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'icon'].includes(ext);
  const isVideo = ['mp4', 'webm'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg'].includes(ext);

  if (isImage) {
    return `<img src="${url}" alt="预览">`;
  } else if (isVideo) {
    return `<video src="${url}" controls></video>`;
  } else if (isAudio) {
    return `<audio src="${url}" controls></audio>`;
  } else {
    return `<div style="font-size: 48px">📄</div>`;
  }
}

// 调用 TG getFile API 获取文件路径，并构造完整的下载 URL
async function getTelegramFileUrl(fileId, config) {
  try {
    const tgResponse = await fetch(`https://api.telegram.org/bot${config.tgBotToken}/getFile?file_id=${fileId}`);
    if (!tgResponse.ok) return null;
    const tgData = await tgResponse.json();
    const filePath = tgData.result?.file_path;
    if (!filePath) return null;
    // 构造完整的 Telegram 下载 URL
    return `https://api.telegram.org/file/bot${config.tgBotToken}/${filePath}`;
  } catch (error) {
    console.error('[error] Fetching Telegram file URL failed:', error);
    return null;
  }
}

// 构造 Cloudflare Image Resizing URL
function buildImageResizingUrl(fileUrl, config, options) {
  const resizingOptions = options || 'format=webp,quality=80,fit=contain';
  return `https://${config.domain}/cdn-cgi/image/${resizingOptions}/${encodeURIComponent(fileUrl)}`;
}

// 处理文件上传
async function handleUploadRequest(request, config) {
  if (request.method === 'GET') {
    const html = generateUploadPage();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) throw new Error('未找到文件');
    if (file.size > config.maxSizeMB * 1024 * 1024) throw new Error(`文件超过${config.maxSizeMB}MB限制`);

    const ext = (file.name.split('.').pop() || '').toLowerCase(); //获取文件扩展名
    const [mainType] = file.type.split('/'); // 获取文件主类型
    const typeMap = {
      image: { method: 'sendPhoto', field: 'photo' },
      video: { method: 'sendVideo', field: 'video' },
      audio: { method: 'sendAudio', field: 'audio' },
    }; // 定义类型映射
    let { method = 'sendDocument', field = 'document' } = typeMap[mainType] || {};
    if (['application', 'text'].includes(mainType)) {
      method = 'sendDocument';
      field = 'document';
    }

    const tgFormData = new FormData();
    tgFormData.append('chat_id', config.tgChatId);
    tgFormData.append(field, file, file.name);
    const tgResponse = await fetch(`https://api.telegram.org/bot${config.tgBotToken}/${method}`, { method: 'POST', body: tgFormData });
    if (!tgResponse.ok) throw new Error('Telegram参数配置错误');

    const tgData = await tgResponse.json();
    const result = tgData.result;
    const messageId = result?.message_id;
    const fileId = result?.document?.file_id || result?.video?.file_id || result?.audio?.file_id || (result?.photo && result.photo[result.photo.length - 1]?.file_id);
    if (!fileId) throw new Error('未获取到文件ID');
    if (!messageId) throw new Error('未获取到tg消息ID');

    const time = Date.now();
    const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const originalUrl = `https://${config.domain}/${time}.${ext}`;
    const isConvertibleImage = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type);
    
    let finalUrl = originalUrl;
    let webpUrl = null;
    let webpFileName = null;
    let webpFileSize = 0;

    // 仅在开启 WebP 且是可转换图片时，才生成 webp相关字段
    if (config.webpEnabled && isConvertibleImage) {
      webpUrl = `https://${config.domain}/${time}.webp`;
      webpFileName = file.name.replace(/\.[^/.]+$/, '.webp');
      finalUrl = webpUrl;
      const fileUrl = await getTelegramFileUrl(fileId, config);
      if (fileUrl) {
        const imageResizingUrl = buildImageResizingUrl(fileUrl, config);
        const headResponse = await fetch(imageResizingUrl, { method: 'HEAD' });
        const contentLength = headResponse.headers.get('Content-Length');
        if (contentLength) webpFileSize = parseInt(contentLength, 10);
      }
    }

    await config.database
      .prepare(
        `
      INSERT INTO files (url, webp_url, fileId, message_id, created_at, file_name, webp_file_name, file_size, webp_file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .bind(originalUrl, webpUrl, fileId, messageId, timestamp, file.name, webpFileName, file.size, webpFileSize, file.type)
      .run();

    return new Response(JSON.stringify({ status: 1, msg: '✔ 上传成功', url: finalUrl }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    let statusCode = 500; // 默认500
    if (error.message.includes(`文件超过${config.maxSizeMB}MB限制`)) {
      statusCode = 400; // 客户端错误：文件大小超限
    } else if (error.message.includes('Telegram参数配置错误')) {
      statusCode = 502; // 网关错误：与Telegram通信失败
    } else if (error.message.includes('未获取到文件ID') || error.message.includes('未获取到tg消息ID')) {
      statusCode = 500; // 服务器内部错误：Telegram返回数据异常
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      statusCode = 504; // 网络超时或断网
    }
    console.error(`[Error] ${error.message}`, error);
    return new Response(JSON.stringify({ status: 0, msg: '✘ 上传失败', error: error.message }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
  }
}

// 处理文件管理和预览
async function handleAdminRequest(request, config) {
  try {
    const files = await config.database
      .prepare(
        `SELECT url, webp_url, fileId, message_id, created_at, file_name, file_size, webp_file_size, mime_type
        FROM files
        ORDER BY created_at DESC`
      )
      .all();

    const fileList = files.results || [];
    const fileCards = fileList
      .map((file) => {
        let displayUrl = file.url;
        let displayFileName = file.file_name;
        let fileSizeBytes = file.file_size || 0;
        
        const createdAt = new Date(file.created_at).toISOString().replace('T', ' ').split('.')[0];
        const isWebpMode = config.webpEnabled && file.webp_url;
        
        if (isWebpMode) {
          displayUrl = file.webp_url;
          displayFileName = file.webp_file_name;
          fileSizeBytes = file.webp_file_size;
        }
        const displayFileSize = formatSize(fileSizeBytes);

        return `
        <div class="file-card" data-url="${file.url}">
          <div class="file-preview">
            ${getPreviewHtml(displayUrl)}
          </div>
          <div class="file-info">
            <div>${displayFileName}</div>
            <div>${displayFileSize}</div>
            <div>${createdAt}</div>
          </div>
          <div class="file-actions">
            <button class="btn btn-copy" onclick="showQRCode('${displayUrl}')">分享</button>
            <a class="btn btn-down" href="${displayUrl}" download="${displayFileName}" target="_blank">下载</a>
            <button class="btn btn-delete" onclick="deleteFile('${file.url}')">删除</button>
          </div>
        </div>
      `;
      })
      .join('');

    // 二维码分享元素
    const qrModal = `
    <div id="qrModal" class="qr-modal">
      <div class="qr-content">
        <div id="qrcode"></div>
        <div class="qr-buttons">
          <button class="qr-copy" onclick="handleCopyUrl()">复制链接</button>
          <button class="qr-close" onclick="closeQRModal()">关闭</button>
        </div>
      </div>
    </div>
  `;

    const html = generateAdminPage(fileCards, qrModal);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  } catch (error) {
    console.error('[Error]:', error);
    return new Response(`服务器内部错误: ${error.message}`, { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}

// 处理文件搜索
async function handleSearchRequest(request, config) {
  try {
    const { query } = await request.json();
    const searchPattern = `%${query}%`;
    const files = await config.database
      .prepare(
        `SELECT url, webp_url, fileId, message_id, created_at, file_name, webp_file_name, file_size, webp_file_size, mime_type
        FROM files 
        WHERE file_name LIKE ? ESCAPE '!'
        OR webp_file_name LIKE ? ESCAPE '!'
        COLLATE NOCASE
        ORDER BY created_at DESC`
      )
      .bind(searchPattern)
      .all();

    return new Response(JSON.stringify({ files: files.results || [] }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[error] Search request failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// 获取文件并缓存
async function handleFileRequest(request, config) {
  const url = request.url;
  const cache = caches.default;
  const cacheKey = new Request(url);
  const urlObj = new URL(url);
  const isWebpRequest = urlObj.pathname.toLowerCase().endsWith('.webp');
  const lookupColumn = config.webpEnabled && isWebpRequest ? 'webp_url' : 'url';

  try {
    // 尝试从缓存中获取
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;

    // 从数据库查询文件
    const file = await config.database
      .prepare(
        `SELECT url, webp_url, fileId, message_id, file_name, webp_file_name, mime_type
         FROM files WHERE ${lookupColumn} = ?`
      )
      .bind(url)
      .first();

    if (!file) {
      return new Response('文件不存在', {
        status: 404,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      });
    }

    // 重定向条件：WebP 启用 AND 请求的是原始 URL, AND 数据库中有 webp_url 记录
    if (config.webpEnabled && !isWebpRequest && file.webp_url) {
      return Response.redirect(file.webp_url, 302); // 302 临时重定向
    }

    // 获取 Telegram 文件
    const fileUrl = await getTelegramFileUrl(file.fileId, config);
    if (!fileUrl) {
      return new Response('文件路径无效或获取失败', {
        status: 404,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }
    
    let fileResponse;
    let contentType = file.mime_type;
    const isConvertibleImage = ['image/jpeg', 'image/png', 'image/gif'].includes(file.mime_type);
    const shouldConvert = config.webpEnabled && isWebpRequest && isConvertibleImage;

    if (shouldConvert) {
      const imageResizingUrl = buildImageResizingUrl(fileUrl, config);
      fileResponse = await fetch(imageResizingUrl);
      if (fileResponse.ok) contentType = fileResponse.headers.get('Content-Type') || 'image/webp';
    }
    if (!fileResponse || !fileResponse.ok) fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return new Response('下载文件失败', {
        status: 500,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      });
    }

    // 创建响应并缓存 (使用新的 contentType)
    let finalFileName = file.file_name || '';
    if (isWebpRequest) finalFileName = finalFileName.replace(/\.[^/.]+$/, '.webp');
    const response = new Response(fileResponse.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(finalFileName)}`,
      },
    });

    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    console.error('[error] File request failed:', error);
    return new Response('服务器内部错误', {
      status: 500,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    });
  }
}

// 处理文件删除
async function handleDeleteRequest(request, config) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: '无效的URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const file = await config.database.prepare('SELECT fileId, message_id FROM files WHERE url = ?').bind(url).first();
    if (!file) {
      return new Response(JSON.stringify({ error: '文件不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let deleteError = null;

    try {
      const deleteResponse = await fetch(`https://api.telegram.org/bot${config.tgBotToken}/deleteMessage?chat_id=${config.tgChatId}&message_id=${file.message_id}`);
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        console.error('[error] Telegram message delete failed:', errorData);
        throw new Error(`Telegram 消息删除失败: ${errorData.description}`);
      }
    } catch (error) {
      deleteError = error.message;
    }

    // 删除数据库表数据，即使Telegram删除失败也会删除数据库记录
    await config.database.prepare('DELETE FROM files WHERE url = ?').bind(url).run();
    return new Response(
      JSON.stringify({
        success: true,
        message: deleteError ? `文件已从数据库删除，但Telegram消息删除失败: ${deleteError}` : '文件删除成功',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[error] File delete request failed:', error);
    return new Response(
      JSON.stringify({
        error: error.message.includes('message to delete not found') ? '文件已从频道移除' : error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleBingImagesRequest() {
  const cache = caches.default;
  const cacheKey = new Request('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5');

  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;

  try {
    const res = await fetch(cacheKey);
    if (!res.ok) {
      return new Response('请求 Bing API 失败', { status: res.status });
    }

    const bingData = await res.json();
    const images = bingData.images.map((image) => ({ url: `https://cn.bing.com${image.url}` }));
    const returnData = { status: true, message: '操作成功', data: images };

    const response = new Response(JSON.stringify(returnData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=21600',
        'Access-Control-Allow-Origin': '*',
      },
    });

    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    console.error('[error] Bing images request failed:', error);
    return new Response('请求 Bing API 失败', { status: 500 });
  }
}

// 文件大小计算函数
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function headLinks() {
  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Telegram文件存储与分享平台">
    <link rel="shortcut icon" href="https://pan.811520.xyz/2025-02/1739241502-tgfile-favicon.ico" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  `;
}

// HTML版权页
function copyright() {
  return `
    <p>
      <span><i class="fas fa-copyright"></i> 2025 Copyright by Yutian81</span><span>|</span>
      <a href="https://github.com/yutian81/CF-tgfile" target="_blank">
      <i class="fab fa-github"></i> GitHub Repo</a><span>|</span>
      <a href="https://blog.811520.xyz/" target="_blank">
      <i class="fas fa-blog"></i> QingYun Blog</a>
    </p>
  `;
}

// 登录页面生成函数 /login
function generateLoginPage() {
  return `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
  ${headLinks()}
  <title>登录</title>
    <style>
      body {
        position: relative;
        min-height: 100vh;
        margin: 0;
        background: #f5f5f5;
        font-family: Arial, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        box-sizing: border-box;
      }
      .login-container {
        background: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        width: 100%;
        max-width: 400px;
        z-index: 1;
      }
      .form-group {
        margin-bottom: 1rem;
      }
      input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
        box-sizing: border-box;
        background: rgba(255, 255, 255, 0.7);
        color: #333;
      }
      button {
        width: 100%;
        padding: 0.75rem;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        cursor: pointer;
        margin-bottom: 10px;
      }
      button:hover {
        background: #0056b3;
      }
      .error {
        color: #dc3545;
        margin-top: 1rem;
        display: none;
      }

      /* 版权页脚 */
      footer {
        position: absolute;
        margin-bottom: 10px;
        bottom: 0;
        left: 0;
        width: 100%;
        text-align: center;
        font-size: 0.85rem;
        padding: 10px 0;
        background: transparent;
      }
      footer p {
        color: #fff;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin: 0;
      }
      footer a {
        color: #fff;
        text-decoration: none;
        transition: color 0.3s ease;
      }
      footer a:hover {
        color: #007BFF !important;
      }
    </style>
  </head>
  <body>
    <div class="login-container">
      <h2 style="text-align: center; margin-bottom: 2rem;">登录</h2>
      <form id="loginForm">
        <div class="form-group">
          <input type="text" id="username" placeholder="用户名" required>
        </div>
        <div class="form-group">
          <input type="password" id="password" placeholder="密码" required>
        </div>
        <button type="submit">登录</button>
        <div id="error" class="error">用户名或密码错误</div>
      </form>
    </div>
    <footer>
      ${copyright()}
    </footer>
    <script>
      // 添加背景图相关函数
      async function setBingBackground() {
        try {
          const response = await fetch('/bing', { cache: 'no-store' });  // 禁用缓存
          const data = await response.json();
          if (data.status && data.data && data.data.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.data.length);
            document.body.style.backgroundImage = \`url(\${data.data[randomIndex].url})\`;
          }
        } catch (error) {
          console.error('获取背景图失败:', error);
        }
      }
      // 页面加载时设置背景图
      setBingBackground(); 
      // 每小时更新一次背景图
      setInterval(setBingBackground, 3600000);

      document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorEl = document.getElementById('error');
        errorEl.style.display = 'none'; // 隐藏旧错误
    
        try {
          const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
    
          if (response.ok) {
            window.location.href = '/upload';
          } else {
            errorEl.style.display = 'block';
            errorEl.textContent = "用户名或密码错误";
          }
        } catch (err) {
          console.error('登录请求失败:', err);
          errorEl.style.display = 'block';
          errorEl.textContent = "登录失败，请稍后再试";
        }
      });
    </script>
  </body>
  </html>`;
}

// 生成文件上传页面 /upload
function generateUploadPage() {
  return `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
  ${headLinks()}
  <title>文件上传</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        transition: background-image 1s ease-in-out;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: #f5f5f5;
        margin: 0;
      }
      .container {
        width: 800px;
        background: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        padding: 10px 40px 20px 40px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin: 20px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .upload-area {
        border: 2px dashed #666;
        padding: 40px;
        text-align: center;
        margin: 0 auto;
        border-radius: 8px;
        transition: all 0.3s;
        box-sizing: border-box;
      }
      .upload-area p {
        line-height: 2;
      }
      .upload-area.dragover {
        border-color: #007bff;
        background: #f8f9fa;
      }
      .preview-area {
        margin-top: 20px;
      }
      .preview-item {
        display: flex;
        align-items: center;
        padding: 10px;
        border: 1px solid #ddd;
        margin-bottom: 10px;
        border-radius: 4px;
      }
      .preview-item img {
        max-width: 100px;
        max-height: 100px;
        margin-right: 10px;
      }
      .preview-item .info {
        flex-grow: 1;
      }
      .url-area {
        margin-top: 10px;
        width: calc(100% - 20px);
        box-sizing: border-box;
      }
      .url-area textarea {
        width: 100%;
        min-height: 100px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.5);
        color: #333;       
      }
      .admin-link {
        background: #007BFF;
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        text-decoration: none;
        color: #fff;     
        display: inline-block;
        margin-left: auto;
      }
      .admin-link:hover {
        text-decoration: underline;
      }
      .button-container {
        display: flex;
        align-items: center;
        margin: 15px 0;
        width: 100%;
      }
      .button-container button {
        margin-right: 10px;
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        background: #007bff;
        color: white;
        cursor: pointer;
      }
      .button-container button:hover {
        background: #0056b3;
      }
      .progress-bar {
        height: 20px;
        background: #eee;
        border-radius: 10px;
        margin: 8px 0;
        overflow: hidden;
        position: relative;
      }
      .progress-track {
        height: 100%;
        background: #007bff;
        transition: width 0.3s ease;
        width: 0;
      }
      .progress-text {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 12px;
      }
      .success .progress-track {
        background: #28a745;
      }
      .error .progress-track {
        background: #dc3545;
      }

      /* 版权页脚 */
      footer {
        font-size: 0.85rem;
        width: 100%;
        text-align: center;
        margin: 0;
      }
      footer p {
        color: #7F7F7E;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin: 0;
      }
      /* 手机屏幕下居中 */
      @media (max-width: 768px) {
        footer p {
          justify-content: center;
        }
      }
      footer a {
        color: #7F7F7E;
        text-decoration: none;
        transition: color 0.3s ease;
      }
      footer a:hover {
        color: #007BFF !important;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>文件上传</h1>
        <a href="/admin" class="admin-link">文件管理</a>
      </div>
      <div class="upload-area" id="uploadArea">
        <p>点击选择 或 拖拽文件到此处<br>支持 Ctrl+V 粘贴上传</p>
        <input type="file" id="fileInput" multiple style="display: none">
      </div>
      <div class="preview-area" id="previewArea"></div>
      <div class="url-area">
        <textarea id="urlArea" readonly placeholder="上传完成后的链接将显示在这里"></textarea>
      </div>
      <div class="button-container">
        <button onclick="copyUrls('url')">复制URL</button>
        <button onclick="copyUrls('markdown')">复制Markdown</button>
        <button onclick="copyUrls('html')">复制HTML</button>
      </div>
      <footer>
        ${copyright()}
      </footer>
    </div>

    <script>
      // 添加背景图相关函数
      async function setBingBackground() {
        try {
          const response = await fetch('/bing', { cache: 'no-store' });  // 禁用缓存
          const data = await response.json();
          if (data.status && data.data && data.data.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.data.length);
            document.body.style.backgroundImage = \`url(\${data.data[randomIndex].url})\`;
          }
        } catch (error) {
          console.error('获取背景图失败:', error);
        }
      }
      // 页面加载时设置背景图
      setBingBackground(); 
      // 每小时更新一次背景图
      setInterval(setBingBackground, 3600000);

      const uploadArea = document.getElementById('uploadArea');
      const fileInput = document.getElementById('fileInput');
      const previewArea = document.getElementById('previewArea');
      const urlArea = document.getElementById('urlArea');
      let uploadedUrls = [];

      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
      });

      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
      });

      function highlight(e) {
        uploadArea.classList.add('dragover');
      }

      function unhighlight(e) {
        uploadArea.classList.remove('dragover');
      }

      uploadArea.addEventListener('drop', handleDrop, false);
      uploadArea.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFiles);

      function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files } });
      }

      document.addEventListener('paste', async (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            await uploadFile(file);
          }
        }
      });

      async function handleFiles(e) {
        const response = await fetch('/config');
        if (!response.ok) {
          throw new Error('Failed to fetch config');
        }      
        const config = await response.json();
        const files = Array.from(e.target.files);
        for (let file of files) {
          // 直接在上传前进行大小判断
          if (file.size > config.maxSizeMB * 1024 * 1024) {
            alert(\`文件超过\${config.maxSizeMB}MB限制\`);
            return; // 如果文件过大则直接返回，不上传
          }
          await uploadFile(file); // 继续上传
        }
      }

      async function uploadFile(file) {
        const preview = createPreview(file);
        previewArea.appendChild(preview);

        const xhr = new XMLHttpRequest();
        const progressTrack = preview.querySelector('.progress-track');
        const progressText = preview.querySelector('.progress-text');

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressTrack.style.width = \`\${percent}%\`;
            progressText.textContent = \`\${percent}%\`;
          }
        });

        xhr.addEventListener('load', () => {
          try {
            const data = JSON.parse(xhr.responseText);
            const progressText = preview.querySelector('.progress-text');          
            if (xhr.status >= 200 && xhr.status < 300 && data.status === 1) {
              progressText.textContent = data.msg;
              uploadedUrls.push(data.url);
              updateUrlArea();
              preview.classList.add('success');
            } else {
              const errorMsg = [data.msg, data.error || '未知错误'].filter(Boolean).join(' | ');
              progressText.textContent = errorMsg;
              preview.classList.add('error');
            }
          } catch (e) {
            preview.querySelector('.progress-text').textContent = '✗ 响应解析失败';
            preview.classList.add('error');
          }
        });

        const formData = new FormData();
        formData.append('file', file);
        xhr.open('POST', '/upload');
        xhr.send(formData);
      }

      function createPreview(file) {
        const div = document.createElement('div');
        div.className = 'preview-item';
        
        if (file.type.startsWith('image/')) {
          const img = document.createElement('img');
          img.src = URL.createObjectURL(file);
          div.appendChild(img);
        }

        const info = document.createElement('div');
        info.className = 'info';
        info.innerHTML = \`
          <div>\${file.name}</div>
          <div>\${formatSize(file.size)}</div>
          <div class="progress-bar">
            <div class="progress-track"></div>
            <span class="progress-text">0%</span>
          </div>
        \`;
        div.appendChild(info);

        return div;
      }

      function formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return \`\${size.toFixed(2)} \${units[unitIndex]}\`;
      }

      function updateUrlArea() {
        urlArea.value = uploadedUrls.join('\\n');
      }

      function copyUrls(format) {
        let text = '';
        switch (format) {
          case 'url':
            text = uploadedUrls.join('\\n');
            break;
          case 'markdown':
            text = uploadedUrls.map(url => \`![](\${url})\`).join('\\n');
            break;
          case 'html':
            text = uploadedUrls.map(url => \`<img src="\${url}" />\`).join('\\n');
            break;
        }
        navigator.clipboard.writeText(text);
        alert('已复制到剪贴板');
      }
    </script>
  </body>
  </html>`;
}

// 生成文件管理页面 /admin
function generateAdminPage(fileCards, qrModal) {
  return `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
  ${headLinks()}
  <title>文件管理</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background: #f5f5f5;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
      }

      .header {
        background: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap; /* 移动端支持换行 */
        align-items: center;
      }
      
      .header h2 {
        margin: 0;
        flex: 1;
        min-width: 0;
      }
      
      .header .backup {
        background: #007BFF;
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        margin: 0 20px;
        text-decoration: none;
        color: #fff;
        text-decoration: none;
      }
      
      .header .backup:hover {
        text-decoration: underline;
      }
      
      .header .search {
        flex: 1 1 100%;
        max-width: 100%;
        margin-top: 10px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: rgba(255,255,255,0.5);
        box-sizing: border-box;
      }
      
      /* 桌面端：不换行，搜索框固定宽度 */
      @media (min-width: 768px) {
        .header {
          flex-wrap: nowrap;
        }
        .header .search {
          flex: unset;
          width: 300px;
          margin-top: 0;
        }
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;
      }
      .file-card {
        background: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        overflow: hidden;
        position: relative;
      }
      .file-preview {
        height: 150px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .file-preview img, .file-preview video {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .file-info {
        padding: 10px;
        font-size: 14px;
      }
      .file-actions {
        padding: 10px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 12px;
      }
      .file-actions .btn {
        font-size: inherit;
      }
      .btn {
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .btn-delete {
        background: #dc3545;
        color: white;
      }
      .btn-copy {
        background: #007bff;
        color: white;
      }
      .btn-down {
        background: #007bff;
        color: white;
        text-decoration: none;
      }
      .qr-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      .qr-content {
        background: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      }
      #qrcode {
        margin: 5px 0;
      }
      .qr-buttons {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-top: 15px;
      }
      .qr-copy, .qr-close {
        padding: 8px 20px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      }

      /* 分页按钮样式 */
      #pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
    
      #pagination .btn-page {
        padding: 6px 14px;
        border-radius: 8px;
        border: none;
        background: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #0A0A0A;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 40px;
        text-align: center;
        font-size: 14px;
        box-shadow: none;
        margin: 20px 0;
      }

      #pagination .btn-page:hover {
        background-color: #007bff;
        color: #fff;
      }
    
      #pagination .btn-page.active {
        background-color: #007bff;
        color: #fff;
        cursor: default;
      }
    
      #pagination .btn-page:disabled {
        background-color: #f0f0f0;
        color: #aaa;
        cursor: not-allowed;
        border-color: #ccc;
      }
    
      #pagination span.page-info {
        padding: 6px 10px;
        font-size: 14px;
        color: #333;
      }

      /* 版权页脚 */
      footer {
        font-size: 0.85rem;
        width: 100%;
        text-align: center;
      }
      footer p {
        color: #7F7F7E;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin: 0;
      }
      footer a {
        color: #7F7F7E;
        text-decoration: none;
        transition: color 0.3s ease;
      }
      footer a:hover {
        color: #007BFF !important;
      }   
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>文件管理</h2>
        <a href="/upload" class="backup">返回</a>
        <input type="text" class="search" placeholder="搜索文件..." id="searchInput">
      </div>
      <div class="grid" id="fileGrid">
        ${fileCards}
      </div>
      ${qrModal}
    </div>
    <footer>
      ${copyright()}
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"></script>
    <!-- 引入 JSZip 库 -->
    <!-- <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script> -->
    <script>
      // -------------------- 基本变量 --------------------
      const itemsPerPage = 15; 
      let currentPage = 1;
    
      const fileGrid = document.getElementById('fileGrid');
      const searchInput = document.getElementById('searchInput');
      let fileCards = Array.from(fileGrid.children);
    
      // 创建分页容器
      const paginationContainer = document.createElement('div');
      paginationContainer.id = 'pagination';
      fileGrid.parentNode.insertBefore(paginationContainer, fileGrid.nextSibling);
    
      // -------------------- 背景图 --------------------
      async function setBingBackground() {
        try {
          const response = await fetch('/bing', { cache: 'no-store' });
          const data = await response.json();
          if (data.status && data.data && data.data.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.data.length);
            document.body.style.backgroundImage = \`url(\${data.data[randomIndex].url})\`;
          }
        } catch (error) {
          console.error('获取背景图失败:', error);
        }
      }
      setBingBackground();
      setInterval(setBingBackground, 3600000);
    
      // -------------------- 分页逻辑 --------------------
      function getFilteredCards() {
        const term = searchInput.value.toLowerCase();
        return fileCards.filter(card => {
          const name = card.querySelector('.file-info div:first-child').textContent.toLowerCase();
          return name.includes(term);
        });
      }
    
      function renderPage(page) {
        const filteredCards = getFilteredCards();
        const totalPages = Math.ceil(filteredCards.length / itemsPerPage) || 1;
        if (page > totalPages) currentPage = totalPages;
        if (page < 1) currentPage = 1;
    
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
    
        fileCards.forEach(c => c.style.display = 'none');
        filteredCards.slice(start, end).forEach(c => c.style.display = '');
    
        renderPagination(totalPages);
      }
    
      function renderPagination(totalPages) {
        paginationContainer.innerHTML = '';
    
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '上一页';
        prevBtn.className = 'btn-page';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => { currentPage--; renderPage(currentPage); };
        paginationContainer.appendChild(prevBtn);
    
        for (let i = 1; i <= totalPages; i++) {
          const btn = document.createElement('button');
          btn.textContent = i;
          btn.className = 'btn-page' + (i === currentPage ? ' active' : '');
          btn.onclick = () => { currentPage = i; renderPage(currentPage); };
          paginationContainer.appendChild(btn);
        }
    
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '下一页';
        nextBtn.className = 'btn-page';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => { currentPage++; renderPage(currentPage); };
        paginationContainer.appendChild(nextBtn);
      }
    
      searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderPage(currentPage);
      });
    
      // -------------------- 二维码功能 --------------------
      let currentShareUrl = '';
      function showQRCode(url) {
        currentShareUrl = url;
        const modal = document.getElementById('qrModal');
        const qrcodeDiv = document.getElementById('qrcode');
        const copyBtn = document.querySelector('.qr-copy');
        copyBtn.textContent = '复制链接';
        copyBtn.disabled = false;
        qrcodeDiv.innerHTML = '';
        new QRCode(qrcodeDiv, { text: url, width: 200, height: 200, colorDark: "#000", colorLight: "#fff", correctLevel: QRCode.CorrectLevel.H });
        modal.style.display = 'flex';
      }
    
      function handleCopyUrl() {
        navigator.clipboard.writeText(currentShareUrl).then(() => {
          const copyBtn = document.querySelector('.qr-copy');
          copyBtn.textContent = '✔ 已复制';
          copyBtn.disabled = true;
          setTimeout(() => { copyBtn.textContent = '复制链接'; copyBtn.disabled = false; }, 5000);
        }).catch(() => alert('复制失败，请手动复制'));
      }
    
      function closeQRModal() {
        document.getElementById('qrModal').style.display = 'none';
      }
    
      window.onclick = (event) => {
        const modal = document.getElementById('qrModal');
        if (event.target === modal) modal.style.display = 'none';
      }
    
      // -------------------- 删除功能 --------------------
      async function deleteFile(url) {
        if (!confirm('确定要删除这个文件吗？')) return;
        try {
          const response = await fetch('/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '删除失败');
          }
          const card = document.querySelector(\`[data-url="\${url}"]\`);
          if (card) card.remove();
          fileCards = Array.from(fileGrid.children); // 更新缓存
          renderPage(currentPage);
          alert('文件删除成功');
        } catch (err) {
          alert('文件删除失败: ' + err.message);
        }
      }
    
      // -------------------- 初始渲染 --------------------
      renderPage(currentPage);
    </script>
  </body>
  </html>`;
}
