// ==================== SESSION MANAGEMENT ====================
function logout() {
    sessionStorage.removeItem('userSession');
    localStorage.removeItem('rememberedUser');
    window.location.href = 'login.html';
}

function resetPOSSystem() {
    const confirmMsg = `⚠️ RESET POS SYSTEM ⚠️\n\nThis will:\n• Clear ALL products from inventory\n• Clear ALL transactions\n• Clear cart\n• Reset POS settings\n• Keep user login active\n\n❌ THIS ACTION CANNOT BE UNDONE!\n\nType "RESET" to confirm:`;

    const confirmation = prompt(confirmMsg);

    if (confirmation === 'RESET') {
        // Clear all data except user session
        localStorage.removeItem('inventoryProducts');
        localStorage.removeItem('transactions');
        localStorage.removeItem('posSettings');
        localStorage.removeItem('backendConfig');

        // Reset to default
        products = [];
        cart = [];
        transactions = [];

        // Save empty state
        saveInventory();
        localStorage.setItem('transactions', JSON.stringify([]));

        // Reload page
        alert('✅ POS System Reset Complete!\n\n• All products cleared\n• All transactions cleared\n• Settings reset to default\n\nPage will reload...');

        window.location.reload();
    } else if (confirmation !== null) {
        alert('❌ Reset cancelled - incorrect confirmation.\n\nYou must type exactly: RESET');
    }
}

function initializeUserDisplay() {
    const userSession = JSON.parse(sessionStorage.getItem('userSession') || '{}');
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay && userSession.name) {
        userDisplay.textContent = userSession.name;
    } else if (userDisplay && userSession.username) {
        userDisplay.textContent = userSession.username;
    }

    // Show inventory count in console for debugging
    console.log(`📦 Inventory loaded: ${products.length} products`);
    if (products.length > 0) {
        console.log('First 3 products:', products.slice(0, 3).map(p => ({ name: p.name, barcode: p.barcode })));
    }
}

// ==================== DATA STORAGE ====================
// Product Categories
const categories = [
    { id: 1, name: "Fruits & Vegetables", icon: "🍎" },
    { id: 2, name: "Dairy Products", icon: "🥛" },
    { id: 3, name: "Bakery", icon: "🍞" },
    { id: 4, name: "Beverages", icon: "☕" },
    { id: 5, name: "Snacks & Sweets", icon: "🍫" },
    { id: 6, name: "Meat & Poultry", icon: "🍗" },
    { id: 7, name: "Electronics", icon: "📱" },
    { id: 8, name: "Household", icon: "🏠" }
];

// Inventory Product Database
let products = JSON.parse(localStorage.getItem('inventoryProducts')) || [];

let cart = [];
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let backendConfig = JSON.parse(localStorage.getItem('backendConfig')) || {
    backendUrl: '',
    apiEndpoint: '/api/inventory',
    syncInterval: 5,
    apiKey: '',
    sheetsUrl: '',
    sheetName: 'Transactions',
    autoSync: false,
    autoVerify: false
};

let posSettings = JSON.parse(localStorage.getItem('posSettings')) || {
    name: 'POS System',
    storeName: '',
    address: '',
    phone: ''
};

// QR Scanner Variables
let qrStream = null;
let qrScanning = false;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function () {
    checkAuthentication();
    initializeApp();
});

function checkAuthentication() {
    const session = sessionStorage.getItem('userSession');
    const dashboardLink = document.getElementById('dashboardLink');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!session) {
        // Not logged in - redirect to login
        if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
            window.location.href = 'login.html';
        }
    } else {
        // Logged in - show user info
        const user = JSON.parse(session);
        if (dashboardLink && (user.role === 'admin' || user.role === 'manager')) {
            dashboardLink.style.display = 'inline-block';
        } else if (dashboardLink) {
            dashboardLink.style.display = 'none';
        }
    }
}

function logoutUser() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('userSession');
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
    loadPOSSettings();
    updateUserDisplay();
}

function loadPOSSettings() {
    const stored = localStorage.getItem('posSettings');
    if (stored) {
        posSettings = JSON.parse(stored);
    }
    applyPOSSettings();
}

function applyPOSSettings() {
    const titleEl = document.getElementById('posTitle');
    const name = (posSettings?.name || 'POS System').trim();
    if (titleEl) {
        titleEl.textContent = `📦 ${name}`;
    }
    document.title = name;
}

function showPOSSettings() {
    const modal = document.getElementById('posSettingsModal');
    if (!modal) return;

    document.getElementById('posName').value = posSettings.name || '';
    document.getElementById('storeName').value = posSettings.storeName || '';
    document.getElementById('storeAddress').value = posSettings.address || '';
    document.getElementById('storePhone').value = posSettings.phone || '';

    modal.style.display = 'block';
}

function savePOSSettings(event) {
    event.preventDefault();

    posSettings = {
        name: document.getElementById('posName').value.trim() || 'POS System',
        storeName: document.getElementById('storeName').value.trim(),
        address: document.getElementById('storeAddress').value.trim(),
        phone: document.getElementById('storePhone').value.trim()
    };

    localStorage.setItem('posSettings', JSON.stringify(posSettings));
    applyPOSSettings();
    closeModal('posSettingsModal');
    alert('✅ POS settings updated.');
}

function updateUserDisplay() {
    const session = sessionStorage.getItem('userSession');
    const userDisplayElement = document.getElementById('userDisplay');

    if (session && userDisplayElement) {
        const user = JSON.parse(session);
        userDisplayElement.textContent = `${user.name || user.username}`;
    }
}

// ==================== NAVIGATION ====================
function showPOSPage() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('posPage').classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function showInventoryPage() {
    hideAllPages();
    document.getElementById('inventoryPage').classList.add('active');
    updateInventoryDashboard();
    populateCategoryFilter();
    displayInventoryTable();
    updateNavButtons('📦 Inventory');
}

function showOverviewPage() {
    hideAllPages();
    document.getElementById('overviewPage').classList.add('active');
    updateNavButtons('Overview');
    createSalesChart();
    loadTopProducts();
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

    // Populate settings fields
    document.getElementById('settingStoreName').value = posSettings.storeName || '';
    document.getElementById('settingPosName').value = posSettings.name || '';
    document.getElementById('settingStoreAddress').value = posSettings.address || '';
    document.getElementById('settingStorePhone').value = posSettings.phone || '';
    document.getElementById('settingStoreTRN').value = posSettings.trn || '';
}

function displayCustomersTable() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    // Get unique customers from transactions
    const customerMap = new Map();
    transactions.forEach(t => {
        const customerName = t.customerName || 'Walk-in Customer';
        if (!customerMap.has(customerName)) {
            customerMap.set(customerName, {
                name: customerName,
                email: t.customerEmail || 'N/A',
                phone: t.customerPhone || 'N/A',
                purchases: 0
            });
        }
        customerMap.get(customerName).purchases += t.total;
    });

    if (customerMap.size === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: #64748b;">No customer data found yet. Start making sales to see customers!</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    let id = 1;
    customerMap.forEach(c => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${id++}</td>
            <td style="font-weight:600;">${c.name}</td>
            <td>${c.email}</td>
            <td>${c.phone}</td>
            <td style="font-weight:600; color: #059669;">₨ ${c.purchases.toLocaleString()}</td>
            <td>
                <button class="btn-icon" onclick="alert('Viewing history for ${c.name}')">👁️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
}

function updateNavButtons(label) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.textContent.includes(label)) {
            btn.classList.add('active');
        }
    });
}

// ==================== INVENTORY DASHBOARD ====================
function updateInventoryDashboard() {
    const totalCount = products.length;
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStockCount = products.filter(p => p.stock <= 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    const elements = {
        'inventoryTotalCount': totalCount,
        'inventoryLowStockCount': lowStockCount,
        'inventoryOutOfStockCount': outOfStockCount,
        'inventoryTotalValue': '₨ ' + totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

function populateCategoryFilter() {
    const filter = document.getElementById('inventoryCategoryFilter');
    if (!filter) return;

    const categoriesSet = new Set(products.map(p => p.category).filter(c => c));
    const currentVal = filter.value;

    filter.innerHTML = '<option value="">All Categories</option>';
    Array.from(categoriesSet).sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filter.appendChild(option);
    });

    filter.value = currentVal;
}

function displayInventoryTable(filteredItems) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    const itemsToShow = filteredItems || products;
    tbody.innerHTML = '';

    if (itemsToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">No products found matching your search.</td></tr>';
        return;
    }

    itemsToShow.forEach(product => {
        const row = document.createElement('tr');

        let stockStatus = 'good';
        let statusText = 'In Stock';

        if (product.stock <= 0) {
            stockStatus = 'out';
            statusText = 'Out of Stock';
        } else if (product.stock <= product.minStock) {
            stockStatus = 'low';
            statusText = 'Low Stock';
        }

        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 24px;">${product.icon || '📦'}</span>
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary);">${product.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">ID: #${product.id}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-family: monospace; font-size: 12px;">Barcode: ${product.barcode || 'N/A'}</div>
                <div style="font-family: monospace; font-size: 12px;">SKU: ${product.sku || 'N/A'}</div>
            </td>
            <td><span style="padding: 4px 8px; background: #f1f5f9; border-radius: 6px; font-size: 12px;">${product.category || 'General'}</span></td>
            <td style="font-weight: 700;">₨ ${product.price.toFixed(2)}</td>
            <td style="font-weight: 700;">${product.stock}</td>
            <td><span class="stock-badge ${stockStatus}">${statusText}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editProduct(${product.id})" title="Edit">✏️</button>
                    <button class="btn-icon delete" onclick="deleteProduct(${product.id})" title="Delete">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

let currentInventoryFilterType = 'all';

function setInventoryFilter(filterType) {
    currentInventoryFilterType = filterType;

    // Update active tab UI
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase().includes(filterType.toLowerCase()) ||
            (filterType === 'all' && tab.textContent.includes('All'))) {
            tab.classList.add('active');
        }
    });

    filterInventory();
}

