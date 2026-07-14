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
            name: name,
            price: price
        });

        save();
        render();
        form.reset();
        nameInput.focus();
        toast('Added "' + name + '"');
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
        var copy = items.slice();
        if (sortMode === 'highToLow') copy.sort(function(a, b) { return b.price - a.price; });
        else if (sortMode === 'lowToHigh') copy.sort(function(a, b) { return a.price - b.price; });
        else copy.sort(function(a, b) { return a.name.localeCompare(b.name); });
        return copy;
    }

    function toggleSearch() {
        var open = searchWrap.classList.toggle('open');
        searchToggle.classList.toggle('active', open);
        if (open) setTimeout(function() { searchInput.focus(); }, 250);
        else { searchInput.value = ''; render(); }
    }

    function filtered(list) {
        var q = searchInput.value.toLowerCase().trim();
        if (!q) return list;
        return list.filter(function(i) { return i.name.toLowerCase().indexOf(q) !== -1; });
    }

    function render() {
        var all = filtered(sorted());

        listEl.innerHTML = '';

        if (items.length === 0) {
            emptyEl.classList.remove('hidden');
            toolbar.style.display = 'none';
        } else {
            emptyEl.classList.add('hidden');
            toolbar.style.display = '';

            if (all.length === 0) {
                var noResults = document.createElement('div');
                noResults.style.cssText = 'padding:32px;text-align:center;color:var(--text-muted);font-size:0.85rem;';
                noResults.textContent = 'No results found';
                listEl.appendChild(noResults);
            } else {
                for (var i = 0; i < all.length; i++) {
                    listEl.appendChild(createRow(all[i], i));
                }
            }
        }

        updateStats();
    }

    function createRow(item, index) {
        var row = document.createElement('div');
        row.className = 'item-row';
        row.style.animationDelay = (index * 0.03) + 's';

        var editBtn = document.createElement('button');
        editBtn.className = 'item-edit';
        editBtn.title = 'Edit';
        editBtn.setAttribute('data-id', item.id);
        editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openEditModal(item.id);
        });

        var details = document.createElement('div');
        details.className = 'item-details';

        var nameEl = document.createElement('div');
        nameEl.className = 'item-name';
        nameEl.textContent = item.name;
        nameEl.title = item.name;
        details.appendChild(nameEl);

        var priceEl = document.createElement('div');
        priceEl.className = 'item-price';
        priceEl.textContent = '$' + item.price.toFixed(2);

        var delBtn = document.createElement('button');
        delBtn.className = 'item-delete';
        delBtn.title = 'Delete';
        delBtn.setAttribute('data-id', item.id);
        delBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        delBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteTargetId = item.id;
            modalItemName.textContent = '"' + item.name + '"';
            modalItemPrice.textContent = '$' + item.price.toFixed(2);
            openModal(deleteModal);
        });

        row.appendChild(editBtn);
        row.appendChild(details);
        row.appendChild(priceEl);
        row.appendChild(delBtn);

        return row;
    }

    function openEditModal(id) {
        var item = null;
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === id) { item = items[i]; break; }
        }
        if (!item) return;
        editTargetId = id;
        editNameInput.value = item.name;
        editPriceInput.value = item.price;
        openModal(editModal);
        setTimeout(function() { editNameInput.focus(); }, 300);
    }

    function onConfirmEdit(e) {
        e.preventDefault();
        if (!editTargetId) return;

        var name = editNameInput.value.trim();
        var price = parseFloat(editPriceInput.value);

        if (!name) { toast('Enter an item name', true); editNameInput.focus(); return; }
        if (isNaN(price) || price < 0) { toast('Enter a valid price', true); editPriceInput.focus(); return; }

        for (var i = 0; i < items.length; i++) {
            if (items[i].id === editTargetId) {
                items[i].name = name;
                items[i].price = price;
                break;
            }
        }

        save();
        render();
        toast('"' + name + '" updated');
        editTargetId = null;
        closeModal(editModal);
    }

    function onConfirmDelete() {
        if (!deleteTargetId) return;
        var item = null;
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === deleteTargetId) { item = items[i]; break; }
        }
        var name = item ? item.name : 'Item';

        var rows = listEl.querySelectorAll('.item-row');
        for (var r = 0; r < rows.length; r++) {
            var btn = rows[r].querySelector('.item-delete');
            if (btn && btn.getAttribute('data-id') === deleteTargetId) {
                rows[r].classList.add('removing');
            }
        }

        setTimeout(function() {
            items = items.filter(function(i) { return i.id !== deleteTargetId; });
            deleteTargetId = null;
            save();
            closeModal(deleteModal);
            render();
            toast('"' + name + '" deleted');
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
        var count = items.length;
        var total = 0;
        for (var i = 0; i < items.length; i++) {
            total += items[i].price;
        }

        itemCountEl.textContent = count;
        totalEl.textContent = '$' + total.toFixed(2);
    }

    function openModal(el) {
        el.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(el) {
        el.classList.remove('open');
        document.body.style.overflow = '';
    }

    function toast(msg, isError) {
        clearTimeout(toastTimer);
        toastEl.classList.remove('show', 'error');
        toastMsg.textContent = msg;
        if (isError) toastEl.classList.add('error');
        void toastEl.offsetHeight;
        toastEl.classList.add('show');
        toastTimer = setTimeout(function() { toastEl.classList.remove('show'); }, 2400);
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: items, sortMode: sortMode }));
        } catch (e) {}
    }

    function load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var data = JSON.parse(raw);
                items = data.items || [];
                sortMode = data.sortMode || 'highToLow';
                Object.keys(sortBtns).forEach(function(k) {
                    sortBtns[k].classList.toggle('active', k === sortMode);
                });
            }
        } catch (e) {
            items = [];
        }
    }

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }
})();