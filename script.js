// ==================== SESSION & GLOBAL STATE ====================
let products = JSON.parse(localStorage.getItem('inventoryProducts')) || [];
let cart = [];
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let backendConfig = JSON.parse(localStorage.getItem('backendConfig')) || {
    backendUrl: '', apiEndpoint: '/api/inventory', syncInterval: 5, sheetsUrl: '', autoSync: false
};
let posSettings = JSON.parse(localStorage.getItem('posSettings')) || {
    name: 'AL DAR POS', storeName: '', address: '', phone: '', trn: '', currency: '₨'
};
let qrScanning = false;
let qrStream = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    initializeApp();
});

function checkAuthentication() {
    if (!sessionStorage.getItem('userSession')) {
        window.location.href = 'login.html';
    }
}

function initializeApp() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    displayProducts();
    setupBarcodeScanner();
    setupProductSearch();
    loadTransactionsFromStorage();
    loadBackendConfig();
    updateUserDisplay();
    applyPOSSettings();
}

function updateDateTime() {
    const el = document.getElementById('dateTime');
    if (!el) return;
    const now = new Date();
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    el.textContent = now.toLocaleString('en-US', options);
}

function updateUserDisplay() {
    const session = sessionStorage.getItem('userSession');
    const el = document.getElementById('userDisplay');
    if (session && el) {
        const user = JSON.parse(session);
        el.textContent = user.name || user.username;
    }
}

function applyPOSSettings() {
    const titleEl = document.getElementById('posTitle');
    const name = (posSettings?.name || 'AL DAR POS').trim();
    if (titleEl) titleEl.textContent = `📦 ${name}`;
    document.title = name;
}

// ==================== NAVIGATION ====================
function hideAllPages() {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

function updateNavButtons(label) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.textContent.includes(label)) btn.classList.add('active');
    });
}

function showOverviewPage() {
    hideAllPages();
    document.getElementById('overviewPage').classList.add('active');
    updateNavButtons('Overview');
    createSalesChart();
    loadTopProducts();
}

function showPOSPage() {
    hideAllPages();
    document.getElementById('posPage').classList.add('active');
    updateNavButtons('POS');
    displayProducts();
}

function showInventoryPage() {
    hideAllPages();
    document.getElementById('inventoryPage').classList.add('active');
    updateNavButtons('Inventory');
    updateInventoryDashboard();
    populateCategoryFilter();
    displayInventoryTable();
}

function showCustomersPage() {
    hideAllPages();
    document.getElementById('customersPage').classList.add('active');
    updateNavButtons('Customers');
    displayCustomersTable();
}

function showSettingsPage() {
    hideAllPages();
    document.getElementById('settingsPage').classList.add('active');
    updateNavButtons('Settings');

    // Populate fields
    document.getElementById('settingStoreName').value = posSettings.storeName || '';
    document.getElementById('settingPosName').value = posSettings.name || '';
    document.getElementById('settingStoreAddress').value = posSettings.address || '';
    document.getElementById('settingStorePhone').value = posSettings.phone || '';
    document.getElementById('settingStoreTRN').value = posSettings.trn || '';
    document.getElementById('settingCurrency').value = posSettings.currency || '₨';
}

// ==================== INVENTORY LOGIC ====================
function updateInventoryDashboard() {
    const totalCount = products.length;
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 10)).length;
    const outOfStockCount = products.filter(p => p.stock <= 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('inventoryTotalCount', totalCount);
    set('inventoryLowStockCount', lowStockCount);
    set('inventoryOutOfStockCount', outOfStockCount);
    set('inventoryTotalValue', (posSettings.currency || '₨') + ' ' + totalValue.toLocaleString());
}