function filterInventory() {
    const searchTerm = document.getElementById('inventorySearch').value.toLowerCase();
    const categoryFilter = document.getElementById('inventoryCategoryFilter').value;

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
            p.barcode.toLowerCase().includes(searchTerm) ||
            (p.sku && p.sku.toLowerCase().includes(searchTerm));
        const matchesCategory = !categoryFilter || p.category === categoryFilter;

        let matchesStatus = true;
        if (currentInventoryFilterType === 'low') {
            matchesStatus = p.stock > 0 && p.stock <= (p.minStock || 5);
        } else if (currentInventoryFilterType === 'out') {
            matchesStatus = p.stock <= 0;
        }

        return matchesSearch && matchesCategory && matchesStatus;
    });

    displayInventoryTable(filtered);
}

function createSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    // Get last 7 days data
    const last7Days = [];
    const salesData = [];
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        last7Days.push(dayName);

        const daySales = transactions.filter(t => {
            const txDate = new Date(t.date);
            txDate.setHours(0, 0, 0, 0);
            return txDate.getTime() === date.getTime();
        }).reduce((sum, t) => sum + t.total, 0);

        salesData.push(daySales);
    }

    // Draw chart (Modernized style)
    const maxSales = Math.max(...salesData, 100) * 1.2;
    const chartHeight = 220;
    const chartWidth = canvas.width - 60;
    const barSpacing = chartWidth / last7Days.length;
    const barWidth = barSpacing * 0.6;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    salesData.forEach((sales, index) => {
        const barHeight = (sales / maxSales) * chartHeight;
        const x = 40 + (index * barSpacing);
        const y = 250 - barHeight;

        // Draw bar shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(x + 4, 30, barWidth, 220);

        // Draw bar
        const gradient = ctx.createLinearGradient(0, y, 0, 250);
        gradient.addColorStop(0, '#2563eb');
        gradient.addColorStop(1, '#60a5fa');

        ctx.fillStyle = gradient;
        // Rounded top bars
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [8, 8, 0, 0]);
        ctx.fill();

        // Label
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(last7Days[index], x + barWidth / 2, 275);

        // Value on hover effect (simplified here as static)
        ctx.fillStyle = '#1e293b';
        ctx.fillText(`₨ ${sales.toFixed(0)}`, x + barWidth / 2, y - 10);
    });
}

function loadTopProducts() {
    const list = document.getElementById('topProductsList');
    if (!list) return;

    // Sort products by "sales" if available, otherwise just use price for demo
    const topItems = [...products].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 5);

    list.innerHTML = topItems.map((p, idx) => `
        <div class="top-product-item">
            <div class="top-product-rank">${idx + 1}</div>
            <div class="top-product-icon">${p.icon || '📦'}</div>
            <div class="top-product-info">
                <div class="top-product-name">${p.name}</div>
                <div class="top-product-sales">${p.sales || 0} units sold</div>
            </div>
            <div class="top-product-price">₨ ${p.price.toFixed(2)}</div>
        </div>
    `).join('') || '<p>No sales data yet.</p>';
}

function showDashboardPage() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('dashboardPage').classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}



// ==================== CAMERA SCANNER ====================
function showScanCamera() {
    const videoContainer = document.getElementById('videoContainer');
    const video = document.getElementById('video');

    if (videoContainer && video) {
        videoContainer.classList.remove('video-container-hidden');

        // Request camera access
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                video.srcObject = stream;
                video.play();
            })
            .catch(err => {
                alert('Unable to access camera: ' + err.message);
                console.error('Camera error:', err);
            });
    }
}

function closeScanCamera() {
    const videoContainer = document.getElementById('videoContainer');
    const video = document.getElementById('video');

    if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }

    if (videoContainer) {
        videoContainer.classList.add('video-container-hidden');
    }
}

function confirmScannedItem() {
    const scannedItem = document.getElementById('scannedItem').textContent;
    const qty = parseInt(document.getElementById('quickQty').value) || 1;

    // Find product and add to cart
    const product = products.find(p => p.name === scannedItem || p.barcode === scannedItem);
    if (product) {
        for (let i = 0; i < qty; i++) {
            addToCart(product);
        }
        declineScannedItem();
    }
}

function declineScannedItem() {
    const scanResult = document.getElementById('scanResult');
    if (scanResult) {
        scanResult.classList.add('scan-result-hidden');
        document.getElementById('scannedItem').textContent = '-';
        document.getElementById('quickQty').value = '1';
    }
}

// ==================== MODALS ====================
function showReportsModal() {
    document.getElementById('reportsModal').style.display = 'block';
}

function showInventorySheetModal() {
    const modal = document.getElementById('inventorySheetModal');
    if (!modal) return;
    modal.style.display = 'block';

    const sheetFile = document.getElementById('sheetFile');
    const sheetPreview = document.getElementById('sheetPreview');

    if (sheetFile) sheetFile.value = '';
    if (sheetPreview) {
        sheetPreview.innerHTML = '<div class="empty-state">Upload a CSV or Excel file to preview data.</div>';
    }

    if (sheetFile) {
        sheetFile.onchange = () => previewSheetFile(sheetFile.files[0]);
    }
}

