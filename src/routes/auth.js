// src/routes/auth.js
export const path = '/';
import { authenticate } from '../middleware/cookie.js';

export async function handle(request, config) {
  if (!request?.url) return new Response('请求对象无效', { status: 400 });

  const url = new URL(request.url);
  const pathname = url.pathname;

  // 根路径跳转逻辑
  if (pathname === '/') {
    const loggedIn = config.enableAuth ? authenticate(request, config) : true;
    const redirectUrl = new URL(loggedIn ? '/upload' : '/login', request.url);
    return Response.redirect(redirectUrl, 302);
  }

  return null; // 其他路径由 main.js 处理
}
