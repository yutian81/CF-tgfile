import { generateLoginPage } from '../utils/html.js';

export async function handleLoginRequest(request, config) {
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
  
  const html = generateLoginPage();
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}