function previewSheetFile(file) {
    const sheetPreview = document.getElementById('sheetPreview');
    if (!sheetPreview) return;
    if (!file) {
        sheetPreview.innerHTML = '<div class="empty-state">Upload a CSV or Excel file to preview data.</div>';
        return;
    }

    const extension = (file.name.split('.').pop() || '').toLowerCase();
    if (extension === 'csv') {
        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim());
            if (lines.length === 0) {
                sheetPreview.innerHTML = '<div class="empty-state">No data found in the CSV file.</div>';
                return;
            }

            const previewLines = lines.slice(0, 6).map(parseCsvLine);
            const header = previewLines[0] || [];
            const rows = previewLines.slice(1);

            sheetPreview.innerHTML = `
                <div style="margin-bottom: 15px; padding: 10px; background: #eef2ff; border-radius: 8px; color: #1e40af; font-weight: 600;">
                    📊 Total Rows Found: ${lines.length} | Columns: ${header.length}
                </div>
                <table class="report-table">
                    <thead>
                        <tr>${header.map(h => `<th>${h || '-'}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `<tr>${r.map(v => `<td>${v || '-'}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 10px; padding: 8px; background: #f0fdf4; border-radius: 8px; color: #15803d; font-size: 13px;">
                    ✓ Showing first 5 rows. All ${lines.length} rows will be imported.
                </div>
            `;
        };
        reader.readAsText(file);
        return;
    }

    if (extension === 'xlsx' || extension === 'xls' || extension === 'xlsm' || extension === 'xlsb') {
        const reader = new FileReader();
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: false });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];

            // Get ALL rows from the Excel file (not limited)
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
            const totalRows = rows.filter(row => row.some(cell => cell && cell.toString().trim())).length;
            const previewRows = rows.slice(0, 6);

            if (totalRows === 0) {
                sheetPreview.innerHTML = '<div class="empty-state">No data found in the Excel file.</div>';
                return;
            }

            const header = previewRows[0] || [];
            const bodyRows = previewRows.slice(1);

            sheetPreview.innerHTML = `
                <div style="margin-bottom: 15px; padding: 10px; background: #eef2ff; border-radius: 8px; color: #1e40af; font-weight: 600;">
                    📊 Total Rows Found: ${totalRows} | Columns: ${header.length}
                </div>
                <table class="report-table">
                    <thead>
                        <tr>${header.map(h => `<th>${h || '-'}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${bodyRows.map(r => `<tr>${r.map(v => `<td>${v || '-'}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 10px; padding: 8px; background: #f0fdf4; border-radius: 8px; color: #15803d; font-size: 13px;">
                    ✓ Showing first 5 rows. All ${totalRows} rows will be imported.
                </div>
            `;
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    sheetPreview.innerHTML = '<div class="empty-state">Unsupported file type. Upload CSV or Excel (.xlsx).</div>';
}

function validateAndUploadSheet() {
    const fileInput = document.getElementById('sheetFile');
    const file = fileInput?.files?.[0];

    if (!file) {
        alert('Please select a CSV or Excel file to upload.');
        return;
    }

    importInventoryFileData(file, true);
}

function parseInventoryCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    const rows = lines.map(parseCsvLine);
    return parseInventoryRows(rows);
}

function parseInventoryRows(rows, progressCallback) {
    if (!rows || rows.length === 0) return [];

    // Filter out completely empty rows
    const nonEmptyRows = rows.filter(row =>
        Array.isArray(row) && row.some(cell => cell && cell.toString().trim())
    );

    if (nonEmptyRows.length === 0) return [];

    console.log('🔍 Parsing rows:', nonEmptyRows.length);

    const headerRow = nonEmptyRows[0].map(h => normalizeHeader(h));
    console.log('📋 Normalized headers:', headerRow);

    const hasHeader = headerRow.includes('name') || headerRow.includes('productname') ||
        headerRow.includes('barcode') || headerRow.includes('price') ||
        headerRow.includes('stock') || headerRow.includes('category') ||
        headerRow.includes('assettag') || headerRow.includes('model') ||
        headerRow.includes('type') || headerRow.includes('manufacturer') ||
        headerRow.includes('serialnumber') || headerRow.includes('battery') ||
        headerRow.includes('lcd') || headerRow.includes('status');

    const startIndex = hasHeader ? 1 : 0;
    console.log('🎯 Data starts at row:', startIndex, '| Has header:', hasHeader);

    const findIndex = (labels, fallback) => {
        for (const label of labels) {
            const idx = headerRow.indexOf(label);
            if (idx >= 0) return idx;
        }
        return fallback;
    };

    // Try to find columns by header names, fallback to common positions
    const nameIdx = findIndex(['name', 'productname', 'itemname', 'product', 'item', 'title', 'description', 'assettag', 'model'], 0);
    const barcodeIdx = findIndex(['barcode', 'code', 'barcodedata', 'upc', 'ean', 'serialnumber', 'serial'], 3);
    const skuIdx = findIndex(['sku', 'skucode', 'itemcode', 'productcode', 'model', 'assettag'], 2);
    const priceIdx = findIndex(['price', 'unitprice', 'saleprice', 'cost', 'rate', 'amount'], 4);
    const stockIdx = findIndex(['stock', 'qty', 'quantity', 'onhand', 'available', 'inventory', 'status'], 5);
    const minStockIdx = findIndex(['minstock', 'min', 'minqty', 'reorderlevel', 'minimum'], 6);
    const categoryIdx = findIndex(['category', 'cat', 'department', 'type', 'class', 'manufacturer'], 7);
    const supplierIdx = findIndex(['supplier', 'vendor', 'brand', 'manufacturer'], 0);
    const iconIdx = findIndex(['icon', 'emoji', 'image'], 8);
    const lastRestockedIdx = findIndex(['lastrestocked', 'restocked', 'date', 'lastupdate'], 9);

    console.log('📍 Column mapping:', { nameIdx, barcodeIdx, skuIdx, priceIdx, stockIdx, categoryIdx });

    const now = Date.now();
    const nextId = Math.max(...products.map(p => p.id), 0) + 1;
    const imported = [];
    const skipped = [];
    const totalToProcess = nonEmptyRows.length - startIndex;
    const progressInterval = Math.max(500, Math.floor(totalToProcess / 100)); // Update every 500 rows or 1%

    for (let i = startIndex; i < nonEmptyRows.length; i++) {
        // Fast progress updates
        if (progressCallback && ((i - startIndex) % progressInterval === 0)) {
            const percent = Math.round(((i - startIndex) / totalToProcess) * 100);
            progressCallback(`⚡ Fast Processing: ${(i - startIndex).toLocaleString()} / ${totalToProcess.toLocaleString()} (${percent}%)`);
        }

        const values = nonEmptyRows[i];

        // Process every row that has at least one non-empty cell
        if (!values || values.length === 0) {
            continue;
        }

        // Smart product name detection - combine multiple columns if needed
        let name = '';
        let category = (values[categoryIdx] || '').toString().trim();
        let supplier = (values[supplierIdx] || '').toString().trim();

        // Strategy 1: Check designated name column
        name = (values[nameIdx] || '').toString().trim();

        // Strategy 2: If name is empty/unknown, try combining columns 0-2
        if (!name || name.toUpperCase() === 'UNKNOWN' || name.length < 2) {
            const parts = [];
            for (let j = 0; j <= 2; j++) {
                const val = (values[j] || '').toString().trim();
                if (val && val.toUpperCase() !== 'UNKNOWN' && val.length >= 2) {
                    parts.push(val);
                }
            }
            if (parts.length > 0) {
                // Use first part as category/brand if it looks like one
                if (parts.length >= 2 && parts[0].length <= 15) {
                    category = parts[0];
                    name = parts.slice(1).join(' ');
                } else {
                    name = parts.join(' ');
                }
            }
        }

        // Strategy 3: Last resort - find ANY non-empty value
        if (!name || name.length < 1) {
            for (let j = 0; j < Math.min(values.length, 10); j++) {
                const val = (values[j] || '').toString().trim();
                if (val && val.toUpperCase() !== 'UNKNOWN' && val.length >= 1) {
                    name = val;
                    break;
                }
            }
        }

        // If still no name, use row number as identifier
        if (!name || name.length < 1) {
            name = `Product-${i + 1}`;
            console.log(`⚠️ Row ${i + 1}: No name found, using default: ${name}`);
        }

        const price = toNumber(values[priceIdx]);
        const stock = toNumber(values[stockIdx], true);
        const minStock = toNumber(values[minStockIdx], true);
        const barcode = (values[barcodeIdx] || `BAR-${now}-${i}`).toString().trim();
        const sku = (values[skuIdx] || `SKU-${now}-${i}`).toString().trim();

        const product = {
            id: nextId + imported.length,
            name: name,
            barcode: barcode !== 'UNKNOWN' ? barcode : `BAR-${now}-${i}`,
            sku: sku !== 'UNKNOWN' ? sku : `SKU-${now}-${i}`,
            price: price,
            stock: stock,
            minStock: minStock || 5,
            category: category !== 'UNKNOWN' && category ? category : 'Other',
            supplier: supplier !== 'UNKNOWN' && supplier ? supplier : 'Imported',
            icon: (values[iconIdx] || '📦').toString().trim() || '📦',
            lastRestocked: values[lastRestockedIdx] ? new Date(values[lastRestockedIdx]).toISOString() : new Date().toISOString()
        };

        imported.push(product);
        console.log(`✅ Row ${i + 1}:`, product.name);
    }

    // Log skipped rows for debugging
    if (skipped.length > 0) {
        console.log('⚠️ Skipped rows:', skipped);
    }

    console.log(`📦 Total imported: ${imported.length}, Skipped: ${skipped.length}`);
    return imported;
}

function normalizeHeader(header) {
    if (!header) return '';
    return header
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function toNumber(value, integer = false) {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(value);
    if (Number.isNaN(num)) return 0;
    return integer ? Math.round(num) : num;
}

function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && nextChar === '"') {
            current += '"';
            i++;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    result.push(current.trim());
    return result;
}

function exportToCSV() {
    let csv = 'ID,Name,Barcode,SKU,Price,Stock,Min Stock,Category,Supplier,Icon,Last Restocked\\n';

    products.forEach(p => {
        csv += `${p.id},"${p.name}",${p.barcode},${p.sku},${p.price},${p.stock},${p.minStock},"${p.category}","${p.supplier}",${p.icon},${p.lastRestocked}\\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function importInventoryCSV(event) {
    importInventoryFile(event);
}

function importInventoryFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    // Use a clean confirmation for Merge (Update/Add) behavior
    const confirmMsg = `Importing "${file.name}"\n\nThis will UPDATE existing products and ADD new ones.\nOld records will NOT be deleted.\n\nProceed?`;

    if (confirm(confirmMsg)) {
        importInventoryFileData(file, false);
    }

    if (event?.target) {
        event.target.value = '';
    }
}

function importInventoryFileData(file, closeModalOnSuccess) {
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    const isExcel = ['xlsx', 'xls', 'xlsm', 'xlsb'].includes(extension);
    const isCsv = extension === 'csv';

    if (isCsv) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const text = e.target.result;
                const totalLines = text.split(/\r?\n/).filter(line => line.trim()).length;
                const imported = parseInventoryCSV(text);

                if (imported.length === 0) {
                    alert(`❌ No valid products found!\n\nTotal rows scanned in CSV: ${totalLines}\n\nPlease ensure your CSV file has:\n• Product names\n• Required headers (Name, Barcode, etc.)`);
                    return;
                }

                // MERGE MODE (Standard behavior for professional POS)
                const existingProducts = [...products];
                const merged = [...existingProducts];
                const updatedProducts = [];
                const newlyAdded = [];

                imported.forEach(newProduct => {
                    const idx = merged.findIndex(p =>
                        (p.barcode && newProduct.barcode && p.barcode === newProduct.barcode) ||
                        (p.sku && newProduct.sku && p.sku === newProduct.sku)
                    );

                    if (idx >= 0) {
                        const preservedId = merged[idx].id;
                        merged[idx] = { ...merged[idx], ...newProduct, id: preservedId };
                        updatedProducts.push(merged[idx]);
                    } else {
                        const maxId = Math.max(...merged.map(p => p.id), 0);
                        newProduct.id = maxId + 1;
                        merged.push(newProduct);
                        newlyAdded.push(newProduct);
                    }
                });

                products = merged;
                saveInventory();
                displayProducts();

                // Refresh unified displays
                if (document.getElementById('inventoryPage').classList.contains('active')) {
                    updateInventoryDashboard();
                    populateCategoryFilter();
                    displayInventoryTable();
                }

                alert(`✅ Products Merged Successfully!\n\n📊 Summary:\n• Total in File: ${imported.length}\n• Updated: ${updatedProducts.length}\n• Newly Added: ${newlyAdded.length}\n\n📦 Total Inventory Now: ${products.length} products`);
                if (closeModalOnSuccess) closeModal('inventorySheetModal');
                if (closeModalOnSuccess) closeModal('inventorySheetModal');
            } catch (error) {
                alert(`❌ Error reading CSV file:\n\n${error.message}\n\nPlease ensure the file is a valid CSV file.`);
                console.error('CSV import error:', error);
            }
        };
        reader.readAsText(file);
        return;
    }

    if (isExcel) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                // Show loading indicator for large files
                const loadingMsg = document.createElement('div');
                loadingMsg.id = 'uploadProgress';
                loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:30px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:10000;text-align:center;min-width:300px;';
                loadingMsg.innerHTML = '<div style="font-size:18px;font-weight:600;color:#2563eb;margin-bottom:15px;">📊 Processing Excel File...</div><div id="progressText" style="color:#64748b;">Reading file...</div>';
                document.body.appendChild(loadingMsg);

                const updateProgress = (msg) => {
                    const progressText = document.getElementById('progressText');
                    if (progressText) progressText.textContent = msg;
                };

                const data = new Uint8Array(e.target.result);
                updateProgress(`File size: ${(data.length / 1024 / 1024).toFixed(2)} MB`);

                // Read with enhanced options to capture all data including dates and formats
                const workbook = XLSX.read(data, {
                    type: 'array',
                    cellDates: false,
                    cellNF: false,
                    cellText: false,
                    dense: false
                });

                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                updateProgress('Converting to JSON...');

                // Get ALL rows (defval ensures empty cells are included, raw: false for formatted values)
                const rows = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: '',
                    raw: false,
                    blankrows: false
                });

                // Debug: Log first few rows to console
                console.log('📊 Excel Data Retrieved:');
                console.log('Total Rows:', rows.length);
                console.log('First 5 rows:', rows.slice(0, 5));
                console.log('Column count:', rows[0]?.length || 0);

                const totalRows = rows.length;
                updateProgress(`✅ Retrieved ${totalRows.toLocaleString()} rows - Processing...`);
                console.log(`📊 Processing ${totalRows} rows - System supports UNLIMITED data...`);

                // Process immediately for fast data retrieval
                const imported = parseInventoryRows(rows, updateProgress);

                // Remove loading indicator
                document.getElementById('uploadProgress')?.remove();

                console.log(`✅ Successfully parsed ${imported.length} products from ${totalRows} rows`);
                if (imported.length > 0) {
                    console.log('First product:', imported[0]);
                    console.log('Last product:', imported[imported.length - 1]);
                }

                if (imported.length === 0) {
                    const debugInfo = `\n\nDEBUG INFO:\nRows found: ${totalRows}\nFirst row data: ${rows[0]?.slice(0, 4).join(' | ') || 'No data'}\n\nCheck browser console (F12) for detailed logs.`;
                    alert(`❌ No valid products found!\n\nTotal rows scanned: ${totalRows}\n\nPlease ensure your Excel file has:\n• Product names in the data\n• Proper column headers (Name, Barcode, Price, Stock, etc.)${debugInfo}`);
                    return;
                }

                // MERGE MODE (Standard behavior for professional POS)
                // We keep all existing and only update/add based on Barcode or SKU
                const existingProducts = [...products];
                const merged = [...existingProducts];
                const updatedProducts = [];
                const newlyAdded = [];

                imported.forEach(newProduct => {
                    // Unique identification logic
                    const idx = merged.findIndex(p =>
                        (p.barcode && newProduct.barcode && p.barcode === newProduct.barcode) ||
                        (p.sku && newProduct.sku && p.sku === newProduct.sku)
                    );

                    if (idx >= 0) {
                        // Preserve ID but update other fields
                        const preservedId = merged[idx].id;
                        merged[idx] = { ...merged[idx], ...newProduct, id: preservedId };
                        updatedProducts.push(merged[idx]);
                    } else {
                        // Assign a new ID that doesn't conflict
                        const maxId = Math.max(...merged.map(p => p.id), 0);
                        newProduct.id = maxId + 1;
                        merged.push(newProduct);
                        newlyAdded.push(newProduct);
                    }
                });

                products = merged;
                saveInventory();
                displayProducts();

                // Refresh the unified inventory dashboard
                if (document.getElementById('inventoryPage').classList.contains('active')) {
                    updateInventoryDashboard();
                    populateCategoryFilter();
                    displayInventoryTable();
                }

                alert(`✅ Products Imported Successfully!\n\n📊 Summary:\n• Total in File: ${imported.length}\n• Updated: ${updatedProducts.length}\n• Newly Added: ${newlyAdded.length}\n\n📦 Total Inventory Now: ${products.length} products`);
                if (closeModalOnSuccess) closeModal('inventorySheetModal');

                // Show success update
                console.log('✅ Final inventory state updated.');

            } catch (error) {
                document.getElementById('uploadProgress')?.remove();
                alert(`❌ Error processing Excel file:\n\n${error.message}\n\nCheck the console for more details.`);
                console.error('Excel processing error:', error);
            }
        };
        reader.onerror = function () {
            document.getElementById('uploadProgress')?.remove();
            alert('❌ Failed to read the Excel file. Please check if the file is corrupted.');
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    alert('Unsupported file type. Please upload CSV or Excel (.xlsx/.xls/.xlsm/.xlsb).');
}

function setupBarcodeScanner() {
    const barcodeInput = document.getElementById('barcodeInput');
    if (!barcodeInput) return;

    barcodeInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const barcode = barcodeInput.value.trim();
            if (barcode) {
                processBarcode(barcode);
            }
        }
    });
}

function manualSearch() {
    const barcode = document.getElementById('barcodeInput').value.trim();
    if (barcode) {
        processBarcode(barcode);
    }
}

function processBarcode(barcode) {
    const status = document.getElementById('scannerStatus');
    status.className = 'scanner-status scanning';
    status.textContent = '🔍 Checking inventory...';

    // Show total products in inventory for reference
    const totalProducts = products.length;
    console.log(`📊 Inventory Check: Searching "${barcode}" in ${totalProducts} products`);

    // Find product by barcode or SKU
    const product = products.find(p => p.barcode === barcode || p.sku === barcode);

    setTimeout(() => {
        if (product) {
            // Product found in inventory - check stock levels
            console.log('✅ Product found:', product);

            if (product.stock > 0) {
                // Check if stock is low
                const stockWarning = product.stock <= product.minStock ? ' ⚠️ Low Stock!' : '';

                addToCart(product);
                status.className = 'scanner-status';
                status.textContent = `✅ Found: ${product.name} | Stock: ${product.stock}${stockWarning}`;

                // Show detailed product info
                showInventoryAlert(product);

                // Play success sound
                playSound('success');

                // Save updated inventory
                saveInventory();
            } else {
                // Out of stock
                status.className = 'scanner-status error';
                status.textContent = `❌ OUT OF STOCK: ${product.name} | SKU: ${product.sku}`;
                showInventoryAlert(product, true);
                playSound('error');
            }
        } else {
            // Product NOT found in inventory
            console.log(`❌ Product not found. Scanned: "${barcode}". Inventory has ${totalProducts} products.`);
            console.log('Sample inventory barcodes:', products.slice(0, 5).map(p => p.barcode));

            status.className = 'scanner-status error';
            status.textContent = `❌ NOT IN INVENTORY: ${barcode}`;

            // Show detailed error with inventory info
            const msg = `❌ Product Not Found!\n\n` +
                `Scanned: ${barcode}\n` +
                `Total Products in Inventory: ${totalProducts}\n\n` +
                `This barcode/SKU is NOT in your uploaded inventory sheet.\n\n` +
                `Would you like to add it manually?`;

            if (confirm(msg)) {
                showAddProductToInventory(barcode);
            }

            playSound('error');
        }

        // Clear input and reset status after 3 seconds
        setTimeout(() => {
            document.getElementById('barcodeInput').value = '';
            status.className = 'scanner-status';
            status.textContent = 'Ready to scan';
            document.getElementById('barcodeInput').focus();
        }, 3000);
    }, 500);
}

// Show inventory alert with product details
function showInventoryAlert(product, outOfStock = false) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'inventory-alert';
    alertDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${outOfStock ? '#fee2e2' : '#d1fae5'};
        border: 2px solid ${outOfStock ? '#ef4444' : '#10b981'};
        border-radius: 12px;
        padding: 20px;
        max-width: 350px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s;
    `;

    alertDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
            <div style="font-size: 40px;">${product.icon}</div>
            <div>
                <div style="font-size: 18px; font-weight: 700; color: #1e293b;">${product.name}</div>
                <div style="font-size: 12px; color: #64748b;">SKU: ${product.sku} | Barcode: ${product.barcode}</div>
            </div>
        </div>
        <div style="background: white; padding: 12px; border-radius: 8px; margin: 10px 0;">
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span style="color: #64748b;">Price:</span>
                <strong style="color: #2563eb;">$${product.price.toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span style="color: #64748b;">Stock:</span>
                <strong style="color: ${product.stock <= product.minStock ? '#ef4444' : '#10b981'};">${product.stock} units</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span style="color: #64748b;">Category:</span>
                <strong>${product.category}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                <span style="color: #64748b;">Supplier:</span>
                <strong>${product.supplier}</strong>
            </div>
        </div>
        ${product.stock <= product.minStock && product.stock > 0 ?
            `<div style="background: #fef3c7; color: #92400e; padding: 10px; border-radius: 6px; font-size: 13px; margin-top: 10px;">
                ⚠️ Stock is low! Minimum: ${product.minStock} units
            </div>` : ''}
        ${outOfStock ?
            `<div style="background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px; font-size: 13px; margin-top: 10px;">
                ❌ OUT OF STOCK! Please restock immediately.
            </div>` : ''}
    `;

    document.body.appendChild(alertDiv);

    // Auto remove after 4 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 4000);
}

// Add new product to inventory
function showAddProductToInventory(barcode) {
    const name = prompt('Product Name:');
    if (!name) return;

    const sku = prompt('SKU Code:', `PROD-${products.length + 1}`);
    const price = parseFloat(prompt('Price:', '0.00'));
    const stock = parseInt(prompt('Initial Stock:', '0'));
    const minStock = parseInt(prompt('Minimum Stock Alert:', '10'));
    const category = prompt('Category:', 'General');
    const supplier = prompt('Supplier:', 'N/A');
    const icon = prompt('Icon (emoji):', '📦');

    const newProduct = {
        id: products.length + 1,
        name,
        barcode,
        sku,
        price,
        stock,
        minStock,
        category,
        supplier,
        icon,
        lastRestocked: new Date().toISOString()
    };

    products.push(newProduct);
    saveInventory();
    displayProducts();

    alert(`✅ Product "${name}" added to inventory!\\nSKU: ${sku}\\nBarcode: ${barcode}`);
}

// Save inventory to localStorage
function saveInventory() {
    localStorage.setItem('inventoryProducts', JSON.stringify(products));
}

function playSound(type) {
    // Create audio context for beep sounds
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'success') {
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'error') {
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.15;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }
}

// ==================== PRODUCT DISPLAY ====================
let currentCategory = 'All';

// Pagination settings for large datasets
let currentPage = 1;
const itemsPerPage = 50; // Show 50 products at a time
let totalPages = 1;

function displayProducts(filterText = '') {
    const productGrid = document.getElementById('productList');
    if (!productGrid) return;

    let filteredProducts = products;

    // Filter by category
    if (currentCategory !== 'All') {
        filteredProducts = filteredProducts.filter(p => p.category === currentCategory);
    }

    // Filter by search text
    if (filterText) {
        filteredProducts = filteredProducts.filter(p =>
            p.name.toLowerCase().includes(filterText.toLowerCase()) ||
            p.barcode.includes(filterText) ||
            p.sku.includes(filterText)
        );
        currentPage = 1; // Reset to first page when searching
    }

    if (filteredProducts.length === 0) {
        productGrid.innerHTML = '<div class="empty-state">No products found</div>';
        return;
    }

    // Calculate pagination
    totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);

    // Display products for current page
    productGrid.innerHTML = pageProducts.map(product => `
        <div class="product-card ${product.stock === 0 ? 'out-of-stock' : ''}" 
             onclick="addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})">
            <div class="product-icon">${product.icon}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-barcode">#${product.barcode}</div>
            <div class="product-price">₨ ${product.price.toFixed(2)}</div>
            <div class="product-stock">Stock: ${product.stock}</div>
        </div>
    `).join('');

    // Add pagination controls if more than one page
    if (totalPages > 1) {
        const paginationHtml = `
            <div style="grid-column: 1/-1; display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; padding: 15px; background: var(--card-bg); border-radius: 12px; box-shadow: var(--shadow);">
                <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''} style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">◀ Previous</button>
                <span style="font-weight: 600; color: var(--text-primary);">Page ${currentPage} of ${totalPages} (${filteredProducts.length} products)</span>
                <button onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''} style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Next ▶</button>
                <button onclick="goToPage('first')" ${currentPage === 1 ? 'disabled' : ''} style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 6px; cursor: pointer;">First</button>
                <button onclick="goToPage('last')" ${currentPage === totalPages ? 'disabled' : ''} style="padding: 8px 12px; background: var(--secondary-color); color: white; border: none; border-radius: 6px; cursor: pointer;">Last</button>
            </div>
        `;
        productGrid.innerHTML += paginationHtml;
    }

    // Show stats
    console.log(`📊 Displaying ${pageProducts.length} of ${filteredProducts.length} products (Page ${currentPage}/${totalPages})`);
}

function changePage(direction) {
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    displayProducts();
    // Scroll to top of product list
    document.getElementById('productList')?.scrollIntoView({ behavior: 'smooth' });
}

function goToPage(position) {
    if (position === 'first') currentPage = 1;
    if (position === 'last') currentPage = totalPages;
    displayProducts();
    document.getElementById('productList')?.scrollIntoView({ behavior: 'smooth' });
}

function filterByCategory(category) {
    currentCategory = category;

    // Update active button
    const categoryButtons = document.querySelectorAll('.btn-category');
    categoryButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.trim() === category) {
            btn.classList.add('active');
        }
    });

    displayProducts();
}

function setupProductSearch() {
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            displayProducts(e.target.value);
        });
    }
}

// ==================== CART MANAGEMENT ====================
function addToCart(product) {
    if (product.stock === 0) {
        alert('This product is out of stock!');
        return;
    }

    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert(`Only ${product.stock} items available in stock!`);
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxStock: product.stock
        });
    }

    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cartItems');

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart">🛒 Cart is empty - Add products to get started!</div>';
    } else {
        cartItemsContainer.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₨ ${item.price.toFixed(2)} each</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="qty-btn" onclick="decreaseQuantity(${index})">-</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn" onclick="increaseQuantity(${index})">+</button>
                </div>
                <div class="cart-item-total">₨ ${(item.price * item.quantity).toFixed(2)}</div>
                <button class="remove-btn" onclick="removeFromCart(${index})">×</button>
            </div>
        `).join('');
    }

    updateCartSummary();
}

function increaseQuantity(index) {
    if (cart[index].quantity < cart[index].maxStock) {
        cart[index].quantity++;
        updateCartDisplay();
    } else {
        alert(`Only ${cart[index].maxStock} items available in stock!`);
    }
}

function decreaseQuantity(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
        updateCartDisplay();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function clearCart() {
    if (cart.length === 0) return;

    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        updateCartDisplay();
    }
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(document.getElementById('discountPercent')?.value || 0);
    const taxPercent = parseFloat(document.getElementById('taxPercent')?.value || 0);

    const discountAmount = subtotal * (discountPercent / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = subtotalAfterDiscount * (taxPercent / 100);
    const total = subtotalAfterDiscount + taxAmount;

    document.getElementById('subtotal').textContent = `₨ ${subtotal.toFixed(2)}`;
    document.getElementById('discountAmount').textContent = `₨ ${discountAmount.toFixed(2)}`;
    document.getElementById('taxAmount').textContent = `₨ ${taxAmount.toFixed(2)}`;
    document.getElementById('total').textContent = `₨ ${total.toFixed(2)}`;
}

// ==================== PAYMENT ====================
function showPaymentModal() {
    if (cart.length === 0) {
        alert('Cart is empty! Please add items first.');
        return;
    }

    const totalText = document.getElementById('total').textContent.replace('₨', '').trim();
    const total = parseFloat(totalText);

    const amountToPayElement = document.getElementById('amountToPay');
    if (amountToPayElement) {
        amountToPayElement.value = `₨ ${total.toFixed(2)}`;
    }

    const receivedAmountElement = document.getElementById('receivedAmount');
    if (receivedAmountElement) {
        receivedAmountElement.value = '';
    }

    const changeAmountElement = document.getElementById('changeAmount');
    if (changeAmountElement) {
        changeAmountElement.value = '₨ 0.00';
    }

    document.getElementById('paymentModal').style.display = 'block';

    // Auto-focus on amount input
    setTimeout(() => {
        if (receivedAmountElement) receivedAmountElement.focus();
    }, 100);
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function calculateChange() {
    const totalText = document.getElementById('total').textContent.replace('₨', '').trim();
    const total = parseFloat(totalText);
    const received = parseFloat(document.getElementById('receivedAmount').value) || 0;
    const change = received - total;

    document.getElementById('changeAmount').value =
        change >= 0 ? `₨ ${change.toFixed(2)}` : `₨ -${Math.abs(change).toFixed(2)}`;
}

function processPayment(event) {
    event.preventDefault();

    const totalText = document.getElementById('total').textContent.replace('₨', '').trim();
    const total = parseFloat(totalText);
    const received = parseFloat(document.getElementById('receivedAmount').value) || 0;
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (received < total) {
        alert('Insufficient payment amount!');
        return;
    }

    const change = received - total;

    const subtotalText = document.getElementById('subtotal').textContent.replace('₨', '').trim();
    const discountText = document.getElementById('discountAmount').textContent.replace('₨', '').trim();
    const taxText = document.getElementById('taxAmount').textContent.replace('₨', '').trim();

    // Create transaction record
    const transaction = {
        id: 'TXN-' + Date.now(),
        date: new Date().toISOString(),
        items: [...cart],
        subtotal: parseFloat(subtotalText),
        discount: parseFloat(discountText),
        tax: parseFloat(taxText),
        total: total,
        paymentMethod: paymentMethod,
        amountReceived: received,
        change: change,
        notes: document.getElementById('transactionNotes')?.value || ''
    };

    // Update product stock
    cart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        if (product) {
            product.stock -= cartItem.quantity;
        }
    });

    // Save updated inventory
    saveInventory();

    // Save transaction
    transactions.push(transaction);
    saveTransactions();

    // Auto-sync to sheet if enabled
    if (backendConfig.autoSync && backendConfig.sheetsUrl) {
        syncToSheet();
    }

    // Show success message
    alert(`✅ Payment Successful!\n\nTotal: ₨ ${total.toFixed(2)}\nReceived: ₨ ${received.toFixed(2)}\nChange: ₨ ${change.toFixed(2)}\n\nThank you for your purchase!`);

    // Print receipt (optional)
    printReceipt(transaction);

    // Clear cart and close modal
    cart = [];
    updateCartDisplay();
    displayProducts(); // Refresh to show updated stock
    closeModal('paymentModal');
}



// ==================== RECEIPT ====================
function printReceipt(transaction) {
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    const settingsName = posSettings?.name || 'POS System';
    const storeName = posSettings?.storeName || '';
    const storeAddress = posSettings?.address || '';
    const storePhone = posSettings?.phone || '';

    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${transaction.id}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    padding: 20px;
                    max-width: 350px;
                    margin: 0 auto;
                }
                .receipt-header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }
                .receipt-title {
                    font-size: 24px;
                    font-weight: bold;
                }
                .receipt-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                }
                .receipt-item {
                    margin: 10px 0;
                }
                .item-name {
                    font-weight: bold;
                }
                .receipt-footer {
                    border-top: 2px dashed #000;
                    padding-top: 10px;
                    margin-top: 15px;
                }
                .total-row {
                    font-size: 18px;
                    font-weight: bold;
                    margin: 10px 0;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <div class="receipt-title">🛒 ${settingsName}</div>
                ${storeName ? `<div>${storeName}</div>` : ''}
                ${storeAddress ? `<div>${storeAddress}</div>` : ''}
                ${storePhone ? `<div>${storePhone}</div>` : ''}
                <div>Transaction Receipt</div>
            </div>
            
            <div class="receipt-row">
                <span>Transaction ID:</span>
                <span>${transaction.id}</span>
            </div>
            <div class="receipt-row">
                <span>Date:</span>
                <span>${new Date(transaction.date).toLocaleString()}</span>
            </div>
            <div class="receipt-row">
                <span>Payment:</span>
                <span>${transaction.paymentMethod.toUpperCase()}</span>
            </div>
            
            <div style="border-top: 1px solid #000; margin: 15px 0;"></div>
            
            ${transaction.items.map(item => `
                <div class="receipt-item">
                    <div class="item-name">${item.name}</div>
                    <div class="receipt-row">
                        <span>${item.quantity} x ₨ ${item.price.toFixed(2)}</span>
                        <span>₨ ${(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                </div>
            `).join('')}
            
            <div class="receipt-footer">
                <div class="receipt-row">
                    <span>Subtotal:</span>
                    <span>₨ ${transaction.subtotal.toFixed(2)}</span>
                </div>
                <div class="receipt-row">
                    <span>Tax (10%):</span>
                    <span>₨ ${transaction.tax.toFixed(2)}</span>
                </div>
                <div class="receipt-row total-row">
                    <span>TOTAL:</span>
                    <span>₨ ${transaction.total.toFixed(2)}</span>
                </div>
                <div class="receipt-row">
                    <span>Amount Paid:</span>
                    <span>₨ ${transaction.amountReceived.toFixed(2)}</span>
                </div>
                <div class="receipt-row">
                    <span>Change:</span>
                    <span>₨ ${transaction.change.toFixed(2)}</span>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px;">
                <p>Thank you for your purchase!</p>
                <p style="font-size: 12px;">Visit us again soon!</p>
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
                    🖨️ Print Receipt
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">
                    Close
                </button>
            </div>
        </body>
        </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
}

