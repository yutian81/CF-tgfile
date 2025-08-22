// public/js/preview.js

// public/js/preview.js

export function getPreviewHtml(url) {
    const ext = (url.split('.').pop() || '').toLowerCase();

    const isImage = ['jpg','jpeg','png','gif','webp','svg','icon'].includes(ext);
    const isVideo = ['mp4','webm'].includes(ext);
    const isAudio = ['mp3','wav','ogg'].includes(ext);

    const faIcons = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'ppt': 'fa-file-powerpoint',
        'pptx': 'fa-file-powerpoint',
        'zip': 'fa-file-zipper',
        'rar': 'fa-file-zipper',
        '7z': 'fa-file-zipper',
        'txt': 'fa-file-lines',
        'md': 'fa-file-lines',
        'csv': 'fa-file-csv'
    };

    if (isImage) return `<img src="${url}" alt="预览">`;
    if (isVideo) return `<video src="${url}" controls></video>`;
    if (isAudio) return `<audio src="${url}" controls></audio>`;
    if (faIcons[ext]) return `<div class="fa-4x"><i class="fa-solid ${faIcons[ext]}"></i></div>`;

    // 其他未知类型
    return `<div class="fa-4x"><i class="fa-solid fa-file"></i> ${ext.toUpperCase()}</div>`;
}