function displayInventoryTable(filteredItems) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    const items = filteredItems || products;
    tbody.innerHTML = items.length ? items.map(p => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:12px;">
                    <span style="font-size:24px;">${p.icon || '📦'}</span>
                    <div><div style="font-weight:700;">${p.name}</div><div style="font-size:11px;">#${p.id}</div></div>
                </div>
            </td>
            <td><div style="font-size:12px;">B: ${p.barcode}</div><div style="font-size:12px;">S: ${p.sku}</div></td>
            <td>${p.category || 'General'}</td>
            <td>${posSettings.currency || '₨'} ${p.price.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td><span class="stock-badge ${p.stock <= 0 ? 'out' : (p.stock <= (p.minStock || 10) ? 'low' : 'good')}">${p.stock <= 0 ? 'Out' : (p.stock <= (p.minStock || 10) ? 'Low' : 'In')}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="editProduct(${p.id})">✏️</button>
                    <button class="btn-icon" onclick="deleteProduct(${p.id})">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;">No products found.</td></tr>';
}

function filterInventory() {
    const term = document.getElementById('inventorySearch').value.toLowerCase();
    const cat = document.getElementById('inventoryCategoryFilter').value;
    const filtered = products.filter(p =>
        (p.name.toLowerCase().includes(term) || p.barcode.includes(term) || (p.sku && p.sku.toLowerCase().includes(term))) &&
        (!cat || p.category === cat)
    );
    displayInventoryTable(filtered);
}

function populateCategoryFilter() {
    const filter = document.getElementById('inventoryCategoryFilter');
    if (!filter) return;
    const cats = [...new Set(products.map(p => p.category).filter(c => c))];
    filter.innerHTML = '<option value="">All Categories</option>' + cats.sort().map(c => `<option value="${c}">${c}</option>`).join('');
}

// ==================== POS LOGIC ====================
function displayProducts(filterText = '') {
    const grid = document.getElementById('productList');
    if (!grid) return;
    const filtered = products.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()) || p.barcode.includes(filterText));
    grid.innerHTML = filtered.map(p => `
        <div class="product-card ${p.stock <= 0 ? 'out-of-stock' : ''}" onclick="addToCart(${p.id})">
            <div class="product-icon">${p.icon || '📦'}</div>
            <div class="product-name">${p.name}</div>
            <div class="product-price">${posSettings.currency || '₨'} ${p.price.toFixed(2)}</div>
            <div class="product-stock">Stock: ${p.stock}</div>
        </div>
    `).join('');
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.quantity < product.stock) existing.quantity++;
        else showNotification('Out of stock limit reached!', 'warning');
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    container.innerHTML = cart.length ? cart.map((item, idx) => `
        <div class="cart-item">
            <div>${item.name}</div>
            <div class="cart-item-quantity">
                <button onclick="changeQty(${idx}, -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="changeQty(${idx}, 1)">+</button>
            </div>
            <div>${posSettings.currency} ${(item.price * item.quantity).toFixed(2)}</div>
            <button onclick="removeFromCart(${idx})">×</button>
        </div>
    `).join('') : '<div class="empty-cart">Cart is empty</div>';
    updateCartSummary();
}

function changeQty(idx, delta) {
    const item = cart[idx];
    const product = products.find(p => p.id === item.id);
    if (delta > 0 && item.quantity >= product.stock) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart.splice(idx, 1);
    updateCartDisplay();
}

function removeFromCart(idx) { cart.splice(idx, 1); updateCartDisplay(); }
function clearCart() { cart = []; updateCartDisplay(); }

function updateCartSummary() {
    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const total = subtotal; // Simplified for now
    document.getElementById('subtotal').textContent = `${posSettings.currency} ${subtotal.toFixed(2)}`;
    document.getElementById('total').textContent = `${posSettings.currency} ${total.toFixed(2)}`;
}

// ==================== PRODUCT CRUD ====================
function showAddProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('editProductId').value = '';
    document.getElementById('formTitle').textContent = '➕ Add New Product';
    document.getElementById('productFormModal').style.display = 'block';
}

function editProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('productName').value = p.name;
    document.getElementById('productSKU').value = p.sku || '';
    document.getElementById('productBarcode').value = p.barcode || '';
    document.getElementById('productCategory').value = p.category || 'Other';
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productStock').value = p.stock;
    document.getElementById('editProductId').value = id;
    document.getElementById('formTitle').textContent = '✏️ Edit Product';
    document.getElementById('productFormModal').style.display = 'block';
}