// ==================== REPORTS ====================
function showReports() {
    document.getElementById('reportsModal').style.display = 'block';

    // Set default date range (today)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reportStartDate').value = today;
    document.getElementById('reportEndDate').value = today;

    generateReport();
}

function closeReportsModal() {
    document.getElementById('reportsModal').style.display = 'none';
}

function generateReport() {
    const reportType = document.getElementById('reportType').value;
    let startDate, endDate;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (reportType) {
        case 'daily':
            startDate = new Date(today);
            endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'monthly':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 30);
            endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            startDate = new Date(document.getElementById('reportStartDate').value);
            endDate = new Date(document.getElementById('reportEndDate').value);
            endDate.setHours(23, 59, 59, 999);
            break;
    }

    // Filter transactions by date range
    const filteredTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= startDate && txDate <= endDate;
    });

    // Calculate summary
    const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = filteredTransactions.length;
    const totalItems = filteredTransactions.reduce((sum, t) =>
        sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    const avgSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Update summary cards
    document.getElementById('reportTotalSales').textContent = `$${totalSales.toFixed(2)}`;
    document.getElementById('reportTransactions').textContent = totalTransactions;
    document.getElementById('reportItemsSold').textContent = totalItems;
    document.getElementById('reportAvgSale').textContent = `$${avgSale.toFixed(2)}`;

    // Update table
    const tableBody = document.getElementById('reportTableBody');
    tableBody.innerHTML = filteredTransactions.map(t => `
        <tr>
            <td>${t.id}</td>
            <td>${new Date(t.date).toLocaleString()}</td>
            <td>${t.items.length} items (${t.items.reduce((sum, i) => sum + i.quantity, 0)} qty)</td>
            <td>${t.paymentMethod.toUpperCase()}</td>
            <td>$${t.total.toFixed(2)}</td>
        </tr>
    `).join('');

    if (filteredTransactions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No transactions found in selected date range</td></tr>';
    }
}

