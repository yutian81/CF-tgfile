<template>
    <div class="login-page">
      <div class="login-container">
        <h2>登录</h2>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <input type="text" v-model="username" placeholder="用户名" required>
          </div>
          <div class="form-group">
            <input type="password" v-model="password" placeholder="密码" required>
          </div>
          <button type="submit">登录</button>
          <div v-if="error" class="error">{{ error }}</div>
        </form>
      </div>
      <footer class="footer">
        <p>
          <span><i class="fas fa-copyright"></i> 2025 Copyright by Yutian81</span><span>|</span>
          <a href="https://github.com/yutian81/CF-tgfile" target="_blank"><i class="fab fa-github"></i> GitHub Repo</a><span>|</span>
          <a href="https://blog.811520.xyz/" target="_blank"><i class="fas fa-blog"></i> 青云志博客</a>
        </p>
      </footer>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  
  // 1. 定义 API 响应的类型接口
  interface LoginApiResponse {
    success: boolean;
    message: string;
  }
  
  const username = ref('');
  const password = ref('');
  const error = ref('');
  const router = useRouter();
  
  const handleLogin = async () => {
    error.value = '';
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.value, password: password.value })
      });
  
      if (response.ok) {
        router.push('/upload');
      } else {
        // 2. 将返回的 json 数据断言为我们定义的类型
        const data = await response.json<LoginApiResponse>();
        // 现在 TypeScript 知道 data 上有 message 属性，不再报错
        error.value = data.message || "用户名或密码错误";
      }
    } catch (err) {
      error.value = "登录请求失败，请稍后再试";
    }
  };
  </script>
  
  <style scoped>
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