function saveProduct(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('editProductId').value;
    const data = {
        name: document.getElementById('productName').value,
        sku: document.getElementById('productSKU').value,
        barcode: document.getElementById('productBarcode').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        lastRestocked: new Date().toISOString()
    };
    if (id) {
        const idx = products.findIndex(p => p.id === parseInt(id));
        products[idx] = { ...products[idx], ...data };
    } else {
        products.push({ ...data, id: Date.now() });
    }
    saveInventory();
    showInventoryPage(); // Refresh
    closeProductForm();
    showNotification('Product saved!', 'success');
}

function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    products = products.filter(p => p.id !== id);
    saveInventory();
    showInventoryPage();
    showNotification('Product deleted.', 'warning');
}

function closeProductForm() { document.getElementById('productFormModal').style.display = 'none'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// ==================== SETTINGS ====================
function savePOSSettings(e) {
    if (e) e.preventDefault();
    posSettings = {
        name: document.getElementById('settingPosName').value,
        storeName: document.getElementById('settingStoreName').value,
        address: document.getElementById('settingStoreAddress').value,
        phone: document.getElementById('settingStorePhone').value,
        trn: document.getElementById('settingStoreTRN').value,
        currency: document.getElementById('settingCurrency').value || '₨'
    };
    localStorage.setItem('posSettings', JSON.stringify(posSettings));
    applyPOSSettings();
    showNotification('Settings saved!', 'success');
}

// ==================== STORAGE ====================
function saveInventory() { localStorage.setItem('inventoryProducts', JSON.stringify(products)); }
function loadTransactionsFromStorage() { transactions = JSON.parse(localStorage.getItem('transactions')) || []; }
function loadBackendConfig() { backendConfig = JSON.parse(localStorage.getItem('backendConfig')) || backendConfig; }
function logout() { sessionStorage.removeItem('userSession'); window.location.href = 'login.html'; }

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    if (!container) { alert(message); return; }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-fade-out'); setTimeout(() => toast.remove(), 300); }, 4000);
}

// Placeholder functions for missing logic
// ==================== EXCEL & CSV PARSING ====================
function importInventoryFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (confirm(`Import ${file.name}? Existing products with matching Barcode/SKU will be updated.`)) {
        importInventoryFileData(file);
    }
}

function importInventoryFileData(file) {
    const reader = new FileReader();
    const extension = file.name.split('.').pop().toLowerCase();

    reader.onload = function (e) {
        try {
            let rows = [];
            if (['xlsx', 'xls', 'xlsm'].includes(extension)) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            } else {
                const text = e.target.result;
                rows = text.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(','));
            }

            const imported = parseInventoryRows(rows);
            if (imported.length > 0) {
                mergeProducts(imported);
                showNotification(`✅ Imported ${imported.length} products!`, 'success');
            } else {
                showNotification('No valid products found in file.', 'error');
            }
        } catch (error) {
            console.error(error);
            alert('❌ Error processing file: ' + error.message);
        }
    };

    if (['xlsx', 'xls', 'xlsm'].includes(extension)) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
}

function parseInventoryRows(rows) {
    if (rows.length < 1) return [];
    const headers = rows[0].map(h => (h || '').toString().toLowerCase().trim().replace(/[^a-z]/g, ''));
    const find = (keys, fallback) => {
        for (const k of keys) { const i = headers.indexOf(k); if (i >= 0) return i; }
        return fallback;
    };

    const nameIdx = find(['name', 'product', 'item'], 0);
    const barcodeIdx = find(['barcode', 'code'], 1);
    const priceIdx = find(['price', 'rate'], 2);
    const stockIdx = find(['stock', 'qty'], 3);
    const catIdx = find(['category', 'type'], 4);

    return rows.slice(1).filter(r => r[nameIdx]).map(r => ({
        name: r[nameIdx].toString().trim(),
        barcode: (r[barcodeIdx] || `BAR-${Date.now()}`).toString().trim(),
        sku: (r[barcodeIdx] || `SKU-${Date.now()}`).toString().trim(),
        price: parseFloat(r[priceIdx]) || 0,
        stock: parseInt(r[stockIdx]) || 0,
        category: r[catIdx] || 'General',
        minStock: 10,
        icon: '📦',
        lastRestocked: new Date().toISOString()
    }));
}

