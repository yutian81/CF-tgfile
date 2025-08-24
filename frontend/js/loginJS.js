export const loginJS = `
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorEl = document.getElementById('error');
  errorEl.style.display = 'none';

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
`;