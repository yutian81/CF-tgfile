// src/routes/login.js
export const path = '/login';
import { authenticate } from '../middleware/cookie.js';

export async function handle(request, config) {
  const url = new URL(request.url);

  // POST 登录
  if (request.method === 'POST') {
    try {
      const { username, password } = await request.json();

      if (username === config.username && password === config.password) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + config.cookie);

        const tokenData = JSON.stringify({
          username: config.username,
          expiration: expirationDate.getTime()
        });
        const token = btoa(tokenData);

        const cookieParts = [
          `auth_token=${token}`,
          `Path=/`,
          `HttpOnly`,
          url.protocol === 'https:' ? 'Secure' : '',
          `SameSite=Strict`,
          `Expires=${expirationDate.toUTCString()}`
        ];
        const cookie = cookieParts.filter(Boolean).join('; ');

        return new Response(JSON.stringify({ success: true, message: "登录成功" }), {
          status: 200,
          headers: {
            "Set-Cookie": cookie,
            "Content-Type": "application/json;charset=UTF-8"
          }
        });
      }

      return new Response(JSON.stringify({ success: false, error: "认证失败" }), {
        status: 401,
        headers: { "Content-Type": "application/json;charset=UTF-8" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: "请求解析失败" }), {
        status: 400,
        headers: { "Content-Type": "application/json;charset=UTF-8" }
      });
    }
  }

  // GET 返回登录页面
  if (request.method === 'GET') {
    try {
      // Worker Sites 友好路径
      const fileUrl = new URL('/login.html', import.meta.url);
      const fileResp = await fetch(fileUrl);

      if (!fileResp.ok) return new Response('登录页面未找到', { status: 404 });
      const html = await fileResp.text();
      return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });

    } catch (err) {
      console.error('[Login Page Error]', err);
      return new Response('服务器错误', { status: 500 });
    }
  }

  return new Response('方法不允许', { status: 405 });
}
