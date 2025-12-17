/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { api, getContentType } from './api';
import type { Bindings } from './types';

// --- 类型定义 ---
interface TelegramGetFileResponse {
    ok: boolean;
    result?: {
        file_id: string;
        file_unique_id: string;
        file_size?: number;
        file_path?: string;
    };
}

const app = new Hono<{ Bindings: Bindings }>();

// 1. 挂载 API 路由
app.route('/api', api);

// 2. 处理文件下载路由 (动态路由)
app.get('/:filename', async (c) => {
    const url = c.req.url;
    const cache = caches.default;
    const cacheKey = new Request(url, c.req);
    let response = await cache.match(cacheKey);

    if (response) {
        console.log(`[Cache Hit] ${url}`);
        return response;
    }
    console.log(`[Cache Miss] ${url}`);

    try {
        const file = await c.env.DATABASE.prepare(
            `SELECT fileId, file_name, mime_type FROM files WHERE url = ?`
        ).bind(url).first<{ fileId: string; file_name: string; mime_type: string }>();

        if (!file) return await c.notFound();

        const tgResponse = await fetch(`https://api.telegram.org/bot${c.env.TG_BOT_TOKEN}/getFile?file_id=${file.fileId}`);
        if (!tgResponse.ok) throw new Error('获取 Telegram 文件信息失败');

        const tgData = await tgResponse.json<TelegramGetFileResponse>();
        const filePath = tgData.result?.file_path;
        if (!filePath) throw new Error('文件路径无效');

        const fileUrl = `https://api.telegram.org/file/bot${c.env.TG_BOT_TOKEN}/${filePath}`;
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) throw new Error('下载文件失败');

        const ext = url.split('.').pop()?.toLowerCase() ?? '';
        const contentType = file.mime_type || getContentType(ext);

        response = new Response(fileResponse.body, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000', // 缓存一年
                'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.file_name || '')}`
            }
        });

        c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;

    } catch (error: any) {
        console.error(`[File Request Error] ${error.message} for ${url}`);
        return c.text('服务器内部错误', 500);
    }
});

// 3. 静态资源服务 (处理 /assets/*, /favicon.ico 等真实文件)
app.get('*', serveStatic({ root: './' }));
// 4. SPA 路由回退 (处理 /admin, /upload 等前端路由，必须是最后一个)
app.get('*', serveStatic({ path: './index.html' }));

export default app;
