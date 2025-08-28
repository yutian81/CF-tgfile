<template>
    <div class="container">
      <div class="header">
        <h2>文件管理</h2>
        <router-link to="/upload" class="backup">返回</router-link>
        <input type="text" class="search" placeholder="搜索文件..." v-model="searchTerm">
      </div>
      <div class="grid" id="fileGrid">
          <div v-for="file in paginatedFiles" :key="file.url" class="file-card">
              <div class="file-preview">
                  <img v-if="isImage(file.url)" :src="file.url" alt="预览">
                  <video v-else-if="isVideo(file.url)" :src="file.url" controls></video>
                  <div v-else style="font-size: 48px">📄</div>
              </div>
              <div class="file-info">
                  <div>{{ file.file_name }}</div>
                  <div>{{ formatSize(file.file_size) }}</div>
                  <div>{{ new Date(file.created_at).toLocaleString() }}</div>
              </div>
              <div class="file-actions">
                  <button class="btn btn-copy" @click="showQRCode(file.url)">分享</button>
                  <a class="btn btn-down" :href="file.url" :download="file.file_name" target="_blank">下载</a>
                  <button class="btn btn-delete" @click="deleteFile(file.url)">删除</button>
              </div>
          </div>
      </div>
      <div id="pagination">
          <button class="btn-page" @click="prevPage" :disabled="currentPage === 1">上一页</button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button class="btn-page" @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
      </div>
      <div v-if="qrModalVisible" class="qr-modal" @click.self="closeQRModal">
        <div class="qr-content">
          <div id="qrcode-container"></div>
          <div class="qr-buttons">
            <button class="qr-copy" @click="copyShareUrl">复制链接</button>
            <button class="qr-close" @click="closeQRModal">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted, nextTick } from 'vue';
  import QRCode from 'qrcode';
  
  // --- 类型定义区域 ---
  
  // 数据库中的文件信息结构
  interface FileInfo {
      url: string;
      file_name: string;
      file_size: number;
      created_at: string;
  }
  
  // /api/files 接口的响应结构
  interface FilesApiResponse {
      files: FileInfo[];
  }
  
  // /api/delete 接口的响应结构
  interface DeleteApiResponse {
      success: boolean;
      message?: string;
      error?: string;
  }
  
  // --- 组件逻辑 ---
  
  const allFiles = ref<FileInfo[]>([]);
  const searchTerm = ref('');
  const currentPage = ref(1);
  const itemsPerPage = 15;
  
  const qrModalVisible = ref(false);
  const currentShareUrl = ref('');
  
  const filteredFiles = computed(() => {
      if (!searchTerm.value) return allFiles.value;
      return allFiles.value.filter(file =>
          file.file_name.toLowerCase().includes(searchTerm.value.toLowerCase())
      );
  });
  
  const totalPages = computed(() => Math.ceil(filteredFiles.value.length / itemsPerPage) || 1);
  
  const paginatedFiles = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      return filteredFiles.value.slice(start, end);
  });
  
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isVideo = (url: string) => /\.(mp4|webm)$/i.test(url);
  const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
  };
  
  const fetchFiles = async () => {
      try {
          const response = await fetch('/api/files');
          // 应用 FilesApiResponse 类型
          const data = await response.json<FilesApiResponse>();
          allFiles.value = data.files || [];
      } catch (e) {
          console.error("获取文件列表失败:", e);
          alert("获取文件列表失败");
      }
  };
  
  const deleteFile = async (url: string) => {
      if (!confirm(`确定要删除文件 "${url.split('/').pop()}" 吗？`)) return;
      try {
          const response = await fetch('/api/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
          });
          // 应用 DeleteApiResponse 类型
          const data = await response.json<DeleteApiResponse>();
          if (response.ok && data.success) {
              alert(data.message || '删除成功');
              fetchFiles(); // 重新加载列表
          } else {
              throw new Error(data.error || data.message || '删除失败');
          }
      } catch (e: any) {
          alert(`删除失败: ${e.message}`);
      }
  };
  
  const showQRCode = async (url: string) => {
      currentShareUrl.value = url;
      qrModalVisible.value = true;
      await nextTick(); // 等待 DOM 更新
      const container = document.getElementById('qrcode-container');
      if (container) {
          container.innerHTML = ''; // 清空
          QRCode.toCanvas(url, { width: 200, errorCorrectionLevel: 'H' }, (err, canvas) => {
              if (err) throw err;
              container.appendChild(canvas);
          });
      }
  };
  
  const closeQRModal = () => qrModalVisible.value = false;
  const copyShareUrl = () => navigator.clipboard.writeText(currentShareUrl.value).then(() => alert('链接已复制'));
  const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };
  const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };
  
  onMounted(fetchFiles);
  </script>
  
  <style scoped>
    body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background: #f5f5f5;
    }
    .container {
        max-width: 1200px;
        margin: 0 auto;
    }

    .header {
        background: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap; /* 移动端支持换行 */
        align-items: center;
    }

    .header h2 {
        margin: 0;
        flex: 1;
        min-width: 0;
    }

    .header .backup {
        background: #007BFF;
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        margin: 0 20px;
        text-decoration: none;
        color: #fff;
        text-decoration: none;
    }

    .header .backup:hover {
        text-decoration: underline;
    }

    .header .search {
        flex: 1 1 100%;
        max-width: 100%;
        margin-top: 10px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: rgba(255,255,255,0.5);
        box-sizing: border-box;
    }

    /* 桌面端：不换行，搜索框固定宽度 */
    @media (min-width: 768px) {
        .header {
            flex-wrap: nowrap;
        }
        .header .search {
            flex: unset;
            width: 300px;
            margin-top: 0;
        }
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;
    }
    .file-card {
        background: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        overflow: hidden;
        position: relative;
    }
    .file-preview {
        height: 150px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
        .file-preview img, .file-preview video {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
    .file-info {
        padding: 10px;
        font-size: 14px;
    }
    .file-actions {
        padding: 10px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 12px;
    }
        .file-actions .btn {
        font-size: inherit;
    }
    .btn {
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    .btn-delete {
        background: #dc3545;
        color: white;
    }
    .btn-copy {
        background: #007bff;
        color: white;
    }
    .btn-down {
        background: #007bff;
        color: white;
        text-decoration: none;
    }
    .qr-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    .qr-content {
        background: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    #qrcode {
        margin: 5px 0;
    }
    .qr-buttons {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-top: 15px;
    }
    .qr-copy, .qr-close {
        padding: 8px 20px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }

    /* 分页按钮样式 */
    #pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
    }

    #pagination .btn-page {
        padding: 6px 14px;
        border-radius: 8px;
        border: none;
        background: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #0A0A0A;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 40px;
        text-align: center;
        font-size: 14px;
        box-shadow: none;
        margin: 20px 0;
    }

    #pagination .btn-page:hover {
        background-color: #007bff;
        color: #fff;
    }

    #pagination .btn-page.active {
        background-color: #007bff;
        color: #fff;
        cursor: default;
    }

    #pagination .btn-page:disabled {
        background-color: #f0f0f0;
        color: #aaa;
        cursor: not-allowed;
        border-color: #ccc;
    }

    #pagination span.page-info {
        padding: 6px 10px;
        font-size: 14px;
        color: #333;
    }

    /* 版权页脚 */
    footer {
        font-size: 0.85rem;
        width: 100%;
        text-align: center;
    }
    footer p {
        color: #7F7F7E;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin: 0;
    }
    footer a {
        color: #7F7F7E;
        text-decoration: none;
        transition: color 0.3s ease;
    }
    footer a:hover {
        color: #007BFF !important;
    }
  </style>