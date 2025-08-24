export const uploadJS = `
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const urlArea = document.getElementById('urlArea');
let uploadedUrls = [];

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  uploadArea.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  uploadArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  uploadArea.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
  uploadArea.classList.add('dragover');
}

function unhighlight(e) {
  uploadArea.classList.remove('dragover');
}

uploadArea.addEventListener('drop', handleDrop, false);
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFiles);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles({ target: { files } });
}

document.addEventListener('paste', async (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile();
      await uploadFile(file);
    }
  }
});

async function handleFiles(e) {
  const response = await fetch('/config');
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }      
  const config = await response.json();
  const files = Array.from(e.target.files);
  for (let file of files) {
    if (file.size > config.maxSizeMB * 1024 * 1024) {
      alert(\`文件超过\${config.maxSizeMB}MB限制\`);
      return;
    }
    await uploadFile(file);
  }
}

async function uploadFile(file) {
  const preview = createPreview(file);
  previewArea.appendChild(preview);

  const xhr = new XMLHttpRequest();
  const progressTrack = preview.querySelector('.progress-track');
  const progressText = preview.querySelector('.progress-text');

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progressTrack.style.width = \`\${percent}%\`;
      progressText.textContent = \`\${percent}%\`;
    }
  });

  xhr.addEventListener('load', () => {
    try {
      const data = JSON.parse(xhr.responseText);
      const progressText = preview.querySelector('.progress-text');          
      if (xhr.status >= 200 && xhr.status < 300 && data.status === 1) {
        progressText.textContent = data.msg;
        uploadedUrls.push(data.url);
        updateUrlArea();
        preview.classList.add('success');
      } else {
        const errorMsg = [data.msg, data.error || '未知错误'].filter(Boolean).join(' | ');
        progressText.textContent = errorMsg;
        preview.classList.add('error');
      }
    } catch (e) {
      preview.querySelector('.progress-text').textContent = '✗ 响应解析失败';
      preview.classList.add('error');
    }
  });

  const formData = new FormData();
  formData.append('file', file);
  xhr.open('POST', '/upload');
  xhr.send(formData);
}

function createPreview(file) {
  const div = document.createElement('div');
  div.className = 'preview-item';
  
  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    div.appendChild(img);
  }

  const info = document.createElement('div');
  info.className = 'info';
  info.innerHTML = \`
    <div>\${file.name}</div>
    <div>\${formatSize(file.size)}</div>
    <div class="progress-bar">
      <div class="progress-track"></div>
      <span class="progress-text">0%</span>
    </div>
  \`;
  div.appendChild(info);

  return div;
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return \`\${size.toFixed(2)} \${units[unitIndex]}\`;
}

function updateUrlArea() {
  urlArea.value = uploadedUrls.join('\\n');
}

function copyUrls(format) {
  let text = '';
  switch (format) {
    case 'url':
      text = uploadedUrls.join('\\n');
      break;
    case 'markdown':
      text = uploadedUrls.map(url => \`![](\${url})\`).join('\\n');
      break;
    case 'html':
      text = uploadedUrls.map(url => \`<img src="\${url}" />\`).join('\\n');
      break;
  }
  navigator.clipboard.writeText(text);
  alert('已复制到剪贴板');
}
`;
