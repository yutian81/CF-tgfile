// src/routes/api/files.js

// import { getFileByUrl } from '../../handlers/database.js';
import { getFileByUrlService, getAllFilesService, deleteFileService } from '../../handlers/file-service.js';
import { authenticate } from '../../middleware/cookie.js';

export const path = '/files';

export async function handle(request, config) {
  const urlObj = new URL(request.url);
  const pathname = urlObj.pathname;

  try {
    // 单个文件路径：/files/:filePath
    if (pathname.startsWith('/files/')) {
      const filePath = pathname.replace('/files/', '');
      const fileUrl = `https://${config.domain}/${filePath}`;

      // GET 单个文件信息，cookie鉴权
      if (request.method === 'GET') {
        if (config.enableAuth && !authenticate(request, config)) {
          return Response.redirect(new URL('/login', urlObj), 302);
        }

        const file = await getFileByUrlService(config, fileUrl);
        if (!file) {
          return new Response(
            JSON.stringify({ error: '文件未找到' }),
            { status: 404, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
          );
        }

        const fileInfo = {
          url: fileUrl,
          file_name: file.fileName,
          file_size: file.fileSize,
          mime_type: file.mimeType,
          created_at: file.timestamp
        };

        return new Response(JSON.stringify(fileInfo), {
          headers: { 'Content-Type': 'application/json;charset=UTF-8' }
        });
      }

      // DELETE 单个文件，API Key鉴权已经在 api.js 做过，无需重复
      if (request.method === 'DELETE') {
        try {
          const result = await deleteFileService(config, fileUrl);
          return new Response(
            JSON.stringify({ message: result.message, url: fileUrl }),
            { headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 404, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
          );
        }
      }

      // 方法不允许
      return new Response(
        JSON.stringify({ error: '方法不允许' }),
        { status: 405, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
      );
    }

    // 获取所有文件信息：/files
    if (pathname === '/files' && request.method === 'GET') {
      if (config.enableAuth && !authenticate(request, config)) {
        return Response.redirect(new URL('/login', urlObj), 302);
      }

      const files = await getAllFilesService(config);
      const formattedFiles = files.map(file => ({
        url: file.url,
        file_name: file.fileName,
        file_size: file.fileSize,
        mime_type: file.mimeType,
        created_at: file.timestamp
      }));

      return new Response(JSON.stringify({ files: formattedFiles }), {
        headers: { 'Content-Type': 'application/json;charset=UTF-8' }
      });
    }

    // 方法不允许
    return new Response(
      JSON.stringify({ error: '方法不允许' }),
      { status: 405, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );

  } catch (error) {
    console.error(`[Files Error] ${error.message}`);
    return new Response(
      JSON.stringify({ error: '文件处理失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json;charset=UTF-8' } }
    );
  }
}
