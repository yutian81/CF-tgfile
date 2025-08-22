// public/js/head.js

function addHeadContent() {
    // 添加描述
    const description = document.createElement('meta');
    description.name = 'description';
    description.content = 'Telegram文件存储与分享平台';
    document.head.appendChild(description);
  
    // 添加favicon
    const link = document.createElement('link');
    link.rel = 'shortcut icon';
    link.href = 'https://pan.811520.xyz/2025-02/1739241502-tgfile-favicon.ico';
    link.type = 'image/x-icon';
    document.head.appendChild(link);
  
    // 添加Font Awesome
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);
}

// 立即执行
addHeadContent();