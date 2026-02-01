// Check authentication
(function () {
    const session = sessionStorage.getItem('userSession');
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(session);
    document.getElementById('userName').textContent = user.name;
})();

// Load data from localStorage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let products = JSON.parse(localStorage.getItem('products')) || [
    { id: 1, name: "Apple", barcode: "1234567890", price: 1.99, stock: 100, icon: "🍎", sales: 45 },
    { id: 2, name: "Banana", barcode: "2345678901", price: 0.99, stock: 150, icon: "🍌", sales: 38 },
    { id: 3, name: "Orange", barcode: "3456789012", price: 2.49, stock: 80, icon: "🍊", sales: 32 },
    { id: 4, name: "Milk", barcode: "4567890123", price: 3.99, stock: 50, icon: "🥛", sales: 28 },
    { id: 5, name: "Bread", barcode: "5678901234", price: 2.99, stock: 40, icon: "🍞", sales: 25 }
];

let customers = JSON.parse(localStorage.getItem('customers')) || [
    { id: 1, name: "Ahmed Ali", email: "ahmed@example.com", phone: "+971501234567", totalSpent: 450.50 },
    { id: 2, name: "Fatima Hassan", email: "fatima@example.com", phone: "+971501234568", totalSpent: 380.20 },
    { id: 3, name: "Mohammed Saeed", email: "mohammed@example.com", phone: "+971501234569", totalSpent: 520.75 }
];

let companyProfile = JSON.parse(localStorage.getItem('companyProfile')) || {
    name: "AL DAR AL ARABI TR ELECTRIC DEVICE LLC",
    email: "info@aldaralarabi.com",
    phone: "+971 XX XXX XXXX",
    address: "Dubai, UAE",
    trn: "",
    license: "",
    logo: "",
    description: ""
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function () {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadDashboardStats();
    loadRecentTransactions();
    loadTopProducts();
    loadProducts();
    loadCustomers();
    loadCompanyProfile();
    createSalesChart();
});

// Update Date & Time
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('dashDateTime').textContent = now.toLocaleDateString('en-US', options);
}

// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Show Section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionName + '-section').classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(sectionName)) {
            link.classList.add('active');
        }
    });

    // Update page title
    const titles = {
        overview: 'Dashboard Overview',
        sales: 'Sales Management',
        products: 'Products Management',
        customers: 'Customers Management',
        reports: 'Reports & Analytics',
        company: 'Company Profile'
    };
    document.getElementById('pageTitle').textContent = titles[sectionName];

    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

// Load Dashboard Stats
function loadDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's transactions
    const todayTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        txDate.setHours(0, 0, 0, 0);
        return txDate.getTime() === today.getTime();
    });

    // Calculate stats
    const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    const todayTxCount = todayTransactions.length;
    const totalProducts = products.length;
    const totalCustomers = customers.length;

    // Update UI
    document.getElementById('todaySales').textContent = `$${todaySales.toFixed(2)}`;
    document.getElementById('todayTransactions').textContent = todayTxCount;
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalCustomers').textContent = totalCustomers;
}

