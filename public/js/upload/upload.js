// public/js/upload/upload.js

import { formatSize } from '../file-size.js';

export async function initUploader({
    uploadAreaId,
    fileInputId,
    previewAreaId,
    urlAreaId,
    uploadUrl = '/api/upload',
}) {
    const uploadArea = document.getElementById(uploadAreaId);
    const fileInput = document.getElementById(fileInputId);
    const previewArea = document.getElementById(previewAreaId);
    const urlArea = document.getElementById(urlAreaId);
    let uploadedUrls = [];

    let maxSizeMB = 20;
    let maxSizeBytes = maxSizeMB * 1024 * 1024;

    // 获取服务器配置
    try {
        const res = await fetch('/api/check');
        if (res.ok) {
            const cfg = await res.json();
            if (cfg.maxSizeMB) {
                maxSizeMB = cfg.maxSizeMB;
                maxSizeBytes = maxSizeMB * 1024 * 1024;
            }
        }
    } catch (err) {
        console.error('[Check Config Error]', err);
    }

    // 阻止默认拖拽行为
    ['dragenter','dragover','dragleave','drop'].forEach(ev => {
        uploadArea.addEventListener(ev, preventDefaults);
        document.body.addEventListener(ev, preventDefaults);
    });
    function preventDefaults(e){ e.preventDefault(); e.stopPropagation(); }

    // 拖拽高亮
    ['dragenter','dragover'].forEach(ev => uploadArea.addEventListener(ev, () => uploadArea.classList.add('dragover')));
    ['dragleave','drop'].forEach(ev => uploadArea.addEventListener(ev, () => uploadArea.classList.remove('dragover')));

    // 点击选择文件
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFiles);
    uploadArea.addEventListener('drop', handleDrop);

    async function handleDrop(e){
        handleFiles({ target: { files: e.dataTransfer.files } });
    }

    // 粘贴上传
    document.addEventListener('paste', async e => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.kind === 'file') await uploadFile(item.getAsFile());
        }
    });

    async function handleFiles(e){
        const files = Array.from(e.target.files);
        for (let file of files) await uploadFile(file);
    }

    async function uploadFile(file){
        const preview = createPreview(file);
        previewArea.appendChild(preview);
        const progressText = preview.querySelector('.progress-text');
        const progressTrack = preview.querySelector('.progress-track');

        if (file.size > maxSizeBytes) {
            progressText.textContent = `✗ 文件 ${formatSize(file.size)} 超过 ${maxSizeMB}MB`;
            preview.classList.add('error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        return new Promise(resolve => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl, true);

            xhr.upload.onprogress = event => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    progressTrack.style.width = percent + '%';
                    progressText.textContent = percent + '%';
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        if (data.status === 1 && data.url) {
                            progressText.textContent = '✓ 上传成功';
                            uploadedUrls.push(data.url);
                            updateUrlArea();
                            preview.classList.add('success');
                        } else {
                            const errorMsg = [data.msg, data.error || '未知错误'].filter(Boolean).join(' | ');
                            progressText.textContent = `✗ ${errorMsg}`;
                            preview.classList.add('error');
                        }
                    } catch (err) {
                        progressText.textContent = '✗ 响应解析失败';
                        preview.classList.add('error');
                        console.error('[Upload Parse Error]', err);
                    }
                } else {
                    progressText.textContent = `✗ 上传失败 (${xhr.status})`;
                    preview.classList.add('error');
                }
                resolve();
            };

            xhr.onerror = () => {
                progressText.textContent = '✗ 上传失败';
                preview.classList.add('error');
                resolve();
            };

            xhr.send(formData);
        });
    }

    function createPreview(file){
        const div = document.createElement('div');
        div.className = 'preview-item';

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            div.appendChild(img);
        }

        const info = document.createElement('div');
        info.className = 'info';
        info.innerHTML = `
            <div>${file.name}</div>
            <div>${formatSize(file.size)} / ${maxSizeMB} MB</div>
            <div class="progress-bar">
                <div class="progress-track"></div>
                <span class="progress-text">0%</span>
            </div>
        `;
        div.appendChild(info);
        return div;
    }

    function updateUrlArea(){
        urlArea.value = uploadedUrls.join('\n');
    }

    return {
        getUploadedUrls: () => uploadedUrls,
    };
}
