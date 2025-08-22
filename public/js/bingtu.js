// public/js/bingtu.js

// 设置背景图
async function setBingBackground() {
    document.body.style.backgroundColor = '#f5f5f5'; // 默认背景颜色

    try {
      const response = await fetch('/bing', { cache: 'no-store' }); // 禁用缓存
      const data = await response.json();
      if (data.status && data.data && data.data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.data.length);
        document.body.style.backgroundImage = `url(${data.data[randomIndex].url})`;
      }
    } catch (error) {
      console.error('获取背景图失败:', error);
      document.body.style.backgroundColor = '#f5f5f5';
    }
}

// 自动执行函数，每小时更新一次
function initBingBackground(interval = 3600000) {
    setBingBackground();
    setInterval(setBingBackground, interval);
}

// 自动执行
initBingBackground();
