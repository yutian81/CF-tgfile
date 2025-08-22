import { searchFilesService } from '../../handlers/file-service.js';
import { authenticateApi } from '../../middleware/api-auth.js';

export const path = '/search';

export async function handle(request, config) {
  const url = new URL(request.url);

  // 仅允许 GET 请求
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: '方法不允许' }),
      { status: 405, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );
  }

  // API Key 鉴权
  const authResult = authenticateApi(request, config);
  if (!authResult.authenticated) {
    return new Response(
      JSON.stringify({ error: authResult.error }),
      { status: 401, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );
  }

  // 获取搜索参数
  const query = url.searchParams.get('q');
  if (!query) {
    return new Response(
      JSON.stringify({ error: 'Search query parameter "q" is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );
  }

  try {
    const files = await searchFilesService(config, query);

    const formattedFiles = files.map(file => ({
      url: file.url,
      file_name: file.file_name,
      file_size: file.file_size,
      mime_type: file.mime_type,
      created_at: file.created_at
    }));

    return new Response(
      JSON.stringify({ files: formattedFiles }),
      { headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );
  } catch (error) {
    console.error(`[API Search Error] ${error.message}`);
    return new Response(
      JSON.stringify({ error: 'Search failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );
  }
}
