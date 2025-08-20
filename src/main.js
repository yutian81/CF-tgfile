// src/main.js

import { handleAuthRequest } from './routes/auth.js';
import { handleLoginRequest } from './routes/login.js';
import { handleUploadRequest } from './routes/upload.js';
import { handleAdminRequest } from './routes/admin.js';
import { handleDeleteRequest } from './routes/delete.js';
import { handleSearchRequest } from './routes/search.js';
import { handleBingImagesRequest } from './routes/bing.js';
import { handleFileRequest } from './handlers/file.js';
import { initDatabase } from './database.js';
import { handleApiRequest } from './routes/api/index.js';

export default {
    async fetch(request, env) {
        // 环境变量配置
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

        // 初始化数据库
        await initDatabase(config);

        // 路由处理
        const { pathname } = new URL(request.url);

        // 访问 /config 返回文件大小
        if (pathname === '/config') {
            const safeConfig = { maxSizeMB: config.maxSizeMB };
            return new Response(JSON.stringify(safeConfig), {
            headers: { 'Content-Type': 'application/json' }
            });
        }

        // 检查是否为API请求
        if (pathname.startsWith('/api/')) {
            return handleApiRequest(request, config);
        }

        const routes = {
            '/': () => handleAuthRequest(request, config),
            '/login': () => handleLoginRequest(request, config),
            '/upload': () => handleUploadRequest(request, config),
            '/admin': () => handleAdminRequest(request, config),
            '/delete': () => handleDeleteRequest(request, config),
            '/search': () => handleSearchRequest(request, config),
            '/bing': () => handleBingImagesRequest(config)
        };

        const handler = routes[pathname];
            if (handler) {
            return await handler();
        }

        // 处理文件访问请求
        return await handleFileRequest(request, config);
    }
};
