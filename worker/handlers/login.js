import { headlink } from '../../components/headlink.js';
import { copyright } from '../../components/copyright.js';
import { setbing } from '../../components/setbing.js';
import { loginCSS } from '../../frontend/css/loginCSS.js';
import { loginJS } from '../../frontend/js/loginJS.js';

export async function handleLogin(request, config) {
  if (request.method === 'POST') {
    const { username, password } = await request.json();

    if (username === config.username && password === config.password) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + config.cookie);
      const expirationTimestamp = expirationDate.getTime();

      const tokenData = JSON.stringify({
        username: config.username,
        expiration: expirationTimestamp
      });

      const token = btoa(tokenData);
      const cookie = `auth_token=${token}; Path=/; HttpOnly; Secure; Expires=${expirationDate.toUTCString()}`;

      return new Response("登录成功", {
        status: 200,
        headers: {
          "Set-Cookie": cookie,
          "Content-Type": "text/plain"
        }
      });
    }
    return new Response("认证失败", { status: 401 });
  }

  // 使用模板字符串和组件构建完整的HTML页面
  const loginHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  ${headlink}
  <title>登录</title>
  <style>${loginCSS}</style>
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
    ${copyright}
  </footer>
  <script>${setbing}</script>
  <script>${loginJS}</script>
</body>
</html>`;

  return new Response(loginHtml, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}