function exportReport() {
    const reportType = document.getElementById('reportType').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    // Get current report data
    const reportRows = Array.from(document.querySelectorAll('#reportTableBody tr'));

    if (reportRows.length === 0 || reportRows[0].cells.length === 1) {
        alert('No data to export!');
        return;
    }

    // Create CSV content
    let csv = 'Transaction ID,Date & Time,Items,Payment Method,Amount\n';

    reportRows.forEach(row => {
        const cells = Array.from(row.cells);
        csv += cells.map(cell => `"${cell.textContent}"`).join(',') + '\n';
    });

    // Add summary at the end
    csv += '\n';
    csv += 'SUMMARY\n';
    csv += `Total Sales,"${document.getElementById('reportTotalSales').textContent}"\n`;
    csv += `Total Transactions,${document.getElementById('reportTransactions').textContent}\n`;
    csv += `Items Sold,${document.getElementById('reportItemsSold').textContent}\n`;
    csv += `Average Sale,"${document.getElementById('reportAvgSale').textContent}"\n`;

    // Download CSV file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert('Report exported successfully!');
}

// ==================== TRANSACTION HISTORY ====================
function showTransactionHistory() {
    document.getElementById('historyModal').style.display = 'block';

    const historyList = document.getElementById('historyList');

    if (transactions.length === 0) {
        historyList.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">No transaction history available</div>';
        return;
    }

    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    historyList.innerHTML = sortedTransactions.map(t => `
        <div class="history-item">
            <div class="history-header">
                <span>${t.id}</span>
                <span style="color: #10b981; font-weight: 700;">$${t.total.toFixed(2)}</span>
            </div>
            <div style="font-size: 14px; color: #64748b;">
                📅 ${new Date(t.date).toLocaleString()}
            </div>
            <div style="font-size: 14px; color: #64748b;">
                💳 ${t.paymentMethod.toUpperCase()}
            </div>
            <div class="history-items">
                ${t.items.map(item => `${item.name} (${item.quantity}x)`).join(', ')}
            </div>
        </div>
    `).join('');
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

// ==================== LOCAL STORAGE ====================
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function loadTransactionsFromStorage() {
    const stored = localStorage.getItem('transactions');
    if (stored) {
        transactions = JSON.parse(stored);
    }
}

// ==================== UTILITY FUNCTIONS ====================
// Close modals when clicking outside
window.onclick = function (event) {
    const paymentModal = document.getElementById('paymentModal');
    const reportsModal = document.getElementById('reportsModal');
    const historyModal = document.getElementById('historyModal');

    if (event.target === paymentModal) {
        closePaymentModal();
    }
    if (event.target === reportsModal) {
        closeReportsModal();
    }
    if (event.target === historyModal) {
        closeHistoryModal();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    // F1 - Show Reports
    if (e.key === 'F1') {
        e.preventDefault();
        showReports();
    }
    // F2 - Show Transaction History
    if (e.key === 'F2') {
        e.preventDefault();
        showTransactionHistory();
    }
    // F3 - Focus barcode scanner
    if (e.key === 'F3') {
        e.preventDefault();
        document.getElementById('barcodeInput').focus();
    }
});

console.log('POS System initialized successfully! 🚀');
console.log('Keyboard Shortcuts:');
console.log('F1 - Reports');
console.log('F2 - Transaction History');
console.log('F3 - Focus Scanner');

// ==================== QR CODE SCANNER ====================
function switchScannerMode(mode) {
    const barcodeMode = document.getElementById('barcodeMode');
    const qrMode = document.getElementById('qrMode');
    const tabs = document.querySelectorAll('.tab-btn');

    if (mode === 'barcode') {
        barcodeMode.style.display = 'block';
        qrMode.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
        stopQRScanner();
        document.getElementById('barcodeInput').focus();
    } else {
        barcodeMode.style.display = 'none';
        qrMode.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

async function startQRScanner() {
    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    const status = document.getElementById('scannerStatus');

    try {
        qrStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });

        video.srcObject = qrStream;
        video.style.display = 'block';
        video.play();

        qrScanning = true;
        status.className = 'scanner-status scanning';
        status.textContent = '📷 Camera active - Point at QR code';

        // Start scanning loop
        requestAnimationFrame(scanQRCode);

    } catch (error) {
        status.className = 'scanner-status error';
        status.textContent = '❌ Camera access denied: ' + error.message;
        console.error('QR Scanner error:', error);
    }
}

function stopQRScanner() {
    const video = document.getElementById('qrVideo');
    const status = document.getElementById('scannerStatus');

    if (qrStream) {
        qrStream.getTracks().forEach(track => track.stop());
        qrStream = null;
    }

    video.style.display = 'none';
    qrScanning = false;
    status.className = 'scanner-status';
    status.textContent = 'Ready to scan';
}

function scanQRCode() {
    if (!qrScanning) return;

    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    const canvasContext = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            playSound('success');
            handleQRCodeData(code.data);
            return; // Stop scanning after successful read
        }
    }

    requestAnimationFrame(scanQRCode);
}

