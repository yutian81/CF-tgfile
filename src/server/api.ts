/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import { Bindings } from './types';

// --- 类型定义区域 ---

// 用于数据库查询返回的文件列表
interface FileInfo {
    url: string;
    file_name: string;
    file_size: number;
    created_at: string;
}

// Telegram API 成功响应的结构
interface TelegramResult {
    message_id?: number;
    document?: { file_id: string };
    video?: { file_id: string };
    audio?: { file_id: string };
    photo?: { file_id: string }[];
}
interface TelegramResponse {
    ok: boolean;
    result?: TelegramResult;
}

// Telegram API 错误响应的结构
interface TelegramErrorResponse {
    ok: boolean;
    description?: string;
    error_code?: number;
}

// Bing API 图片的结构
interface BingImage {
    url: string;
    // ... bing api 还返回其他字段，但我们只关心 url
}
interface BingApiResponse {
    images: BingImage[];
}


// --- 工具函数 ---
function getContentType(ext: string): string {
    const types: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
        webp: 'image/webp', svg: 'image/svg+xml', icon: 'image/x-icon', mp4: 'video/mp4',
        webm: 'video/webm', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
        pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', zip: 'application/zip',
        json: 'application/json', xml: 'application/xml'
    };
    return types[ext] || 'application/octet-stream';
}


const api = new Hono<{ Bindings: Bindings }>();

// --- 数据库初始化中间件 ---
let isDatabaseInitialized = false;
api.use('*', async (c, next) => {
    if (!isDatabaseInitialized) {
        try {
            await c.env.DATABASE.prepare(`
                CREATE TABLE IF NOT EXISTS files (
                    url TEXT PRIMARY KEY,
                    fileId TEXT NOT NULL,
                    message_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    file_name TEXT,
                    file_size INTEGER,
                    mime_type TEXT
                )
            `).run();
            isDatabaseInitialized = true;
        } catch (error: any) {
            console.error('Database initialization failed:', error.message);
            return c.json({ error: 'Database error' }, 500);
        }
    }
    await next();
});

// --- 认证中间件 ---
api.use('/upload', '/files', '/delete', async (c, next) => {
    if (c.env.ENABLE_AUTH !== 'true') {
        return await next();
    }
    const authToken = getCookie(c, 'auth_token');
    if (authToken) {
        try {
            const tokenData = JSON.parse(atob(authToken));
            if (Date.now() < tokenData.expiration && tokenData.username === c.env.USERNAME) {
                return await next();
            }
        } catch (e) { /* 无效 token */ }
    }
    return c.json({ error: 'Unauthorized' }, 401);
});

// --- API 路由 ---

api.get('/config', (c) => {
    return c.json({ maxSizeMB: Number(c.env.MAX_SIZE_MB) || 20 });
});

api.post('/login', async (c) => {
    const { username, password } = await c.req.json();
    if (username === c.env.USERNAME && password === c.env.PASSWORD) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + (Number(c.env.COOKIE) || 7));
        const tokenData = JSON.stringify({
            username: c.env.USERNAME,
            expiration: expirationDate.getTime()
        });
        const token = btoa(tokenData);
        setCookie(c, 'auth_token', token, { path: '/', secure: true, httpOnly: true, expires: expirationDate });
        return c.json({ success: true, message: '登录成功' });
    }
    return c.json({ success: false, message: '认证失败' }, 401);
});

api.post('/upload', async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof File)) throw new Error('未找到文件');
        
        const maxSizeMB = Number(c.env.MAX_SIZE_MB) || 20;
        if (file.size > maxSizeMB * 1024 * 1024) throw new Error(`文件超过${maxSizeMB}MB限制`);

        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const mimeType = getContentType(ext);
        const [mainType] = mimeType.split('/');

        const typeMap: Record<string, { method: string, field: string }> = {
            image: { method: 'sendPhoto', field: 'photo' },
            video: { method: 'sendVideo', field: 'video' },
            audio: { method: 'sendAudio', field: 'audio' }
        };
        let { method, field } = typeMap[mainType] || { method: 'sendDocument', field: 'document' };
        
        const tgFormData = new FormData();
        tgFormData.append('chat_id', c.env.TG_CHAT_ID);
        tgFormData.append(field, file, file.name);

        const tgResponse = await fetch(`https://api.telegram.org/bot${c.env.TG_BOT_TOKEN}/${method}`, {
            method: 'POST', body: tgFormData
        });

        if (!tgResponse.ok) {
            const errorText = await tgResponse.text();
            console.error("Telegram API Error:", errorText);
            throw new Error('Telegram参数配置错误或API异常');
        }

        const tgData = await tgResponse.json<TelegramResponse>();
        const result = tgData.result; // ✅ 修正点：现在 result 是类型安全的
        const messageId = result?.message_id;
        const fileId = result?.document?.file_id || result?.video?.file_id || result?.audio?.file_id || (result?.photo && result.photo[result.photo.length - 1]?.file_id);

        if (!fileId || !messageId) throw new Error('未获取到文件ID或消息ID');

        const timestamp = new Date().toISOString();
        const url = `https://${c.env.DOMAIN}/${Date.now()}.${ext}`;

        await c.env.DATABASE.prepare(
            `INSERT INTO files (url, fileId, message_id, created_at, file_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(url, fileId, messageId, timestamp, file.name, file.size, file.type || mimeType).run();

        return c.json({ status: 1, msg: "✔ 上传成功", url });
    } catch (error: any) {
        console.error(`[Upload Error] ${error.message}`);
        return c.json({ status: 0, msg: "✘ 上传失败", error: error.message }, 500);
    }
});

api.get('/files', async (c) => {
    const { results } = await c.env.DATABASE.prepare(
        `SELECT url, file_name, file_size, created_at FROM files ORDER BY created_at DESC`
    ).all<FileInfo>();
    return c.json({ files: results || [] });
});

api.post('/delete', async (c) => {
    try {
        const { url } = await c.req.json<{ url: string }>();
        if (!url) return c.json({ error: '无效的URL' }, 400);

        const file = await c.env.DATABASE.prepare('SELECT message_id FROM files WHERE url = ?').bind(url).first<{ message_id: number }>();
        if (!file) return c.json({ error: '文件不存在' }, 404);

        const deleteResponse = await fetch(`https://api.telegram.org/bot${c.env.TG_BOT_TOKEN}/deleteMessage?chat_id=${c.env.TG_CHAT_ID}&message_id=${file.message_id}`);
        
        await c.env.DATABASE.prepare('DELETE FROM files WHERE url = ?').bind(url).run();

        if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json<TelegramErrorResponse>();
            // ✅ 修正点：现在 errorData.description 是类型安全的
            return c.json({ success: true, message: `文件已从数据库删除，但Telegram消息删除失败: ${errorData.description}` });
        }
        
        return c.json({ success: true, message: '文件删除成功' });
    } catch (error: any) {
        console.error(`[Delete Error] ${error.message}`);
        return c.json({ error: '删除失败' }, 500);
    }
});

api.get('/bing', async (c) => {
    const cacheKey = 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5';
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (!response) {
        const res = await fetch(cacheKey);
        if (!res.ok) return c.json({ error: '请求 Bing API 失败' }, 502);

        const bingData = await res.json<BingApiResponse>();
        // 移除了 (image: any)，现在 image 类型会被自动推断为 BingImage
        const images = bingData.images.map((image) => ({ url: `https://cn.bing.com${image.url}` }));
        const returnData = { status: true, message: "操作成功", data: images };

        response = c.json(returnData);
        response.headers.set('Cache-Control', 'public, max-age=21600');
        c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
});

export { api };