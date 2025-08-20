import { authenticateApi } from '../../middleware/api-auth.js';
import { handleApiUpload } from './upload.js';
import { handleApiFiles } from './files.js';
import { handleApiFile } from './file.js';
import { handleApiSearch } from './search.js';
import { handleApiDeleteFile } from './delete.js';

export async function handleApiRequest(request, config) {
  // 验证API Key
  const authResult = authenticateApi(request, config);
  if (!authResult.authenticated) {
    return new Response(
      JSON.stringify({ error: authResult.error }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const { pathname } = new URL(request.url);
  
  // API路由分发
  if (pathname === '/api/upload' && request.method === 'POST') {
    return handleApiUpload(request, config);
  } else if (pathname === '/api/files' && request.method === 'GET') {
    return handleApiFiles(request, config);
  } else if (pathname.startsWith('/api/files/') && request.method === 'GET') {
    const filePath = pathname.replace('/api/files/', '');
    return handleApiFile(request, config, filePath);
  } else if (pathname.startsWith('/api/files/') && request.method === 'DELETE') {
    const filePath = pathname.replace('/api/files/', '');
    return handleApiDeleteFile(request, config, filePath);
  } else if (pathname === '/api/search' && request.method === 'GET') {
    return handleApiSearch(request, config);
  }
  
  // 未知API端点
  return new Response(
    JSON.stringify({ error: 'API endpoint not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}