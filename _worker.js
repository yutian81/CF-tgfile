// 数据库初始化函数
async function initDatabase(config) {
  await config.database.prepare(`
    CREATE TABLE IF NOT EXISTS files (
      url TEXT PRIMARY KEY,
      fileId TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT
    )
  `).run();
}

export default {
  async fetch(request, env) {
    // 环境变量配置
    const config = {
      domain: env.DOMAIN,
      database: env.DATABASE,
      username: env.USERNAME,
      password: env.PASSWORD,
      enableAuth: env.ENABLE_AUTH === 'true',
      tgBotToken: env.TG_BOT_TOKEN,
      tgChatId: env.TG_CHAT_ID,
      maxSizeMB: env.MAX_SIZE_MB ? parseInt(env.MAX_SIZE_MB, 10) : 20
    };

    // 初始化数据库
    await initDatabase(config);
    // 路由处理
    const { pathname } = new URL(request.url);
    const routes = {
      '/': () => handleAuthRequest(request, config),
      '/upload': () => handleUploadRequest(request, config),
      '/admin': () => handleAdminRequest(request, config),
      '/delete': () => handleDeleteRequest(request, config),
      '/search': () => handleSearchRequest(request, config),
      '/bing': () => handleBingImagesRequest(request, config)
    };
    const handler = routes[pathname];
    if (handler) {
      return await handler();
    }

    // 处理文件访问请求
    return await handleFileRequest(request, config);
  }
};

// 认证相关函数
function authenticate(request, config) {
  const cookies = request.headers.get("Cookie") || "";
  if (cookies.includes("auth_token=valid")) return true;
  
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith("Basic ")) return false;
  
  try {
    const [username, password] = atob(authHeader.split(' ')[1]).split(':');
    return username === config.username && password === config.password;
  } catch {
    return false;
  }
}

// 请求登录页面
async function handleAuthRequest(request, config) {
    if (request.method === 'POST') {
    const { username, password } = await request.json();
    if (username === config.username && password === config.password) {
      return new Response("登录成功", {
        status: 200,
        headers: {
          "Set-Cookie": "auth_token=valid; Path=/; HttpOnly; Secure",
          "Content-Type": "text/plain"
        }
      });
    }
    return new Response("认证失败", { status: 401 });
  }
  return generateLoginPage();
}

// 登录页面生成函数 /login
function generateLoginPage() {
  const html = `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录</title>
    <style>
      body {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: #f5f5f5;
        font-family: Arial, sans-serif;
      }
      .login-container {
        background: rgba(255, 255, 255, 0.7);
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        width: 100%;
        max-width: 400px;
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
    <script>
      // 添加背景图相关函数
      async function setBingBackground() {
        try {
          const response = await fetch('/bing');
          const data = await response.json();
          if (data.status && data.data.length > 0) {
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
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
          const response = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          
          if (response.ok) {
            window.location.href = '/upload';
          } else {
            document.getElementById('error').style.display = 'block';
          }
        } catch (err) {
          console.error('登录失败:', err);
          document.getElementById('error').style.display = 'block';
        }
      });
    </script>
  </body>
  </html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

// 请求并生成文件上传页面 /upload
async function handleUploadRequest(request, config) {
    if (config.enableAuth && !authenticate(request, config)) {
      return Response.redirect(`${new URL(request.url).origin}/`, 302);
    }
    if (request.method === 'GET') {
        return generateUploadPage();
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      
      if (!file) {
        throw new Error('未找到文件');
      }
  
      if (file.size > config.maxSizeMB * 1024 * 1024) {
        throw new Error(`文件大小超过${config.maxSizeMB}MB限制`);
      }
  
      const tgFormData = new FormData();
      tgFormData.append('chat_id', config.tgChatId);
      tgFormData.append('document', file);
  
      const tgResponse = await fetch(
        `https://api.telegram.org/bot${config.tgBotToken}/sendDocument`,
        { method: 'POST', body: tgFormData }
      );
  
      if (!tgResponse.ok) {
        throw new Error('Telegram上传失败');
      }
  
      const tgData = await tgResponse.json();
      const document = tgData.result?.document;
      const fileId = document?.file_id;
      
      if (!fileId) {
        throw new Error('未获取到文件ID');
      }
  
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const url = `https://${config.domain}/${timestamp}.${ext}`;
  
      await config.database.prepare(
        'INSERT INTO files (url, fileId, created_at, file_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        url,
        fileId,
        timestamp,
        file.name,
        file.size,
        file.type || getContentType(ext)
      ).run();
  
      return new Response(
        JSON.stringify({ url }),
        { headers: { 'Content-Type': 'application/json' }}
      );
  
    } catch (error) {
      console.error(`[Upload Error] ${error.message}`);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' }}
      );
    }
}

