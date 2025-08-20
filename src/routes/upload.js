import { generateUploadPage } from '../utils/html.js';
import { authenticate } from '../auth.js';
import { uploadFileToTelegram } from '../handlers/file-service.js';

export async function handleUploadRequest(request, config) {
  if (config.enableAuth && !authenticate(request, config)) {
    return Response.redirect(`${new URL(request.url).origin}/`, 302);
  }
  
  if (request.method === 'GET') {
    const html = generateUploadPage();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) throw new Error('未找到文件');
    if (file.size > config.maxSizeMB * 1024 * 1024) throw new Error(`文件超过${config.maxSizeMB}MB限制`);
    
    const result = await uploadFileToTelegram(file, config);

    return new Response(
      JSON.stringify({ status: 1, msg: "✔ 上传成功", url: result.url }),
      { headers: { 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error(`[Upload Error] ${error.message}`);
    
    let statusCode = 500;
    if (error.message.includes(`文件超过${config.maxSizeMB}MB限制`)) {
      statusCode = 400;
    } else if (error.message.includes('Telegram API error')) {
      statusCode = 502;
    } else if (error.message.includes('Failed to get file ID')) {
      statusCode = 500;
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      statusCode = 504;
    }
    
    return new Response(
      JSON.stringify({ status: 0, msg: "✘ 上传失败", error: error.message }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' }}
    );
  }
}