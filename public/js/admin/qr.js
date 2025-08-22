export function createQRModal() {
  if (document.getElementById('qrModal')) return; // 已存在就不再创建
  const modalHtml = `
    <div id="qrModal" class="qr-modal">
      <div class="qr-content">
        <div id="qrcode"></div>
        <div class="qr-buttons">
          <button class="qr-copy">复制链接</button>
          <button class="qr-close">关闭</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 绑定关闭按钮
  const modal = document.getElementById('qrModal');
  modal.querySelector('.qr-close').addEventListener('click', () => {
      modal.style.display = 'none';
  });
}

let currentShareUrl = '';

// 显示二维码
export function showQRCode(url) {
  createQRModal();
  currentShareUrl = url;

  const modal = document.getElementById('qrModal');
  const qrcodeDiv = modal.querySelector('#qrcode');
  const copyBtn = modal.querySelector('.qr-copy');

  copyBtn.textContent = '复制链接';
  copyBtn.disabled = false;

  // 清空上次二维码
  qrcodeDiv.innerHTML = '';
  new QRCode(qrcodeDiv, { 
    text: url, 
    width: 200, 
    height: 200, 
    colorDark: "#000", 
    colorLight: "#fff", 
    correctLevel: QRCode.CorrectLevel.H 
  });

  modal.style.display = 'flex';

  // 绑定复制事件
  copyBtn.onclick = () => handleCopyUrl(copyBtn);
}

// 复制链接
export function handleCopyUrl(copyBtn) {
  navigator.clipboard.writeText(currentShareUrl).then(() => {
      copyBtn.textContent = '✔ 已复制';
      copyBtn.disabled = true;
      setTimeout(() => {
          copyBtn.textContent = '复制链接';
          copyBtn.disabled = false;
      }, 3000);
  }).catch(() => alert('复制失败，请手动复制'));
}

// 关闭二维码
export function closeQRModal() {
  const modal = document.getElementById('qrModal');
  if (modal) modal.style.display = 'none';
}

// 绑定点击空白关闭
export function bindQRModalClose() {
  window.addEventListener('click', (event) => {
      const modal = document.getElementById('qrModal');
      if (modal && event.target === modal) modal.style.display = 'none';
  });
}