function handleQRCodeData(data) {
    const status = document.getElementById('scannerStatus');

    console.log('QR Code Data:', data);

    // Try to parse as JSON (for product data)
    try {
        const qrData = JSON.parse(data);

        if (qrData.barcode || qrData.productId) {
            // Product QR code
            const barcode = qrData.barcode || qrData.productId;
            processBarcode(barcode);
            status.className = 'scanner-status';
            status.textContent = `✅ QR Code scanned: ${barcode}`;
        } else if (qrData.type === 'transaction') {
            // Transaction verification QR
            verifyTransaction(qrData);
        } else {
            // Generic QR data
            status.className = 'scanner-status';
            status.textContent = `📱 QR Data: ${data}`;
        }
    } catch (e) {
        // Not JSON, treat as barcode/product code
        processBarcode(data);
        status.className = 'scanner-status';
        status.textContent = `✅ Code scanned: ${data}`;
    }

    setTimeout(() => {
        status.className = 'scanner-status scanning';
        status.textContent = '📷 Camera active - Point at QR code';
        qrScanning = true;
        requestAnimationFrame(scanQRCode);
    }, 2000);
}

// ==================== BACKEND & SHEETS INTEGRATION ====================
function showBackendConfig() {
    const modal = document.getElementById('backendConfigModal');
    if (!modal) return;
    modal.style.display = 'block';

    const backendUrl = document.getElementById('backendUrl');
    const apiEndpoint = document.getElementById('apiEndpoint');
    const syncInterval = document.getElementById('syncInterval');

    if (backendUrl) backendUrl.value = backendConfig.backendUrl || '';
    if (apiEndpoint) apiEndpoint.value = backendConfig.apiEndpoint || '/api/inventory';
    if (syncInterval) syncInterval.value = backendConfig.syncInterval || 5;
}

