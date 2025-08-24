export const setbing = `
  async function setBingBackground() {
    try {
      const response = await fetch('/bing', { cache: 'no-store' });
      const data = await response.json();
      if (data.status && data.data && data.data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.data.length);
        document.body.style.backgroundImage = \`url(\${data.data[randomIndex].url})\`;
      }
    } catch (error) {
      console.error('获取背景图失败:', error);
    }
  }
  // 页面加载时设置背景图
  setBingBackground();
  // 每小时更新一次背景图
  setInterval(setBingBackground, 3600000);
`;