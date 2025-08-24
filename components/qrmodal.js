export const qrmodal = `
  <div id="qrModal" class="qr-modal">
    <div class="qr-content">
      <div id="qrcode"></div>
      <div class="qr-buttons">
        <button class="qr-copy" onclick="handleCopyUrl()">复制链接</button>
        <button class="qr-close" onclick="closeQRModal()">关闭</button>
      </div>
    </div>
  </div>
`;