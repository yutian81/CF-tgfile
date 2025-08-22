// src/routes/admin.js

import { getAllFiles } from '../handlers/database.js';
import { authenticate } from '../middleware/cookie.js';
import { escapeJsString } from '../utils/escape.js';

export const path = '/admin';

export async function handle(request, config) {
  // 鉴权
  if (config.enableAuth && !authenticate(request, config)) {
    // GET 跳登录页
    if (request.method === 'GET') {
      return Response.redirect(`${new URL(request.url).origin}/login`, 302);
    }
    // 其他请求返回 JSON 错误
    return new Response(
      JSON.stringify({ status: 0, msg: '未认证', error: '请先登录' }),
      { status: 401, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );
  }

  if (request.method === 'GET') {
    try {
      const filesData = await getAllFiles(config);
      const fileList = filesData.results || [];

      const safeFiles = fileList.map(file => ({
        file_name: escapeJsString(file.file_name),
        file_size: file.file_size || 0,
        created_at: file.created_at,
        url: escapeJsString(file.url)
      }));

      return new Response(
        JSON.stringify({ status: 1, results: safeFiles }),
        { headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
      );
    } catch (err) {
      console.error('[Admin Error]', err.message);
      return new Response(
        JSON.stringify({ status: 0, error: err.message || '获取文件列表失败' }),
        { status: 500, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
      );
    }
  }

  // 方法不允许
  return new Response(
    JSON.stringify({ status: 0, msg: '方法不允许' }),
    { status: 405, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
  );
}