function closeBackendModal() {
    closeModal('backendConfigModal');
}

function saveBackendConfig(event) {
    if (event) event.preventDefault();

    backendConfig = {
        ...backendConfig,
        backendUrl: document.getElementById('backendUrl')?.value || '',
        apiEndpoint: document.getElementById('apiEndpoint')?.value || '/api/inventory',
        syncInterval: parseInt(document.getElementById('syncInterval')?.value, 10) || 5
    };

    localStorage.setItem('backendConfig', JSON.stringify(backendConfig));
    alert('✅ Configuration saved successfully!');
    closeBackendModal();
}

async function testBackendConnection() {
    const status = document.getElementById('backendStatus');
    const backendUrl = document.getElementById('backendUrl')?.value?.trim() || backendConfig.backendUrl;

    if (!backendUrl) {
        if (status) {
            status.style.display = 'block';
            status.style.background = '#fef2f2';
            status.style.color = '#b91c1c';
            status.textContent = 'Please enter a backend URL first.';
        }
        return;
    }

    if (status) {
        status.style.display = 'block';
        status.style.background = '#eff6ff';
        status.style.color = '#1d4ed8';
        status.textContent = 'Testing connection...';
    }

    try {
        const response = await fetch(backendUrl, { method: 'GET' });
        if (status) {
            status.style.background = response.ok ? '#dcfce7' : '#fef2f2';
            status.style.color = response.ok ? '#166534' : '#b91c1c';
            status.textContent = response.ok ? '✅ Connection successful.' : '❌ Connection failed.';
        }
    } catch (error) {
        if (status) {
            status.style.background = '#fef2f2';
            status.style.color = '#b91c1c';
            status.textContent = '❌ Connection failed: ' + error.message;
        }
    }
}

function loadBackendConfig() {
    const stored = localStorage.getItem('backendConfig');
    if (stored) {
        backendConfig = JSON.parse(stored);
    }
}

