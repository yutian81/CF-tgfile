export const adminJS = `
const itemsPerPage = 15; 
let currentPage = 1;

const fileGrid = document.getElementById('fileGrid');
const searchInput = document.getElementById('searchInput');
let fileCards = Array.from(fileGrid.children);

const paginationContainer = document.createElement('div');
paginationContainer.id = 'pagination';
fileGrid.parentNode.insertBefore(paginationContainer, fileGrid.nextSibling);

function getFilteredCards() {
  const term = searchInput.value.toLowerCase();
  return fileCards.filter(card => {
    const name = card.querySelector('.file-info div:first-child').textContent.toLowerCase();
    return name.includes(term);
  });
}

function renderPage(page) {
  const filteredCards = getFilteredCards();
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage) || 1;
  if (page > totalPages) currentPage = totalPages;
  if (page > totalPages) currentPage = totalPages;
  if (page < 1) currentPage = 1;

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;

  fileCards.forEach(c => c.style.display = 'none');
  filteredCards.slice(start, end).forEach(c => c.style.display = '');

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  paginationContainer.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '上一页';
  prevBtn.className = 'btn-page';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => { currentPage--; renderPage(currentPage); };
  paginationContainer.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'btn-page' + (i === currentPage ? ' active' : '');
    btn.onclick = () => { currentPage = i; renderPage(currentPage); };
    paginationContainer.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '下一页';
  nextBtn.className = 'btn-page';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => { currentPage++; renderPage(currentPage); };
  paginationContainer.appendChild(nextBtn);
}

searchInput.addEventListener('input', () => {
  currentPage = 1;
  renderPage(currentPage);
});

let currentShareUrl = '';
function showQRCode(url) {
  currentShareUrl = url;
  const modal = document.getElementById('qrModal');
  const qrcodeDiv = document.getElementById('qrcode');
  const copyBtn = document.querySelector('.qr-copy');
  copyBtn.textContent = '复制链接';
  copyBtn.disabled = false;
  qrcodeDiv.innerHTML = '';
  new QRCode(qrcodeDiv, { text: url, width: 200, height: 200, colorDark: "#000", colorLight: "#fff", correctLevel: QRCode.CorrectLevel.H });
  modal.style.display = 'flex';
}

function handleCopyUrl() {
  navigator.clipboard.writeText(currentShareUrl).then(() => {
    const copyBtn = document.querySelector('.qr-copy');
    copyBtn.textContent = '✔ 已复制';
    copyBtn.disabled = true;
    setTimeout(() => { copyBtn.textContent = '复制链接'; copyBtn.disabled = false; }, 5000);
  }).catch(() => alert('复制失败，请手动复制'));
}

function closeQRModal() {
  document.getElementById('qrModal').style.display = 'none';
}

window.onclick = (event) => {
  const modal = document.getElementById('qrModal');
  if (event.target === modal) modal.style.display = 'none';
}

async function deleteFile(url) {
  if (!confirm('确定要删除这个文件吗？')) return;
  try {
    const response = await fetch('/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '删除失败');
    }
    const card = document.querySelector(\`[data-url="\${url}"]\`);
    if (card) card.remove();
    fileCards = Array.from(fileGrid.children);
    renderPage(currentPage);
    alert('文件删除成功');
  } catch (err) {
    alert('文件删除失败: ' + err.message);
  }
}

renderPage(currentPage);
`;