// Load Recent Transactions
function loadRecentTransactions() {
    const recentTx = transactions.slice(-10).reverse();

    const html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Payment</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${recentTx.map(tx => `
                    <tr>
                        <td>${tx.id}</td>
                        <td>${new Date(tx.date).toLocaleString()}</td>
                        <td>${tx.items.length} items</td>
                        <td>${tx.paymentMethod.toUpperCase()}</td>
                        <td style="color: #10b981; font-weight: 700;">$${tx.total.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('recentTransactions').innerHTML = html || '<p>No transactions yet</p>';
}

// Load Top Products
function loadTopProducts() {
    const topProducts = products.sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 5);

    const html = topProducts.map((product, index) => `
        <div class="product-item">
            <div class="product-info">
                <div class="product-rank">${index + 1}</div>
                <div>
                    <div><strong>${product.icon} ${product.name}</strong></div>
                    <div style="font-size: 12px; color: #64748b;">Stock: ${product.stock}</div>
                </div>
            </div>
            <div class="product-sales">${product.sales || 0} sold</div>
        </div>
    `).join('');

    document.getElementById('topProducts').innerHTML = html;
}

// Create Sales Chart
function createSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    // Get last 7 days data
    const last7Days = [];
    const salesData = [];

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

    // Draw chart
    const maxSales = Math.max(...salesData, 100);
    const chartHeight = 250;
    const chartWidth = canvas.width - 100;
    const barWidth = chartWidth / last7Days.length - 20;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bars
    salesData.forEach((sales, index) => {
        const barHeight = (sales / maxSales) * chartHeight;
        const x = 50 + (index * (barWidth + 20));
        const y = chartHeight - barHeight + 20;

        // Draw bar
        const gradient = ctx.createLinearGradient(0, y, 0, chartHeight + 20);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#2563eb');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw value
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`$${sales.toFixed(0)}`, x + barWidth / 2, y - 5);

        // Draw day label
        ctx.fillStyle = '#64748b';
        ctx.fillText(last7Days[index], x + barWidth / 2, chartHeight + 40);
    });
}

// Load Products
function loadProducts() {
    const html = products.map(product => `
        <div class="product-card-dash">
            <div style="font-size: 48px;">${product.icon}</div>
            <h4>${product.name}</h4>
            <p>Barcode: ${product.barcode}</p>
            <p style="color: #3b82f6; font-weight: 700; font-size: 18px;">$${product.price.toFixed(2)}</p>
            <p style="color: ${product.stock > 10 ? '#10b981' : '#ef4444'};">
                Stock: ${product.stock}
            </p>
            <div class="product-actions">
                <button class="btn btn-success" onclick="editProduct(${product.id})" style="padding: 5px 10px; font-size: 12px; margin: 2px;">✏️ Edit</button>
                <button class="btn btn-danger" onclick="deleteProduct(${product.id})" style="padding: 5px 10px; font-size: 12px; margin: 2px;">🗑️ Delete</button>
            </div>
        </div>
    `).join('');

    document.getElementById('productsGrid').innerHTML = html;
}

// Load Customers
function loadCustomers() {
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Total Spent</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${customers.map(customer => `
                    <tr>
                        <td><strong>${customer.name}</strong></td>
                        <td>${customer.email}</td>
                        <td>${customer.phone}</td>
                        <td style="color: #10b981; font-weight: 700;">$${customer.totalSpent.toFixed(2)}</td>
                        <td>
                            <button class="btn btn-primary" style="padding: 5px 10px; font-size: 12px;">
                                Edit
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('customersList').innerHTML = html;
}

// Load Company Profile
function loadCompanyProfile() {
    document.getElementById('companyName').value = companyProfile.name || '';
    document.getElementById('companyEmail').value = companyProfile.email || '';
    document.getElementById('companyPhone').value = companyProfile.phone || '';
    document.getElementById('companyAddress').value = companyProfile.address || '';
    document.getElementById('companyTRN').value = companyProfile.trn || '';
    document.getElementById('companyLicense').value = companyProfile.license || '';
    document.getElementById('companyLogo').value = companyProfile.logo || '';
    document.getElementById('companyDescription').value = companyProfile.description || '';
}

// Save Company Profile
function saveCompanyProfile() {
    companyProfile = {
        name: document.getElementById('companyName').value,
        email: document.getElementById('companyEmail').value,
        phone: document.getElementById('companyPhone').value,
        address: document.getElementById('companyAddress').value,
        trn: document.getElementById('companyTRN').value,
        license: document.getElementById('companyLicense').value,
        logo: document.getElementById('companyLogo').value,
        description: document.getElementById('companyDescription').value
    };

    localStorage.setItem('companyProfile', JSON.stringify(companyProfile));
    alert('✅ Company profile saved successfully!');
}

// Report Functions
function generateDailyReport() {
    showSection('reports');
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));

    const todayTransactions = transactions.filter(t =>
        new Date(t.date) >= todayStart
    );

    const totalSales = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalItems = todayTransactions.reduce((sum, t) =>
        sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );

    const reportContent = `
        <div class="stats-summary">
            <div class="stat-box">
                <h4>Total Sales</h4>
                <p class="stat-number">₨ ${totalSales.toFixed(2)}</p>
            </div>
            <div class="stat-box">
                <h4>Transactions</h4>
                <p class="stat-number">${todayTransactions.length}</p>
            </div>
            <div class="stat-box">
                <h4>Items Sold</h4>
                <p class="stat-number">${totalItems}</p>
            </div>
            <div class="stat-box">
                <h4>Average Sale</h4>
                <p class="stat-number">₨ ${(todayTransactions.length > 0 ? totalSales / todayTransactions.length : 0).toFixed(2)}</p>
            </div>
        </div>
        <h4 style="margin-top: 30px;">Recent Transactions</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Transaction ID</th>
                    <th>Items</th>
                    <th>Payment Method</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${todayTransactions.slice(-10).reverse().map(t => `
                    <tr>
                        <td>${new Date(t.date).toLocaleTimeString()}</td>
                        <td>${t.id}</td>
                        <td>${t.items.length} items</td>
                        <td>${t.paymentMethod}</td>
                        <td>₨ ${t.total.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    displayReport('Daily Sales Report - ' + new Date().toLocaleDateString(), reportContent);
}

function generateWeeklyReport() {
    showSection('reports');
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekTransactions = transactions.filter(t =>
        new Date(t.date) >= weekAgo
    );

    const totalSales = weekTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalItems = weekTransactions.reduce((sum, t) =>
        sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );

    // Daily breakdown
    const dailyData = {};
    weekTransactions.forEach(t => {
        const date = new Date(t.date).toLocaleDateString();
        if (!dailyData[date]) {
            dailyData[date] = { sales: 0, count: 0 };
        }
        dailyData[date].sales += t.total;
        dailyData[date].count += 1;
    });

    const reportContent = `
        <div class="stats-summary">
            <div class="stat-box">
                <h4>Total Sales (7 Days)</h4>
                <p class="stat-number">₨ ${totalSales.toFixed(2)}</p>
            </div>
            <div class="stat-box">
                <h4>Transactions</h4>
                <p class="stat-number">${weekTransactions.length}</p>
            </div>
            <div class="stat-box">
                <h4>Items Sold</h4>
                <p class="stat-number">${totalItems}</p>
            </div>
            <div class="stat-box">
                <h4>Daily Average</h4>
                <p class="stat-number">₨ ${(totalSales / 7).toFixed(2)}</p>
            </div>
        </div>
        <h4 style="margin-top: 30px;">Daily Breakdown</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Transactions</th>
                    <th>Total Sales</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(dailyData).map(([date, data]) => `
                    <tr>
                        <td>${date}</td>
                        <td>${data.count}</td>
                        <td>₨ ${data.sales.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    displayReport('Weekly Sales Report', reportContent);
}

function generateMonthlyReport() {
    showSection('reports');
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthTransactions = transactions.filter(t =>
        new Date(t.date) >= monthStart
    );

    const totalSales = monthTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalItems = monthTransactions.reduce((sum, t) =>
        sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );

    // Payment method breakdown
    const paymentMethods = {};
    monthTransactions.forEach(t => {
        if (!paymentMethods[t.paymentMethod]) {
            paymentMethods[t.paymentMethod] = { count: 0, total: 0 };
        }
        paymentMethods[t.paymentMethod].count += 1;
        paymentMethods[t.paymentMethod].total += t.total;
    });

    const reportContent = `
        <div class="stats-summary">
            <div class="stat-box">
                <h4>Total Sales (This Month)</h4>
                <p class="stat-number">₨ ${totalSales.toFixed(2)}</p>
            </div>
            <div class="stat-box">
                <h4>Transactions</h4>
                <p class="stat-number">${monthTransactions.length}</p>
            </div>
            <div class="stat-box">
                <h4>Items Sold</h4>
                <p class="stat-number">${totalItems}</p>
            </div>
            <div class="stat-box">
                <h4>Average Transaction</h4>
                <p class="stat-number">₨ ${(monthTransactions.length > 0 ? totalSales / monthTransactions.length : 0).toFixed(2)}</p>
            </div>
        </div>
        <h4 style="margin-top: 30px;">Payment Methods</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Payment Method</th>
                    <th>Transactions</th>
                    <th>Total Amount</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(paymentMethods).map(([method, data]) => `
                    <tr>
                        <td>${method}</td>
                        <td>${data.count}</td>
                        <td>₨ ${data.total.toFixed(2)}</td>
                        <td>${((data.total / totalSales) * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    displayReport('Monthly Sales Report - ' + today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), reportContent);
}

function generateInventoryReport() {
    showSection('reports');

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStock = products.filter(p => p.stock <= p.minStock);
    const outOfStock = products.filter(p => p.stock === 0);
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    const reportContent = `
        <div class="stats-summary">
            <div class="stat-box">
                <h4>Total Products</h4>
                <p class="stat-number">${totalProducts}</p>
            </div>
            <div class="stat-box">
                <h4>Total Stock</h4>
                <p class="stat-number">${totalStock} items</p>
            </div>
            <div class="stat-box warning">
                <h4>Low Stock Items</h4>
                <p class="stat-number">${lowStock.length}</p>
            </div>
            <div class="stat-box danger">
                <h4>Out of Stock</h4>
                <p class="stat-number">${outOfStock.length}</p>
            </div>
        </div>
        <div class="stats-summary">
            <div class="stat-box">
                <h4>Total Inventory Value</h4>
                <p class="stat-number">₨ ${totalValue.toFixed(2)}</p>
            </div>
        </div>
        
        ${lowStock.length > 0 ? `
            <h4 style="margin-top: 30px; color: #f59e0b;">⚠️ Low Stock Alert</h4>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Current Stock</th>
                        <th>Min Stock</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${lowStock.map(p => `
                        <tr class="${p.stock === 0 ? 'danger-row' : 'warning-row'}">
                            <td>${p.icon} ${p.name}</td>
                            <td>${p.category}</td>
                            <td>${p.stock}</td>
                            <td>${p.minStock}</td>
                            <td>${p.stock === 0 ? '❌ Out of Stock' : '⚠️ Low Stock'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="margin-top: 20px; color: #10b981;">✅ All products have adequate stock levels!</p>'}
        
        <h4 style="margin-top: 30px;">Stock by Category</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Products</th>
                    <th>Total Stock</th>
                    <th>Total Value</th>
                </tr>
            </thead>
            <tbody>
                ${[...new Set(products.map(p => p.category))].map(cat => {
        const catProducts = products.filter(p => p.category === cat);
        const catStock = catProducts.reduce((sum, p) => sum + p.stock, 0);
        const catValue = catProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
        return `
                        <tr>
                            <td>${cat}</td>
                            <td>${catProducts.length}</td>
                            <td>${catStock} items</td>
                            <td>₨ ${catValue.toFixed(2)}</td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;

    displayReport('Inventory Report', reportContent);
}

function displayReport(title, content) {
    document.getElementById('reportTitle').textContent = title;
    document.getElementById('reportContent').innerHTML = content;
    document.getElementById('reportSummary').style.display = 'block';

    // Scroll to report
    document.getElementById('reportSummary').scrollIntoView({ behavior: 'smooth' });
}

function closeReport() {
    document.getElementById('reportSummary').style.display = 'none';
}

function printReport() {
    const printWindow = window.open('', '', 'height=600,width=800');
    const reportTitle = document.getElementById('reportTitle').textContent;
    const reportContent = document.getElementById('reportContent').innerHTML;

    printWindow.document.write(`
        <html>
        <head>
            <title>${reportTitle}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h3 { color: #2563eb; }
                .stats-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                .stat-box { padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; }
                .stat-number { font-size: 24px; font-weight: bold; color: #2563eb; margin: 10px 0; }
                .report-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .report-table th, .report-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                .report-table th { background: #f3f4f6; font-weight: 600; }
                .warning-row { background: #fef3c7; }
                .danger-row { background: #fee2e2; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <h3>${reportTitle}</h3>
            <p>Generated: ${new Date().toLocaleString()}</p>
            ${reportContent}
        </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

function exportReportPDF() {
    alert('PDF export functionality coming soon!\n\nFor now, use Print and "Save as PDF" option.');
    printReport();
}

// Filter Sales
function filterSales() {
    alert('Filtering sales data...');
}

// Export Sales
function exportSales() {
    const csv = 'Transaction ID,Date,Items,Payment,Total\n' +
        transactions.map(t =>
            `${t.id},${new Date(t.date).toLocaleString()},${t.items.length},${t.paymentMethod},$${t.total.toFixed(2)}`
        ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// Add Product
function showAddProduct() {
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModal').style.display = 'block';
}

// Edit Product
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productBarcode').value = product.barcode || '';
    document.getElementById('productCategory').value = product.category || 'Other';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productIcon').value = product.icon || '📦';
    document.getElementById('productModal').style.display = 'block';
}

// Save Product
function saveProduct(event) {
    event.preventDefault();

    const id = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value,
        barcode: document.getElementById('productBarcode').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        icon: document.getElementById('productIcon').value || '📦'
    };

    if (id) {
        // Update existing product
        const index = products.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            products[index] = { ...products[index], ...productData };
        }
    } else {
        // Add new product
        const newProduct = {
            id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
            ...productData,
            sales: 0
        };
        products.push(newProduct);
    }

    localStorage.setItem('products', JSON.stringify(products));
    loadProducts();
    closeProductModal();
    alert(id ? '✅ Product updated successfully!' : '✅ Product added successfully!');
}

// Delete Product
function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
        products.splice(index, 1);
        localStorage.setItem('products', JSON.stringify(products));
        loadProducts();
        alert('✅ Product deleted successfully!');
    }
}

// Close Product Modal
function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    document.getElementById('productForm').reset();
}

// Add Customer
function showAddCustomer() {
    const name = prompt('Customer Name:');
    if (!name) return;

    const email = prompt('Email:');
    const phone = prompt('Phone:');

    const newCustomer = {
        id: customers.length + 1,
        name,
        email,
        phone,
        totalSpent: 0
    };

    customers.push(newCustomer);
    localStorage.setItem('customers', JSON.stringify(customers));
    loadCustomers();
    alert('✅ Customer added successfully!');
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('userSession');
        window.location.href = 'login.html';
    }
}

// Responsive sidebar
window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
        document.getElementById('sidebar').classList.remove('active');
    }
});
