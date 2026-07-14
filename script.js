(function () {
    'use strict';

    const STORAGE_KEY = 'pricelist_pro_data';
    let items = [];
    let sortMode = 'highToLow';
    let deleteTargetId = null;
    let editTargetId = null;
    let toastTimer = null;

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

    const editModal = $('#editModal');
    const editForm = $('#editForm');
    const editNameInput = $('#editName');
    const editPriceInput = $('#editPrice');
    const cancelEditBtn = $('#cancelEdit');

    const toastEl = $('#toast');
    const toastMsg = $('#toastMsg');

    load();
    render();
    bindEvents();

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

        cancelEditBtn.addEventListener('click', () => closeModal(editModal));
        editForm.addEventListener('submit', onConfirmEdit);

        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeModal(deleteModal);
        });
        clearModal.addEventListener('click', (e) => {
            if (e.target === clearModal) closeModal(clearModal);
        });
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeModal(editModal);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal(deleteModal);
                closeModal(clearModal);
                closeModal(editModal);
            }
        });
    }

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
        });

        save();
        render();
        form.reset();
        nameInput.focus();
        toast(`Added "${name}"`);
    }

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

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'item-edit';
        editBtn.title = 'Edit';
        editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(item.id);
        });

        // Details
        const details = document.createElement('div');
        details.className = 'item-details';

        const nameEl = document.createElement('div');
        nameEl.className = 'item-name';
        nameEl.textContent = item.name;
        nameEl.title = item.name;
        details.appendChild(nameEl);

        // Price
        const priceEl = document.createElement('div');
        priceEl.className = 'item-price';
        priceEl.textContent = '$' + item.price.toFixed(2);

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'item-delete';
        delBtn.title = 'Delete';
        delBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTargetId = item.id;
            modalItemName.textContent = `"${item.name}"`;
            modalItemPrice.textContent = '$' + item.price.toFixed(2);
            openModal(deleteModal);
        });

        row.appendChild(editBtn);
        row.appendChild(details);
        row.appendChild(priceEl);
        row.appendChild(delBtn);

        return row;
    }

    // ---- Edit ----
    function openEditModal(id) {
        const item = items.find((i) => i.id === id);
        if (!item) return;
        editTargetId = id;
        editNameInput.value = item.name;
        editPriceInput.value = item.price;
        openModal(editModal);
        setTimeout(() => editNameInput.focus(), 300);
    }

    function onConfirmEdit(e) {
        e.preventDefault();
        if (!editTargetId) return;

        const name = editNameInput.value.trim();
        const price = parseFloat(editPriceInput.value);

        if (!name) { toast('Enter an item name', true); editNameInput.focus(); return; }
        if (isNaN(price) || price < 0) { toast('Enter a valid price', true); editPriceInput.focus(); return; }

        const item = items.find((i) => i.id === editTargetId);
        if (item) {
            item.name = name;
            item.price = price;
            save();
            render();
            toast(`"${name}" updated`);
        }

        editTargetId = null;
        closeModal(editModal);
    }

    // ---- Delete ----
    function onConfirmDelete() {
        if (!deleteTargetId) return;
        const item = items.find((i) => i.id === deleteTargetId);
        const name = item ? item.name : 'Item';

        const rows = listEl.querySelectorAll('.item-row');
        rows.forEach((row) => {
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

    function onConfirmClear() {
        items = [];
        save();
        closeModal(clearModal);
        render();
        toast('All items cleared');
    }

    function updateStats() {
        const count = items.length;
        const total = items.reduce((s, i) => s + i.price, 0);
        const avg = count > 0 ? total / count : 0;

        itemCountEl.textContent = count;
        totalEl.textContent = '$' + total.toFixed(2);
        avgEl.textContent = '$' + avg.toFixed(2);
    }

    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    function toast(msg, isError = false) {
        clearTimeout(toastTimer);
        toastEl.classList.remove('show', 'error');
        toastMsg.textContent = msg;
        if (isError) toastEl.classList.add('error');
        void toastEl.offsetHeight;
        toastEl.classList.add('show');
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, sortMode }));
        } catch (e) { /* silent */ }
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

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
})();