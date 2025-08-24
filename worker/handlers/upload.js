import { authenticate } from '../middleware/auth.js';
import { getContentType } from '../utils/content-type.js';
import { headlink } from '../../components/headlink.js';
import { copyright } from '../../components/copyright.js';
import { setbing } from '../../components/setbing.js';
import { uploadCSS } from '../../frontend/css/uploadCSS.js';
import { uploadJS } from '../../frontend/js/uploadJS.js';

export async function handleUpload(request, config) {
  if (config.enableAuth && !authenticate(request, config)) {
    return Response.redirect(`${new URL(request.url).origin}/`, 302);
  }
  
  if (request.method === 'GET') {
    // 使用模板字符串和组件构建完整的HTML页面
    const uploadHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  ${headlink}
  <title>文件上传</title>
  <style>${uploadCSS}</style>
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
      ${copyright}
    </footer>
  </div>
  <script>${setbing}</script>
  <script>${uploadJS}</script>
</body>
</html>`;
    return new Response(uploadHtml, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }

  // POST 请求处理逻辑保持不变
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) throw new Error('未找到文件');
    if (file.size > config.maxSizeMB * 1024 * 1024) throw new Error(`文件超过${config.maxSizeMB}MB限制`);
    
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const mimeType = getContentType(ext);
    const [mainType] = mimeType.split('/');
    
    const typeMap = {
      image: { method: 'sendPhoto', field: 'photo' },
      video: { method: 'sendVideo', field: 'video' },
      audio: { method: 'sendAudio', field: 'audio' }
    };
    
    let { method = 'sendDocument', field = 'document' } = typeMap[mainType] || {};

    if (['application', 'text'].includes(mainType)) {
      method = 'sendDocument';
      field = 'document';
    }

    const tgFormData = new FormData();
    tgFormData.append('chat_id', config.tgChatId);
    tgFormData.append(field, file, file.name);
    
    const tgResponse = await fetch(
      `https://api.telegram.org/bot${config.tgBotToken}/${method}`,
      { method: 'POST', body: tgFormData }
    );
    
    if (!tgResponse.ok) throw new Error('Telegram参数配置错误');

    const tgData = await tgResponse.json();
    const result = tgData.result;
    const messageId = tgData.result?.message_id;
    const fileId = result?.document?.file_id ||
                   result?.video?.file_id ||
                   result?.audio?.file_id ||
                   (result?.photo && result.photo[result.photo.length-1]?.file_id);
    
    if (!fileId) throw new Error('未获取到文件ID');
    if (!messageId) throw new Error('未获取到tg消息ID');

    const time = Date.now();
    const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const url = `https://${config.domain}/${time}.${ext}`;
    
    await config.database.prepare(`
      INSERT INTO files (url, fileId, message_id, created_at, file_name, file_size, mime_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      url,
      fileId,
      messageId,
      timestamp,
      file.name,
      file.size,
      file.type || getContentType(ext)
    ).run();

    return new Response(
      JSON.stringify({ status: 1, msg: "✔ 上传成功", url }),
      { headers: { 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error(`[Upload Error] ${error.message}`);
    
    let statusCode = 500;
    if (error.message.includes(`文件超过${config.maxSizeMB}MB限制`)) {
      statusCode = 400;
    } else if (error.message.includes('Telegram参数配置错误')) {
      statusCode = 502;
    } else if (error.message.includes('未获取到文件ID') || error.message.includes('未获取到tg消息ID')) {
      statusCode = 500;
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      statusCode = 504;
    }
    
    return new Response(
      JSON.stringify({ status: 0, msg: "✘ 上传失败", error: error.message }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' }}
    );
  }
}