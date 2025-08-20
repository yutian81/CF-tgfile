import { searchFilesService } from '../../handlers/file-service.js';

export async function handleApiSearch(request, config) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Search query parameter "q" is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const files = await searchFilesService(config, query);
    
    // 格式化搜索结果
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
    console.error(`[API Search Error] ${error.message}`);
    return new Response(
      JSON.stringify({ error: 'Search failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}