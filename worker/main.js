// worker/main.js
import { handleLogin } from './handlers/login.js';
import { handleUpload } from './handlers/upload.js';
import { handleAdmin } from './handlers/admin.js';
import { handleFiles } from './handlers/files.js';
import { handleDelete } from './handlers/delete.js';
import { handleSearch } from './handlers/search.js';
import { handleBing } from './handlers/bing.js';
import { authenticate } from './middleware/auth.js';
import { initDatabase } from './utils/database.js';

let isDatabaseInitialized = false;

export default {
  async fetch(request, env) {
    const config = {
      domain: env.DOMAIN,
      database: env.DATABASE,
      username: env.USERNAME || 'admin',
      password: env.PASSWORD || 'admin',
      enableAuth: env.ENABLE_AUTH === 'true',
      tgBotToken: env.TG_BOT_TOKEN,
      tgChatId: env.TG_CHAT_ID,
      cookie: Number(env.COOKIE) || 7,
      maxSizeMB: Number(env.MAX_SIZE_MB) || 20
    };

    if (!isDatabaseInitialized) {
      await initDatabase(config);
      isDatabaseInitialized = true;
    }

    const { pathname } = new URL(request.url);
    
    if (pathname === '/config') {
      const safeConfig = { maxSizeMB: config.maxSizeMB };
      return new Response(JSON.stringify(safeConfig), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 路由处理
    const routes = {
      '/': () => handleAuthRequest(request, config),
      '/login': () => handleLogin(request, config),
      '/upload': () => handleUpload(request, config),
      '/admin': () => handleAdmin(request, config),
      '/delete': () => handleDelete(request, config),
      '/search': () => handleSearch(request, config),
      '/bing': () => handleBing()
    };

    const handler = routes[pathname];
    if (handler) {
      return await handler();
    }
    
    // 处理文件访问请求
    return await handleFiles(request, config);
  }
};

async function handleAuthRequest(request, config) {
  if (config.enableAuth) {
    const isAuthenticated = authenticate(request, config);
    if (!isAuthenticated) {
      return handleLogin(request, config);
    }
    return handleUpload(request, config);
  }
  return handleUpload(request, config);
}