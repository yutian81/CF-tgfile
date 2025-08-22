// src/main.js
import * as auth from './routes/auth.js';
import * as login from './routes/login.js';
import * as admin from './routes/admin.js';
import * as api from './routes/api/api.js';
import * as bing from './routes/bing.js';
import * as check from './routes/api/check.js';

import { handleFileRequest } from './handlers/file-fetch.js';
import { initDatabase } from './handlers/database.js';

let initialized = false;
let routeModules = [];

function loadRoutes() {
  return [auth, login, admin, api, bing, check];
}

export default {
  async fetch(request, env) {
    const config = {
      domain: env.DOMAIN,
      database: env.DATABASE,
      username: env.USERNAME,
      password: env.PASSWORD,
      enableAuth: env.ENABLE_AUTH === 'true',
      tgBotToken: env.TG_BOT_TOKEN,
      tgChatId: env.TG_CHAT_ID,
      cookie: Number(env.COOKIE) || 7,
      maxSizeMB: Number(env.MAX_SIZE_MB) || 20,
      apiKey: env.API_KEY
    };

    if (!initialized) {
      await initDatabase(config);
      routeModules = loadRoutes();
      initialized = true;
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // --- 先让 auth.js 处理鉴权跳转 ---
    const authModule = routeModules.find(mod => mod.path === '/');
    if (authModule?.handle) {
      const authResponse = await authModule.handle(request, config);
      if (authResponse instanceof Response) return authResponse;
    }

    // --- API 请求优先 ---
    if (pathname.startsWith('/api/')) {
      const apiModule = routeModules.find(mod => mod.path === '/api');
      if (apiModule?.handle) return await apiModule.handle(request, config);
    }

    // --- 模块化路由匹配 ---
    for (const mod of routeModules) {
      if (mod.path === pathname && mod.handle) {
        return await mod.handle(request, config);
      }
    }

    // --- 兜底文件请求 ---
    return await handleFileRequest(request, config);
  }
};
