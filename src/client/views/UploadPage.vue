<template>
    <div class="container">
      <div class="header">
        <h1>文件上传</h1>
        <router-link to="/admin" class="admin-link">文件管理</router-link>
      </div>
      <div class="upload-area" id="uploadArea" @dragover.prevent="highlight" @dragleave.prevent="unhighlight" @drop.prevent="handleDrop" @click="triggerFileInput">
        <p>点击选择 或 拖拽文件到此处<br>支持 Ctrl+V 粘贴上传</p>
        <input type="file" id="fileInput" multiple style="display: none" @change="handleFileSelect">
      </div>
      <div class="preview-area" id="previewArea">
        <div v-for="(file, index) in uploadQueue" :key="index" class="preview-item">
            <div class="info">
                <div>{{ file.name }}</div>
                <div>{{ formatSize(file.size) }}</div>
                <div class="progress-bar" :class="file.status">
                    <div class="progress-track" :style="{ width: file.progress + '%' }"></div>
                    <span class="progress-text">{{ file.message }}</span>
                </div>
            </div>
        </div>
      </div>
      <div class="url-area">
        <textarea id="urlArea" readonly placeholder="上传完成后的链接将显示在这里" :value="uploadedUrls.join('\n')"></textarea>
      </div>
      <div class="button-container">
        <button @click="copyUrls('url')">复制URL</button>
        <button @click="copyUrls('markdown')">复制Markdown</button>
        <button @click="copyUrls('html')">复制HTML</button>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  
  interface UploadFile {
    file: File;
    name: string;
    size: number;
    progress: number;
    message: string;
    status: 'uploading' | 'success' | 'error';
  }
  
  const uploadQueue = ref<UploadFile[]>([]);
  const uploadedUrls = ref<string[]>([]);
  let config = ref({ maxSizeMB: 20 });
  
  const highlight = (e: DragEvent) => (e.currentTarget as HTMLElement).classList.add('dragover');
  const unhighlight = (e: DragEvent) => (e.currentTarget as HTMLElement).classList.remove('dragover');
  const triggerFileInput = () => (document.getElementById('fileInput') as HTMLInputElement).click();
  
  const formatSize = (bytes: number): string => {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
      }
      return `${size.toFixed(2)} ${units[unitIndex]}`;
  };
  
  const handleFileSelect = (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) processFiles(Array.from(files));
  };
  
  const handleDrop = (e: DragEvent) => {
      unhighlight(e);
      const files = e.dataTransfer?.files;
      if (files) processFiles(Array.from(files));
  };
  
  const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
          const files: File[] = [];
          for (let i = 0; i < items.length; i++) {
              if (items[i].kind === 'file') {
                  const file = items[i].getAsFile();
                  if(file) files.push(file);
              }
          }
          if (files.length > 0) processFiles(files);
      }
  };
  
  const processFiles = (files: File[]) => {
      for (const file of files) {
          if (file.size > config.value.maxSizeMB * 1024 * 1024) {
              alert(`文件 "${file.name}" 超过${config.value.maxSizeMB}MB限制`);
              continue;
          }
          uploadFile(file);
      }
  };
  
  const uploadFile = (file: File) => {
      const fileEntry: UploadFile = {
          file: file,
          name: file.name,
          size: file.size,
          progress: 0,
          message: '0%',
          status: 'uploading'
      };
      uploadQueue.value.push(fileEntry);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);
  
      xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              fileEntry.progress = percent;
              fileEntry.message = `${percent}%`;
          }
      };
  
      xhr.onload = () => {
          try {
              const data = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300 && data.status === 1) {
                  fileEntry.status = 'success';
                  fileEntry.message = data.msg;
                  uploadedUrls.value.push(data.url);
              } else {
                  fileEntry.status = 'error';
                  fileEntry.message = `✘ ${data.error || data.msg || '未知错误'}`;
              }
          } catch (e) {
              fileEntry.status = 'error';
              fileEntry.message = '✗ 响应解析失败';
          }
      };
      
      xhr.onerror = () => {
          fileEntry.status = 'error';
          fileEntry.message = '✗ 上传请求失败';
      };
  
      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
  };
  
  const copyUrls = (format: 'url' | 'markdown' | 'html') => {
      if (uploadedUrls.value.length === 0) {
          alert('没有可复制的链接');
          return;
      }
      let text = '';
      switch (format) {
          case 'url': text = uploadedUrls.value.join('\n'); break;
          case 'markdown': text = uploadedUrls.value.map(url => `![](${url})`).join('\n'); break;
          case 'html': text = uploadedUrls.value.map(url => `<img src="${url}" />`).join('\n'); break;
      }
      navigator.clipboard.writeText(text).then(() => alert('已复制到剪贴板'));
  };
  
  
  onMounted(async () => {
      document.addEventListener('paste', handlePaste);
      try {
          const response = await fetch('/api/config');
          config.value = await response.json();
      } catch(e) {
          console.error("无法获取配置");
      }
  });
  
  onUnmounted(() => {
      document.removeEventListener('paste', handlePaste);
  });
  </script>
  
  <style scoped>
    body {
    font-family: Arial, sans-serif;
    transition: background-image 1s ease-in-out;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: #f5f5f5;
    margin: 0;
    }
    .container {
    width: 800px;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 10px 40px 20px 40px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin: 20px;
    }
    .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    }
    .upload-area {
    border: 2px dashed #666;
    padding: 40px;
    text-align: center;
    margin: 0 auto;
    border-radius: 8px;
    transition: all 0.3s;
    box-sizing: border-box;
    }
    .upload-area p {
    line-height: 2;
    }
    .upload-area.dragover {
    border-color: #007bff;
    background: #f8f9fa;
    }
    .preview-area {
    margin-top: 20px;
    }
    .preview-item {
    display: flex;
    align-items: center;
    padding: 10px;
    border: 1px solid #ddd;
    margin-bottom: 10px;
    border-radius: 4px;
    }
    .preview-item img {
    max-width: 100px;
    max-height: 100px;
    margin-right: 10px;
    }
    .preview-item .info {
    flex-grow: 1;
    }
    .url-area {
    margin-top: 10px;
    width: calc(100% - 20px);
    box-sizing: border-box;
    }
    .url-area textarea {
    width: 100%;
    min-height: 100px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.5);
    color: #333;       
    }
    .admin-link {
    background: #007BFF;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    text-decoration: none;
    color: #fff;     
    display: inline-block;
    margin-left: auto;
    }
    .admin-link:hover {
    text-decoration: underline;
    }
    .button-container {
    display: flex;
    align-items: center;
    margin: 15px 0;
    width: 100%;
    }
    .button-container button {
    margin-right: 10px;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    background: #007bff;
    color: white;
    cursor: pointer;
    }
    .button-container button:hover {
    background: #0056b3;
    }
    .progress-bar {
    height: 20px;
    background: #eee;
    border-radius: 10px;
    margin: 8px 0;
    overflow: hidden;
    position: relative;
    }
    .progress-track {
    height: 100%;
    background: #007bff;
    transition: width 0.3s ease;
    width: 0;
    }
    .progress-text {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
    }
    .success .progress-track {
    background: #28a745;
    }
    .error .progress-track {
    background: #dc3545;
    }

    /* 版权页脚 */
    footer {
    font-size: 0.85rem;
    width: 100%;
    text-align: center;
    margin: 0;
    }
    footer p {
    color: #7F7F7E;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    }
    /* 手机屏幕下居中 */
    @media (max-width: 768px) {
    footer p {
        justify-content: center;
    }
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