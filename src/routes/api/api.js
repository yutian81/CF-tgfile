// src/routes/api/api.js
import { authenticateApi } from '../../middleware/api-auth.js';
import { handle as handleApiFiles } from './files.js';
import { handle as handleApiSearch } from './search.js';
import { handle as handleApiUpload } from './upload.js';

export const path = '/api';

export async function handle(request, config) {
  const { pathname } = new URL(request.url);

  // --- GET 请求无需 API Key 鉴权 ---
  if (request.method === 'GET') {
    if (pathname === '/api/upload') return handleApiUpload(request, config);
    if (pathname.startsWith('/api/files')) return handleApiFiles(request, config);
    if (pathname === '/api/search') return handleApiSearch(request, config);

    return new Response(
      JSON.stringify({ error: 'API endpoint not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );
  }

  // --- 非 GET 请求需要 API Key 鉴权 ---
  const authResult = authenticateApi(request, config);
  if (!authResult.authenticated) {
    return new Response(
      JSON.stringify({ error: authResult.error }),
      { status: 401, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );
  }

  // --- POST /api/upload 上传文件 ---
  if (pathname === '/api/upload' && request.method === 'POST') {
    return handleApiUpload(request, config);
  }

  // --- DELETE /api/files/:filePath 删除文件 ---
  if (pathname.startsWith('/api/files')) {
    return handleApiFiles(request, config);
  }

  // --- 非 GET 方法的 /api/search 不允许 ---
  if (pathname === '/api/search' && request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: '方法不允许，仅支持 GET' }),
      { status: 405, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );
  }

  // --- 默认 404 ---
  return new Response(
    JSON.stringify({ error: 'API endpoint not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
  );
}
