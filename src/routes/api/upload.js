// src/routes/api/upload.js

import { authenticate } from '../../middleware/cookie.js';
import { uploadFileToTelegram } from '../../handlers/file-service.js';

export const path = '/upload';

export async function handle(request, config) {
  const url = new URL(request.url);

  // GET 返回上传页面，使用 cookie 鉴权
  if (request.method === 'GET') {
    if (config.enableAuth && !authenticate(request, config)) {
      return Response.redirect(new URL('/login', url), 302);
    }

    try {
      const staticUrl = new URL('/public/upload.html', url);
      const res = await fetch(staticUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    } catch (err) {
      console.error('[Upload Page Error]', err.message);
      return new Response('无法加载上传页面', { status: 500 });
    }
  }

  // POST 上传文件（API 鉴权已在 api.js 处理）
  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) throw new Error('未找到文件');
      if (file.size > config.maxSizeMB * 1024 * 1024) {
        throw new Error(`文件超过${config.maxSizeMB}MB限制`);
      }

      const result = await uploadFileToTelegram(file, config);

      return new Response(JSON.stringify({
        status: 1,
        msg: "✔ 上传成功",
        url: result.url
      }), {
        headers: { 'Content-Type': 'application/json;charset=UTF-8' }
      });

    } catch (error) {
      console.error('[API Upload Error]', error.message);

      let statusCode = 500;
      if (error.message.includes(`文件超过${config.maxSizeMB}MB限制`)) statusCode = 400;
      else if (error.message.includes('Telegram API error')) statusCode = 502;

      return new Response(JSON.stringify({
        status: 0,
        msg: "✘ 上传失败",
        error: error.message
      }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' }
      });
    }
  }

  // 非 GET/POST 请求
  return new Response(
    JSON.stringify({ status: 0, msg: "方法不允许" }),
    { status: 405, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
  );
}
