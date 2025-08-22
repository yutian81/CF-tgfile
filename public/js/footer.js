// public/js/footer.js

function addFooterContent() {
  // 创建footer容器
  const footer = document.createElement('footer');
  
  // 添加页脚内容
  footer.innerHTML = `
    <p>
      <span><i class="fas fa-copyright"></i> 2025 Copyright by Yutian81</span><span>|</span>
      <a href="https://github.com/yutian81/CF-tgfile" target="_blank">
      <i class="fab fa-github"></i> Github</a><span>|</span>
      <a href="https://blog.811520.xyz/" target="_blank">
      <i class="fas fa-blog"></i> 青云志博客</a>
    </p>
  `;

  // 判断页面是否有 .up-container，用于 upload 页面
  const container = document.querySelector('.up-container');
  if (container) {
      container.appendChild(footer); // 插入到容器内
  } else {
      document.body.appendChild(footer); // 默认插入 body 末尾
  }
}

// 确保DOM已加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addFooterContent);
} else {
  addFooterContent();
}
