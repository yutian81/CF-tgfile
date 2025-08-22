// src/routes/upload.js
export const path = '/upload';
import { authenticate } from '../middleware/cookie.js';

export async function handle(request, config) {

  if (request.method === 'GET') {
    if (config.enableAuth && !authenticate(request, config)) {
      return Response.redirect(new URL('/login', request.url), 302);
    }

    try {
      // Worker Sites 友好路径
      const fileUrl = new URL('/upload.html', import.meta.url);
      const fileResp = await fetch(fileUrl);
      if (!fileResp.ok) return new Response('上传页面未找到', { status: 404 });
      const html = await fileResp.text();
      return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    } catch (err) {
      console.error('[Upload Page Error]', err);
      return new Response('服务器错误', { status: 500 });
    }
  }

  return new Response('方法不允许', { status: 405 });
}
