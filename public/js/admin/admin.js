// public/js/admin.js

import { formatSize } from '../file-size.js';
import { getPreviewHtml } from './preview.js';

export function fileCards(fileList) {
  return fileList.map(file => {
    const fileName = file.file_name;
    const fileSize = formatSize(file.file_size || 0);
    const createdAt = new Date(file.created_at).toISOString().replace('T',' ').split('.')[0];

    return `
      <div class="file-card" data-url="${file.url}">
        <div class="file-preview">${getPreviewHtml(file.url)}</div>
        <div class="file-info">
          <div>${fileName}</div>
          <div>${fileSize}</div>
          <div>${createdAt}</div>
        </div>
        <div class="file-actions">
          <button class="btn btn-copy" onclick="showQRCode('${file.url}')">分享</button>
          <a class="btn btn-down" href="${file.url}" download="${fileName}" target="_blank">下载</a>
          <button class="btn btn-delete" onclick="deleteFile('${file.url}')">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

export async function renderAdminPage(apiPath = '/api/files') {
  try {
    const res = await fetch(apiPath);
    if (!res.ok) throw new Error(`无法获取文件: ${res.status}`);
    const data = await res.json();
    const grid = document.getElementById('fileGrid');
    grid.innerHTML = fileCards(data.files || []);
  } catch(err) {
    console.error('[Admin Page Error]', err);
    document.getElementById('fileGrid').innerHTML = `<p style="color:red;">加载文件失败: ${err.message}</p>`;
  }
}