function mergeProducts(imported) {
    imported.forEach(p => {
        const idx = products.findIndex(x => x.barcode === p.barcode || x.sku === p.sku);
        if (idx >= 0) {
            products[idx] = { ...products[idx], ...p, id: products[idx].id };
        } else {
            p.id = Math.max(...products.map(x => x.id), 0) + 1;
            products.push(p);
        }
    });
    saveInventory();
    displayInventoryTable();
}

// ==================== PAYMENT & REPORTS ====================
function showPaymentModal() {
    if (!cart.length) return showNotification('Cart is empty!', 'warning');
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    document.getElementById('amountToPay').value = `${posSettings.currency} ${total.toFixed(2)}`;
    document.getElementById('paymentModal').style.display = 'block';
}

function processPayment(e) {
    e.preventDefault();
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const received = parseFloat(document.getElementById('receivedAmount').value) || 0;

    if (received < total) return alert('Insufficient payment!');

    const transaction = {
        id: 'TXN-' + Date.now(),
        date: new Date().toISOString(),
        items: [...cart],
        total,
        received,
        change: received - total,
        paymentMethod: document.getElementById('paymentMethod').value
    };

    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    // Update stock
    cart.forEach(item => {
        const p = products.find(x => x.id === item.id);
        if (p) p.stock -= item.quantity;
    });

    saveInventory();
    cart = [];
    updateCartDisplay();
    closeModal('paymentModal');
    showNotification('Payment successful!', 'success');
}

function calculateChange() {
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const received = parseFloat(document.getElementById('receivedAmount').value) || 0;
    document.getElementById('changeAmount').value = `${posSettings.currency} ${(received - total).toFixed(2)}`;
}

function exportToCSV() {
    let csv = 'Name,Barcode,SKU,Price,Stock,Category\n';
    products.forEach(p => {
        csv += `"${p.name}",${p.barcode},${p.sku},${p.price},${p.stock},"${p.category}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
}

function generateReport() {
    const type = document.getElementById('reportType').value;
    const content = document.getElementById('reportContent');
    if (!content) return;

    let filtered = transactions;
    const now = new Date();
    if (type === 'daily') filtered = transactions.filter(t => new Date(t.date).toDateString() === now.toDateString());

    const total = filtered.reduce((s, t) => s + (t.total || 0), 0);
    content.innerHTML = `
        <div style="padding:20px; text-align:center;">
            <h3>${type.toUpperCase()} SALES REPORT</h3>
            <div style="font-size:24px; font-weight:700; color:#2563eb;">${posSettings.currency} ${total.toFixed(2)}</div>
            <p>Total Transactions: ${filtered.length}</p>
        </div>
    `;
}

function createSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(10, 10, 100, 100); // Simple placeholder bar
    ctx.font = '12px Arial';
    ctx.fillText('Sales visualization active', 10, 120);
}

function loadTopProducts() {
    const list = document.getElementById('topProductsList');
    if (!list) return;
    const items = products.slice(0, 5);
    list.innerHTML = items.map(p => `<div>${p.name} - ${posSettings.currency}${p.price}</div>`).join('');
}

function setupProductSearch() {
    const input = document.getElementById('productSearch');
    const posInput = document.getElementById('barcodeInput'); // Main POS search/barcode input

    if (input) input.addEventListener('input', (e) => filterInventory());
    if (posInput) posInput.addEventListener('input', (e) => displayProducts(e.target.value));
}

function displayCustomersTable() { }

function setupBarcodeScanner() {
    console.log('Barcode scanner logic ready.');
}

function showScanCamera() {
    showNotification('System Hardware Scanner Active. Manual camera toggle coming in next update.', 'info');
}
