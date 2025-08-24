import { authenticate } from '../middleware/auth.js';
import { generateFileCards } from '../../components/filecards.js';
import { qrmodal } from '../../components/qrmodal.js';
import { headlink } from '../../components/headlink.js';
import { copyright } from '../../components/copyright.js';
import { setbing } from '../../components/setbing.js';
import { adminCSS } from '../../frontend/css/adminCSS.js';
import { adminJS } from '../../frontend/js/adminJS.js';

export async function handleAdmin(request, config) {
  if (config.enableAuth && !authenticate(request, config)) {
    return Response.redirect(`${new URL(request.url).origin}/`, 302);
  }

  const files = await config.database.prepare(
    `SELECT url, fileId, message_id, created_at, file_name, file_size, mime_type
    FROM files
    ORDER BY created_at DESC`
  ).all();

  const fileList = files.results || [];
  const fileCards = generateFileCards(fileList);

  // 直接生成完整的 HTML
  const adminHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  ${headlink}
  <title>文件管理</title>
  <style>${adminCSS}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>文件管理</h2>
      <a href="/upload" class="backup">返回</a>
      <input type="text" class="search" placeholder="搜索文件..." id="searchInput">
    </div>
    <div class="grid" id="fileGrid">
      ${fileCards}
    </div>
    ${qrmodal}
  </div>
  <footer>
    ${copyright}
  </footer>
  <script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"></script>
  <script>${setbing}</script>
  <script>${adminJS}</script>
</body>
</html>`;

  return new Response(adminHtml, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}