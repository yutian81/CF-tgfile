// public/js/delete.js

export async function deleteFile(url, pagination, apiPath = '/api/files') {
  if (!confirm('确定要删除这个文件吗？')) return;

  try {
    // DELETE 请求到 /api/files/:filePath
    const path = url.replace(/^https?:\/\/[^\/]+\/+/, '');
    const response = await fetch(`${apiPath}/${encodeURIComponent(path)}`, { method: 'DELETE' });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '删除失败');
    }

    const card = document.querySelector(`[data-url="${url}"]`);
    if (card) card.remove();

    if (pagination && typeof pagination.render === 'function') {
      pagination.refresh();
    }

    alert('文件删除成功');
  } catch(err) {
    alert('文件删除失败: ' + err.message);
  }
}
