// public/js/upload/main.js

import { initUploader } from './upload.js';

const uploader = initUploader({
    uploadAreaId: 'uploadArea',
    fileInputId: 'fileInput',
    previewAreaId: 'previewArea',
    urlAreaId: 'urlArea',
});

window.copyUrls = function(format){
    const urls = uploader.getUploadedUrls();
    let text = '';
    switch(format){
        case 'url': text = urls.join('\n'); break;
        case 'markdown': text = urls.map(u=>`![](${u})`).join('\n'); break;
        case 'html': text = urls.map(u=>`<img src="${u}" />`).join('\n'); break;
    }
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
};
