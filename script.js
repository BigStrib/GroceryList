(function () {
    'use strict';

    // ---- State ----
    const STORAGE_KEY = 'pricelist_pro_data';
    let items = [];
    let sortMode = 'highToLow';
    let deleteTargetId = null;
    let toastTimer = null;

    // ---- DOM Refs ----
    const $ = (s) => document.querySelector(s);
    const form = $('#itemForm');
    const nameInput = $('#itemName');
    const priceInput = $('#itemPrice');
    const listEl = $('#itemsList');
    const emptyEl = $('#emptyState');
    const itemCountEl = $('#itemCount');
    const totalEl = $('#totalValue');
    const avgEl = $('#avgValue');

    const sortBtns = {
        highToLow: $('#sortHighLow'),
        lowToHigh: $('#sortLowHigh'),
        alpha: $('#sortAlpha'),
    };

    const toolbar = $('#toolbar');
    const searchToggle = $('#searchToggle');
    const searchWrap = $('#searchWrap');
    const searchInput = $('#searchInput');
    const clearSearch = $('#clearSearch');

    const clearAllBtn = $('#clearAllBtn');
    const deleteModal = $('#deleteModal');
    const modalItemName = $('#modalItemName');
    const modalItemPrice = $('#modalItemPrice');
    const confirmDeleteBtn = $('#confirmDelete');
    const cancelDeleteBtn = $('#cancelDelete');

    const clearModal = $('#clearModal');
    const clearCountEl = $('#clearCount');
    const confirmClearBtn = $('#confirmClear');
    const cancelClearBtn = $('#cancelClear');

    const toastEl = $('#toast');
    const toastMsg = $('#toastMsg');

    // ---- Init ----
    load();
    render();
    bindEvents();

    // ---- Events ----
    function bindEvents() {
        form.addEventListener('submit', onAdd);

        Object.keys(sortBtns).forEach((key) => {
            sortBtns[key].addEventListener('click', () => setSort(key));
        });

        searchToggle.addEventListener('click', toggleSearch);
        searchInput.addEventListener('input', render);
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            render();
            searchInput.focus();
        });

        clearAllBtn.addEventListener('click', () => {
            if (items.length === 0) return toast('Nothing to clear', true);
            clearCountEl.textContent = items.length;
            openModal(clearModal);
        });

        cancelDeleteBtn.addEventListener('click', () => closeModal(deleteModal));
        confirmDeleteBtn.addEventListener('click', onConfirmDelete);

        cancelClearBtn.addEventListener('click', () => closeModal(clearModal));
        confirmClearBtn.addEventListener('click', onConfirmClear);

        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeModal(deleteModal);
        });
        clearModal.addEventListener('click', (e) => {
            if (e.target === clearModal) closeModal(clearModal);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal(deleteModal);
                closeModal(clearModal);
            }
        });
    }

    // ---- Add ----
    function onAdd(e) {
        e.preventDefault();
        const name = nameInput.value.trim();
        const price = parseFloat(priceInput.value);

        if (!name) { toast('Enter an item name', true); nameInput.focus(); return; }
        if (isNaN(price) || price < 0) { toast('Enter a valid price', true); priceInput.focus(); return; }

        items.push({
            id: uid(),
            name,
            price,
            date: new Date().toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            })
        });

        save();
        render();
        form.reset();
        nameInput.focus();
        toast(`Added "${name}"`);
    }

    // ---- Sort ----
    function setSort(mode) {
        sortMode = mode;
        Object.keys(sortBtns).forEach((k) =>
            sortBtns[k].classList.toggle('active', k === mode)
        );
        save();
        render();
    }

    function sorted() {
        const copy = [...items];
        if (sortMode === 'highToLow') copy.sort((a, b) => b.price - a.price);
        else if (sortMode === 'lowToHigh') copy.sort((a, b) => a.price - b.price);
        else copy.sort((a, b) => a.name.localeCompare(b.name));
        return copy;
    }

    // ---- Search ----
    function toggleSearch() {
        const open = searchWrap.classList.toggle('open');
        searchToggle.classList.toggle('active', open);
        if (open) setTimeout(() => searchInput.focus(), 250);
        else { searchInput.value = ''; render(); }
    }

    function filtered(list) {
        const q = searchInput.value.toLowerCase().trim();
        if (!q) return list;
        return list.filter((i) => i.name.toLowerCase().includes(q));
    }

    // ---- Render ----
    function render() {
        const all = filtered(sorted());

        listEl.innerHTML = '';

        if (items.length === 0) {
            emptyEl.classList.remove('hidden');
            toolbar.style.display = 'none';
        } else {
            emptyEl.classList.add('hidden');
            toolbar.style.display = '';

            if (all.length === 0) {
                listEl.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No results found</div>';
            } else {
                all.forEach((item, i) => listEl.appendChild(createRow(item, i)));
            }
        }

        updateStats();
    }

    function createRow(item, index) {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.style.animationDelay = `${index * 0.03}s`;

        const num = document.createElement('div');
        num.className = 'item-number' + (index < 3 && items.length > 2 ? ' top' : '');
        num.textContent = index + 1;

        const details = document.createElement('div');
        details.className = 'item-details';

        const nameEl = document.createElement('div');
        nameEl.className = 'item-name';
        nameEl.textContent = item.name;
        nameEl.title = item.name;

        const dateEl = document.createElement('div');
        dateEl.className = 'item-date';
        dateEl.textContent = item.date;

        details.appendChild(nameEl);
        details.appendChild(dateEl);

        const priceEl = document.createElement('div');
        priceEl.className = 'item-price';
        priceEl.textContent = '$' + item.price.toFixed(2);

        const delBtn = document.createElement('button');
        delBtn.className = 'item-delete';
        delBtn.title = 'Delete';
        delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTargetId = item.id;
            modalItemName.textContent = `"${item.name}"`;
            modalItemPrice.textContent = '$' + item.price.toFixed(2);
            openModal(deleteModal);
        });

        row.appendChild(num);
        row.appendChild(details);
        row.appendChild(priceEl);
        row.appendChild(delBtn);

        // Swipe to reveal delete on mobile
        let startX = 0, moved = false;
        row.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; moved = false; }, { passive: true });
        row.addEventListener('touchmove', (e) => {
            const dx = startX - e.touches[0].clientX;
            if (dx > 8) moved = true;
            if (dx > 0 && dx < 90) {
                row.style.transform = `translateX(-${dx}px)`;
                row.style.transition = 'none';
            }
        }, { passive: true });
        row.addEventListener('touchend', () => {
            row.style.transition = '';
            row.style.transform = '';
            if (moved && startX - (event?.changedTouches?.[0]?.clientX ?? startX) > 70) {
                deleteTargetId = item.id;
                modalItemName.textContent = `"${item.name}"`;
                modalItemPrice.textContent = '$' + item.price.toFixed(2);
                openModal(deleteModal);
            }
        });

        return row;
    }

    // ---- Delete ----
    function onConfirmDelete() {
        if (!deleteTargetId) return;
        const item = items.find((i) => i.id === deleteTargetId);
        const name = item ? item.name : 'Item';

        // Find and animate the row
        const rows = listEl.querySelectorAll('.item-row');
        rows.forEach((row) => {
            const btn = row.querySelector('.item-delete');
            // Match by name comparison since we can't store id on the row easily
            if (row.querySelector('.item-name')?.textContent === item?.name) {
                row.classList.add('removing');
            }
        });

        setTimeout(() => {
            items = items.filter((i) => i.id !== deleteTargetId);
            deleteTargetId = null;
            save();
            closeModal(deleteModal);
            render();
            toast(`"${name}" deleted`);
        }, 280);
    }

    // ---- Clear All ----
    function onConfirmClear() {
        items = [];
        save();
        closeModal(clearModal);
        render();
        toast('All items cleared');
    }

    // ---- Stats ----
    function updateStats() {
        const count = items.length;
        const total = items.reduce((s, i) => s + i.price, 0);
        const avg = count > 0 ? total / count : 0;

        itemCountEl.textContent = count;
        totalEl.textContent = '$' + total.toFixed(2);
        avgEl.textContent = '$' + avg.toFixed(2);
    }

    // ---- Modals ----
    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    // ---- Toast ----
    function toast(msg, isError = false) {
        clearTimeout(toastTimer);
        toastEl.classList.remove('show', 'error');
        toastMsg.textContent = msg;
        if (isError) toastEl.classList.add('error');

        // Force reflow
        void toastEl.offsetHeight;
        toastEl.classList.add('show');

        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
    }

    // ---- Storage ----
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, sortMode }));
        } catch (e) { /* quota exceeded or private mode */ }
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                items = data.items || [];
                sortMode = data.sortMode || 'highToLow';
                Object.keys(sortBtns).forEach((k) =>
                    sortBtns[k].classList.toggle('active', k === sortMode)
                );
            }
        } catch (e) {
            items = [];
        }
    }

    // ---- Utils ----
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
})();