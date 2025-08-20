import { insertFile, getAllFiles, searchFiles, getFileByUrl, deleteFile as dbDeleteFile } from '../database.js';
import { getContentType } from '../utils/content-types.js';

// 共享的文件上传逻辑
export async function uploadFileToTelegram(file, config) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const mimeType = getContentType(ext);
  const [mainType] = mimeType.split('/');
  
  const typeMap = {
    image: { method: 'sendPhoto', field: 'photo' },
    video: { method: 'sendVideo', field: 'video' },
    audio: { method: 'sendAudio', field: 'audio' }
  };
  
  let { method = 'sendDocument', field = 'document' } = typeMap[mainType] || {};

  if (['application', 'text'].includes(mainType)) {
    method = 'sendDocument';
    field = 'document';
  }

  const tgFormData = new FormData();
  tgFormData.append('chat_id', config.tgChatId);
  tgFormData.append(field, file, file.name);
  
  const tgResponse = await fetch(
    `https://api.telegram.org/bot${config.tgBotToken}/${method}`,
    { method: 'POST', body: tgFormData }
  );
  
  if (!tgResponse.ok) {
    throw new Error('Telegram API error');
  }
  
  const tgData = await tgResponse.json();
  const result = tgData.result;
  const messageId = tgData.result?.message_id;
  const fileId = result?.document?.file_id ||
                result?.video?.file_id ||
                result?.audio?.file_id ||
               (result?.photo && result.photo[result.photo.length-1]?.file_id);
  
  if (!fileId) throw new Error('Failed to get file ID from Telegram');
  if (!messageId) throw new Error('Failed to get message ID from Telegram');

  const time = Date.now();
  const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const url = `https://${config.domain}/${time}.${ext}`;
  
  await insertFile(config, {
    url,
    fileId,
    messageId,
    timestamp,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || getContentType(ext)
  });

  return {
    url,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || getContentType(ext)
  };
}

// 共享的文件搜索逻辑
export async function searchFilesService(config, query) {
  const searchPattern = `%${query}%`;
  const files = await searchFiles(config, searchPattern);
  return files.results || [];
}

// 共享的文件获取逻辑
export async function getAllFilesService(config) {
  const files = await getAllFiles(config);
  return files.results || [];
}

// 共享的文件删除逻辑
export async function deleteFileService(config, fileUrl) {
  const file = await getFileByUrl(config, fileUrl);
  
  if (!file) {
    throw new Error('File not found');
  }

  let deleteError = null;

  try {
    const deleteResponse = await fetch(
      `https://api.telegram.org/bot${config.tgBotToken}/deleteMessage?chat_id=${config.tgChatId}&message_id=${file.message_id}`
    );
    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      throw new Error(`Telegram message deletion failed: ${errorData.description}`);
    }
  } catch (error) { 
    deleteError = error.message; 
  }

  await dbDeleteFile(config, fileUrl);
  
  return {
    success: true,
    message: deleteError ? 
      `File deleted from database but Telegram message deletion failed: ${deleteError}` : 
      'File deleted successfully'
  };
}