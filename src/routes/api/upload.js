import { uploadFileToTelegram } from '../../handlers/file-service.js';

export async function handleApiUpload(request, config) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (file.size > config.maxSizeMB * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: `File exceeds ${config.maxSizeMB}MB limit` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const result = await uploadFileToTelegram(file, config);

    return new Response(
      JSON.stringify({ 
        url: result.url, 
        file_name: result.fileName, 
        file_size: result.fileSize, 
        mime_type: result.mimeType 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[API Upload Error] ${error.message}`);
    
    let statusCode = 500;
    if (error.message.includes(`exceeds ${config.maxSizeMB}MB limit`)) {
      statusCode = 400;
    } else if (error.message.includes('Telegram API error')) {
      statusCode = 502;
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }
}