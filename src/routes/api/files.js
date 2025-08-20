import { getAllFilesService } from '../../handlers/file-service.js';

export async function handleApiFiles(request, config) {
  try {
    const files = await getAllFilesService(config);
    
    // 格式化文件信息
    const formattedFiles = files.map(file => ({
      url: file.url,
      file_name: file.file_name,
      file_size: file.file_size,
      mime_type: file.mime_type,
      created_at: file.created_at
    }));
    
    return new Response(
      JSON.stringify({ files: formattedFiles }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[API Files Error] ${error.message}`);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve file list' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}