function generateUploadPage() {
    const html = `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          max-width: 800px;
          width: 100%;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(5px);
          padding: 10px 40px 20px 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
          display: inline-block;
          margin-left: auto;
          color: #007bff;
          text-decoration: none;
        }
        .admin-link:hover {
          text-decoration: underline;
        }
        .button-group {
          margin-top: 10px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
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
        .copyright {
        margin-left: auto;
        font-size: 12px;
        color: #888;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>文件上传</h1>
          <a href="/admin" class="admin-link">进入管理页面</a>
        </div>
        <div class="upload-area" id="uploadArea">
          <p>点击选择 或 拖拽文件到此处</p>
          <input type="file" id="fileInput" multiple style="display: none">
        </div>
        <div class="preview-area" id="previewArea"></div>
        <div class="url-area">
          <textarea id="urlArea" readonly placeholder="上传完成后的链接将显示在这里"></textarea>
          <div class="button-group">
            <div class="button-container">
              <button onclick="copyUrls('url')">复制URL</button>
              <button onclick="copyUrls('markdown')">复制Markdown</button>
              <button onclick="copyUrls('html')">复制HTML</button>
            </div>
            <div class="copyright">
              <span>© 2025 Copyright by
              <a href="https://github.com/yutian81/CF-tgfile" target="_blank" style="text-decoration: none; color: inherit;">yutian81's GitHub</a> | 
              <a href="https://blog.811520.xyz/" target="_blank" style="text-decoration: none; color: inherit;">青云志</a>
              </span>
            </div>
          </div>
        </div>
      </div>
  
      <script>
        // 添加背景图相关函数
        async function setBingBackground() {
          try {
            const response = await fetch('/bing');
            const data = await response.json();
            if (data.status && data.data.length > 0) {
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
          const files = Array.from(e.target.files);
          for (let file of files) {
            await uploadFile(file);
          }
        }
  
        async function uploadFile(file) {
          const preview = createPreview(file);
          previewArea.appendChild(preview);
  
          const formData = new FormData();
          formData.append('file', file);
  
          try {
            const response = await fetch('/upload', {
              method: 'POST',
              body: formData
            });
  
            if (!response.ok) throw new Error('上传失败');
            
            const data = await response.json();
            uploadedUrls.push(data.url);
            updateUrlArea();
            preview.querySelector('.status').textContent = '上传成功';
            preview.classList.add('success');
          } catch (error) {
            preview.querySelector('.status').textContent = '上传失败';
            preview.classList.add('error');
          }
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
            <div class="status">上传中...</div>
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
  
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
}

// 请求并生成文件管理页面 /admin
async function handleAdminRequest(request, config) {
  if (!authenticate(request, config)) {
    return Response.redirect(`${new URL(request.url).origin}/`, 302);
  }

  const files = await config.database.prepare(
    'SELECT url, fileId, created_at, file_name, file_size FROM files ORDER BY created_at DESC'
  ).all();

  const fileList = files.results || [];

  const fileCards = fileList.map(file => {
    const fileName = file.file_name || new URL(file.url).pathname.split('/').pop();
    const fileSize = formatSize(file.file_size || 0);
    const createdAt = new Date(file.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    return `
      <div class="file-card" data-url="${file.url}">
        <div class="file-preview">
          ${getPreviewHtml(file.url)}
        </div>
        <div class="file-info">
          <div>${fileName}</div>
          <div>${fileSize}</div>
          <div>${createdAt}</div>
        </div>
        <div class="file-actions">
          <button class="btn btn-copy" onclick="copyUrl('${file.url}')">复制链接</button>
          <a class="btn btn-down" href="${file.url}" download="${fileName}">下载</a>
          <button class="btn btn-delete" onclick="deleteFile('${file.url}')">删除</button>
        </div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
        background: rgba(255, 255, 255, 0.7);
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .search {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        width: 300px;
        background: rgba(255, 255, 255, 0.5);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
      }
      .file-card {
        background: rgba(255, 255, 255, 0.7);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .file-preview {
        height: 200px;
        background: rgba(255, 255, 255, 0.5);
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
        padding: 15px;
      }
      .file-actions {
        padding: 15px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
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
      .backup {
        display: inline-block;
        margin-left: auto;
        margin-right: 40px;
        color: #007bff;
        text-decoration: none;
      }
      .backup:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>文件管理</h1>
        <a href="/upload" class="backup">返回</a>
        <input type="text" class="search" placeholder="搜索文件..." id="searchInput">
      </div>
      <div class="grid" id="fileGrid">
        ${fileCards}
      </div>
    </div>

    <script>
      // 添加背景图相关函数
      async function setBingBackground() {
        try {
          const response = await fetch('/bing');
          const data = await response.json();
          if (data.status && data.data.length > 0) {
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

      const searchInput = document.getElementById('searchInput');
      const fileGrid = document.getElementById('fileGrid');
      const fileCards = Array.from(fileGrid.children);

      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        fileCards.forEach(card => {
          const url = card.dataset.url.toLowerCase();
          card.style.display = url.includes(searchTerm) ? '' : 'none';
        });
      });

      function copyUrl(url) {
        navigator.clipboard.writeText(url);
        alert('已复制到剪贴板');
      }

      async function deleteFile(url) {
        if (!confirm('确定要删除这个文件吗？')) return;
        
        try {
          const response = await fetch('/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });

          if (!response.ok) throw new Error('删除失败');
          
          const card = document.querySelector(\`[data-url="\${url}"]\`);
          card.remove();
        } catch (error) {
          alert('删除失败: ' + error.message);
        }
      }
    </script>
  </body>
  </html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

function getPreviewHtml(url) {
  const ext = url.split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  const isVideo = ['mp4', 'webm'].includes(ext);
  
  if (isImage) {
    return `<img src="${url}" alt="预览">`;
  } else if (isVideo) {
    return `<video src="${url}" controls></video>`;
  } else {
    return `<div style="font-size: 48px">📄</div>`;
  }
}

async function handleFileRequest(request, config) {
  const url = request.url;
  const cache = caches.default;
  const cacheKey = new Request(url);

  try {
    // 尝试从缓存获取
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      console.log(`[Cache Hit] ${url}`);
      return cachedResponse;
    }

    // 从数据库查询文件
    const file = await config.database.prepare(
      'SELECT fileId, file_name, mime_type FROM files WHERE url = ?'
    ).bind(url).first();

    if (!file) {
      console.log(`[404] File not found: ${url}`);
      return new Response('文件不存在', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }

    // 获取 Telegram 文件路径
    const tgResponse = await fetch(
      `https://api.telegram.org/bot${config.tgBotToken}/getFile?file_id=${file.fileId}`
    );

    if (!tgResponse.ok) {
      console.error(`[Telegram API Error] ${await tgResponse.text()}`);
      return new Response('获取文件失败', { 
        status: 500,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }

    const tgData = await tgResponse.json();
    const filePath = tgData.result?.file_path;

    if (!filePath) {
      console.error(`[Invalid Path] No file_path in response for ${file.fileId}`);
      return new Response('文件路径无效', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }

    // 下载文件
    const fileUrl = `https://api.telegram.org/file/bot${config.tgBotToken}/${filePath}`;
    const fileResponse = await fetch(fileUrl);

    if (!fileResponse.ok) {
      console.error(`[Download Error] Failed to download from ${fileUrl}`);
      return new Response('下载文件失败', { 
        status: 500,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }

    // 使用存储的 MIME 类型或根据扩展名判断
    const contentType = file.mime_type || getContentType(url.split('.').pop().toLowerCase());

    // 创建响应并缓存
    const response = new Response(fileResponse.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.file_name || '')}`
      }
    });

    await cache.put(cacheKey, response.clone());
    console.log(`[Cache Set] ${url}`);

    return response;

  } catch (error) {
    console.error(`[Error] ${error.message} for ${url}`);
    return new Response('服务器内部错误', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    });
  }
}

async function handleDeleteRequest(request, config) {
  if (config.enableAuth && !authenticate(request, config)) {
    return Response.redirect(`${new URL(request.url).origin}/`, 302);
  }

  try {
    const { url } = await request.json();
    
    await config.database.prepare(
      'DELETE FROM files WHERE url = ?'
    ).bind(url).run();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error(`[Delete Error] ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' }}
    );
  }
}

async function handleSearchRequest(request, config) {
  if (config.enableAuth && !authenticate(request, config)) {
    return Response.redirect(`${new URL(request.url).origin}/`, 302);
  }

  try {
    const { query } = await request.json();
    const searchPattern = `%${query}%`;
    
    const files = await config.database.prepare(
      'SELECT url, fileId, created_at, file_name, file_size FROM files WHERE url LIKE ? OR file_name LIKE ? ORDER BY created_at DESC'
    ).bind(searchPattern, searchPattern).all();

    return new Response(
      JSON.stringify({ files: files.results || [] }),
      { headers: { 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error(`[Search Error] ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' }}
    );
  }
}

function getContentType(ext) {
  const types = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg', 
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    txt: 'text/plain',
    json: 'application/json',
    xml: 'application/xml',
    md: 'text/markdown',
    js: 'application/javascript',
    yml: 'application/yaml',
    py: 'text/x-python',
    sh: 'application/x-sh'
  };
  
  return types[ext] || 'application/octet-stream';
}

async function handleBingImagesRequest(request) {
  const cache = caches.default;
  const cacheKey = new Request('https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5');
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return cachedResponse;
  
  const res = await fetch(cacheKey);
  if (!res.ok) {
    return new Response('请求 Bing API 失败', { status: res.status });
  }
  
  const bingData = await res.json();
  const images = bingData.images.map(image => ({ url: `https://cn.bing.com${image.url}` }));
  const returnData = { status: true, message: "操作成功", data: images };
  
  const response = new Response(JSON.stringify(returnData), { 
    status: 200, 
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    } 
  });
  
  await cache.put(cacheKey, response.clone());
  return response;
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
