import { handleDeleteRequest } from '../delete.js';

export async function handleApiDeleteFile(request, config, filePath) {
  try {
    // 构建完整的URL
    const fileUrl = `https://${config.domain}/${filePath}`;
    
    // 调用现有的删除逻辑
    const deleteResponse = await handleDeleteRequest(
      new Request('/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl })
      }),
      config
    );
    
    if (deleteResponse.status === 200) {
      return new Response(
        JSON.stringify({ success: true, message: 'File deleted successfully' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      const errorData = await deleteResponse.json();
      return new Response(
        JSON.stringify({ error: errorData.error || 'Failed to delete file' }),
        { status: deleteResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}