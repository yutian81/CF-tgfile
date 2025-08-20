import { getFileByUrl } from '../../database.js';

export async function handleApiFile(request, config, filePath) {
  try {
    // 构建完整的URL
    const fileUrl = `https://${config.domain}/${filePath}`;
    
    const file = await getFileByUrl(config, fileUrl);
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 返回文件信息
    const fileInfo = {
      url: fileUrl,
      file_name: file.file_name,
      file_size: file.file_size,
      mime_type: file.mime_type,
      created_at: file.created_at
    };
    
    return new Response(
      JSON.stringify(fileInfo),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[API File Error] ${error.message}`);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve file information' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}