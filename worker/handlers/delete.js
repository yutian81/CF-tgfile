import { authenticate } from '../middleware/auth.js';

export async function handleDelete(request, config) {
  if (config.enableAuth && !authenticate(request, config)) {
    return Response.redirect(`${new URL(request.url).origin}/`, 302);
  }

  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: '无效的URL' }), {
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const file = await config.database.prepare(
      'SELECT fileId, message_id FROM files WHERE url = ?'
    ).bind(url).first();
    
    if (!file) {
      return new Response(JSON.stringify({ error: '文件不存在' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let deleteError = null;

    try {
      const deleteResponse = await fetch(
        `https://api.telegram.org/bot${config.tgBotToken}/deleteMessage?chat_id=${config.tgChatId}&message_id=${file.message_id}`
      );
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        console.error(`[Telegram API Error] ${JSON.stringify(errorData)}`);
        throw new Error(`Telegram 消息删除失败: ${errorData.description}`);
      }
    } catch (error) { 
      deleteError = error.message; 
    }

    // 删除数据库表数据，即使Telegram删除失败也会删除数据库记录
    await config.database.prepare('DELETE FROM files WHERE url = ?').bind(url).run();
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: deleteError ? `文件已从数据库删除，但Telegram消息删除失败: ${deleteError}` : '文件删除成功'
      }),
      { headers: { 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error(`[Delete Error] ${error.message}`);
    return new Response(
      JSON.stringify({ 
        error: error.message.includes('message to delete not found') ? 
              '文件已从频道移除' : error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' }}
    );
  }
}