// public/js/pagination.js

export function setupPagination(fileGrid, searchInput, itemsPerPage = 15) {
    let currentPage = 1;
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination';
    fileGrid.parentNode.insertBefore(paginationContainer, fileGrid.nextSibling);

    function getFilteredCards() {
        const term = searchInput.value.toLowerCase();
        const fileCards = Array.from(fileGrid.children);
        return fileCards.filter(card => {
            const name = card.querySelector('.file-info div:first-child').textContent.toLowerCase();
            return name.includes(term);
        });
    }

    function renderPage(page) {
        const filteredCards = getFilteredCards();
        const totalPages = Math.ceil(filteredCards.length / itemsPerPage) || 1;

        if (page > totalPages) currentPage = totalPages;
        if (page < 1) currentPage = 1;

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;

        filteredCards.forEach(c => c.style.display = 'none');
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

    return {
        render: () => renderPage(currentPage),
        refresh: () => renderPage(currentPage)
    };
}