async function testConnection() {
    const sheetsUrl = document.getElementById('sheetsUrl').value;

    if (!sheetsUrl) {
        alert('Please enter Google Sheets URL first');
        return;
    }

    showSyncIndicator('Testing connection...', 'syncing');

    try {
        const testData = {
            action: 'test',
            timestamp: new Date().toISOString()
        };

        const response = await fetch(sheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        showSyncIndicator('✅ Connection test sent! Check your sheet.', 'success');
        setTimeout(hideSyncIndicator, 3000);

    } catch (error) {
        showSyncIndicator('❌ Connection failed: ' + error.message, 'error');
        setTimeout(hideSyncIndicator, 3000);
    }
}

async function syncToSheet() {
    if (!backendConfig.sheetsUrl) {
        alert('Please configure Google Sheets URL first!\nGo to Backend Configuration.');
        return;
    }

    if (transactions.length === 0) {
        alert('No transactions to sync!');
        return;
    }

    showSyncIndicator('Syncing to Google Sheets...', 'syncing');

    try {
        // Prepare data for sheet
        const sheetData = transactions.map(t => ({
            transactionId: t.id,
            date: new Date(t.date).toLocaleString(),
            items: t.items.map(i => `${i.name} (${i.quantity}x)`).join(', '),
            itemCount: t.items.length,
            totalQuantity: t.items.reduce((sum, i) => sum + i.quantity, 0),
            subtotal: t.subtotal,
            tax: t.tax,
            total: t.total,
            paymentMethod: t.paymentMethod,
            amountReceived: t.amountReceived,
            change: t.change
        }));

        const payload = {
            action: 'sync',
            sheetName: backendConfig.sheetName,
            data: sheetData
        };

        // Upload to backend if configured
        if (backendConfig.backendUrl) {
            await uploadToBackend(payload);
        }

        // Upload to Google Sheets
        const response = await fetch(backendConfig.sheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        showSyncIndicator(`✅ Synced ${transactions.length} transactions to sheet!`, 'success');
        setTimeout(hideSyncIndicator, 3000);

        console.log('Sync successful');

    } catch (error) {
        showSyncIndicator('❌ Sync failed: ' + error.message, 'error');
        setTimeout(hideSyncIndicator, 3000);
        console.error('Sync error:', error);
    }
}

async function uploadToBackend(data) {
    if (!backendConfig.backendUrl) return;

    const headers = {
        'Content-Type': 'application/json'
    };

    if (backendConfig.apiKey) {
        headers['Authorization'] = `Bearer ${backendConfig.apiKey}`;
    }

    const response = await fetch(backendConfig.backendUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Backend upload failed: ${response.statusText}`);
    }

    return response.json();
}

function showSyncIndicator(message, type = 'success') {
    let indicator = document.getElementById('syncIndicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'syncIndicator';
        indicator.className = 'sync-indicator';
        document.body.appendChild(indicator);
    }

    indicator.textContent = message;
    indicator.className = `sync-indicator ${type}`;
    indicator.style.display = 'block';
}

function hideSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

async function verifyTransaction(qrData) {
    // Verify transaction against stored data
    const transaction = transactions.find(t => t.id === qrData.id);

    const status = document.getElementById('scannerStatus');

    if (transaction) {
        status.className = 'scanner-status';
        status.textContent = `✅ Valid Transaction: ${transaction.id} - $${transaction.total.toFixed(2)}`;
        playSound('success');
    } else {
        status.className = 'scanner-status error';
        status.textContent = `❌ Invalid or unknown transaction`;
        playSound('error');
    }
}

// Note: Legacy inventory functions (displayInventory, updateInventorySummary, etc.) have been removed 
// and replaced with unified dashboard logic at the top of the file.

// ==================== ADD/EDIT PRODUCT FORMS ====================

function showAddProductForm() {
    const modal = document.getElementById('productFormModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productFormTitle');

    // Reset form
    form.reset();
    document.getElementById('editProductId').value = '';
    title.textContent = '➕ Add New Product';

    modal.style.display = 'block';
}

function closeProductForm() {
    const modal = document.getElementById('productFormModal');
    modal.style.display = 'none';
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('productFormModal');
    const title = document.getElementById('formTitle');

    // Populate form fields properly (standardization)
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productSKU').value = product.sku || product.SKU || '';
    document.getElementById('productBarcode').value = product.barcode || '';
    document.getElementById('productCategory').value = product.category || 'Other';
    document.getElementById('productIcon').value = product.icon || '📦';
    document.getElementById('productPrice').value = product.price || 0;
    document.getElementById('productStock').value = product.stock || 0;
    document.getElementById('minStock').value = product.minStock || 10;
    document.getElementById('supplier').value = product.supplier || '';
    document.getElementById('editProductId').value = productId;

    if (title) title.textContent = '✏️ Edit Product';
    modal.style.display = 'block';
}

function saveProduct(event) {
    event.preventDefault();

    const editId = document.getElementById('editProductId').value;
    const productData = {
        name: document.getElementById('productName').value,
        sku: document.getElementById('productSKU').value || `SKU-${Date.now()}`,
        barcode: document.getElementById('productBarcode').value || `BAR-${Date.now()}`,
        category: document.getElementById('productCategory').value || 'Other',
        icon: document.getElementById('productIcon').value || '📦',
        price: parseFloat(document.getElementById('productPrice').value) || 0,
        stock: parseInt(document.getElementById('productStock').value) || 0,
        minStock: parseInt(document.getElementById('minStock').value) || 10,
        supplier: document.getElementById('supplier').value || 'Manual',
        lastRestocked: new Date().toISOString()
    };

    if (editId) {
        // Update existing product
        const idInt = parseInt(editId);
        const index = products.findIndex(p => p.id === idInt);
        if (index !== -1) {
            products[index] = { ...products[index], ...productData, id: idInt };
            showNotification('✅ Product updated successfully!', 'success');
        }
    } else {
        // Add new product
        const newProduct = {
            id: Math.max(...products.map(p => p.id), 0) + 1,
            ...productData
        };
        products.push(newProduct);
        showNotification('✅ Product added successfully!', 'success');
    }

    // Save to localStorage
    saveInventory();

    // Refresh unified displays
    updateInventoryDashboard();
    populateCategoryFilter();
    displayInventoryTable(products);
    displayProducts(); // Refresh POS grid

    // Close modal
    closeProductForm();
}

function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;

    const index = products.findIndex(p => p.id === productId);
    if (index !== -1) {
        const productName = products[index].name;
        products.splice(index, 1);
        saveInventory();

        updateInventoryDashboard();
        populateCategoryFilter();
        displayInventoryTable();
        displayProducts();

        showNotification(`🗑️ ${productName} deleted successfully!`, 'success');
    }
}

function showNotification(message, type = 'success') {
    const status = document.getElementById('scannerStatus');
    if (status) {
        status.className = `scanner-status ${type === 'error' ? 'error' : ''}`;
        status.textContent = message;

        setTimeout(() => {
            status.className = 'scanner-status';
            status.textContent = 'Ready to scan...';
        }, 3000);
    }
}

// ==================== QUICK STOCK UPDATE ====================

function quickUpdateStock(productId, change) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    product.stock = Math.max(0, product.stock + change);
    product.lastRestocked = new Date().toISOString().split('T')[0];

    saveInventory();

    // Refresh unified displays
    updateInventoryDashboard();
    displayInventoryTable(products);
    if (typeof updateInventoryTableDisplay === 'function') updateInventoryTableDisplay();

    const action = change > 0 ? '➕ Added' : '➖ Reduced';
    showNotification(`${action} ${product.name} stock to ${product.stock}`, 'success');
}

// ==================== CSV IMPORT ====================

function importInventoryCSV(event) {
    importInventoryFile(event);
}

// ==================== QUICK ADD MODAL ====================

function showQuickAddForm() {
    const modal = document.getElementById('quickAddModal');
    const form = document.getElementById('quickAddForm');

    // Reset form
    form.reset();

    // Populate category dropdown
    const categorySelect = document.getElementById('quickProductCategory');
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.icon + ' ' + cat.name;
        categorySelect.appendChild(option);
    });

    modal.style.display = 'block';
}

function closeQuickAddForm() {
    const modal = document.getElementById('quickAddModal');
    modal.style.display = 'none';
}

function saveQuickProduct(event) {
    event.preventDefault();

    // Generate SKU and Barcode automatically
    const timestamp = Date.now();
    const newProduct = {
        id: Math.max(...products.map(p => p.id), 0) + 1,
        name: document.getElementById('quickProductName').value,
        sku: 'SKU-' + timestamp,
        barcode: 'BAR-' + timestamp,
        category: document.getElementById('quickProductCategory').value,
        icon: '📦',
        price: parseFloat(document.getElementById('quickProductPrice').value),
        stock: parseInt(document.getElementById('quickProductStock').value),
        minStock: 5, // Default minimum
        supplier: 'Quick Add',
        lastRestocked: new Date().toISOString().split('T')[0]
    };

    products.push(newProduct);
    saveInventory();

    // Refresh unified displays
    updateInventoryDashboard();
    displayInventoryTable(products);
    displayProducts(); // Refresh POS grid

    if (typeof updateInventoryTableDisplay === 'function') updateInventoryTableDisplay();

    showNotification(`✅ ${newProduct.name} added quickly!`, 'success');
    closeQuickAddForm();
}

// ==================== DEDICATED INVENTORY PAGE ====================

function openFullInventoryPage() {
    showInventoryPage();
}

// Update table display with quick stock buttons
function updateInventoryTableDisplay() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    // Re-render table with quick buttons in actions column
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        // Find the last cell (actions) and update it
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const lastCell = cells[cells.length - 1];
            const product = products[index];
            if (product) {
                lastCell.innerHTML = `
                    <div class="action-btns-quick">
                        <button class="btn-quick-stock" onclick="quickUpdateStock(${product.id}, -1)" title="Decrease">➖</button>
                        <span class="stock-value">${product.stock}</span>
                        <button class="btn-quick-stock" onclick="quickUpdateStock(${product.id}, 1)" title="Increase">➕</button>
                        <button class="btn-edit" onclick="editProduct(${product.id})">✏️</button>
                        <button class="btn-delete" onclick="deleteProduct(${product.id})">🗑️</button>
                    </div>
                `;
            }
        }
    });
}

// ==================== SETTINGS & MAINTENANCE ====================

function savePOSSettings(event) {
    if (event) event.preventDefault();

    posSettings = {
        storeName: document.getElementById('settingStoreName').value,
        name: document.getElementById('settingPosName').value,
        address: document.getElementById('settingStoreAddress').value,
        phone: document.getElementById('settingStorePhone').value,
        trn: document.getElementById('settingStoreTRN').value,
        currency: document.getElementById('settingCurrency').value || '₨'
    };

    localStorage.setItem('posSettings', JSON.stringify(posSettings));
    showNotification('✅ Store settings saved successfully!', 'success');
}

function showInventorySheetModal() {
    const modal = document.getElementById('inventorySheetModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        alert('Inventory import feature is currently loading or unavailable.');
    }
}

function exportToCSV() {
    if (products.length === 0) {
        alert('No data to export!');
        return;
    }

    const headers = ['Icon', 'Name', 'SKU', 'Barcode', 'Category', 'Price', 'Stock', 'Min Stock', 'Supplier', 'Last Restocked'];
    const rows = products.map(p => [
        p.icon || '📦',
        p.name,
        p.sku || p.SKU,
        p.barcode,
        p.category,
        p.price,
        p.stock,
        p.minStock || 0,
        p.supplier || '',
        p.lastRestocked || ''
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pos_inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('✅ Inventory exported to CSV', 'success');
}
