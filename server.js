const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Database Connection
const db = new sqlite3.Database('./pos_database.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('✅ Connected to SQLite database');
        initializeTables();
    }
});

// Initialize Database Tables
function initializeTables() {
    let tableCount = 0;

    // Users Table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            role TEXT NOT NULL,
            store TEXT,
            permissions TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creating users table:', err);
        else console.log('✅ Users table ready');
        tableCount++;
        if (tableCount === 4) createDefaultAdmin();
    });

    // Products Table
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT UNIQUE,
            barcode TEXT UNIQUE,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            min_stock INTEGER DEFAULT 10,
            supplier TEXT,
            description TEXT,
            last_restocked DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creating products table:', err);
        else console.log('✅ Products table ready');
        tableCount++;
        if (tableCount === 4) createDefaultAdmin();
    });

    // Transactions Table
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT UNIQUE NOT NULL,
            cashier TEXT NOT NULL,
            items TEXT NOT NULL,
            subtotal REAL NOT NULL,
            discount REAL DEFAULT 0,
            tax REAL DEFAULT 0,
            total REAL NOT NULL,
            payment_method TEXT NOT NULL,
            received_amount REAL,
            change_amount REAL,
            notes TEXT,
            date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creating transactions table:', err);
        else console.log('✅ Transactions table ready');
        tableCount++;
        if (tableCount === 4) createDefaultAdmin();
    });

    // Companies Table
    db.run(`
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            contact TEXT,
            email TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating companies table:', err);
        } else {
            console.log('✅ Companies table ready');
        }
        tableCount++;
        if (tableCount === 4) createDefaultAdmin();
    });
}

// Create default admin user
function createDefaultAdmin() {
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`
        INSERT OR IGNORE INTO users (username, password, name, email, role, permissions)
        VALUES (?, ?, ?, ?, ?, ?)
    `, ['admin', defaultPassword, 'Admin User', 'admin@pos.com', 'admin',
        JSON.stringify(['sales', 'reports', 'manage_products', 'manage_users', 'settings'])
    ], (err) => {
        if (err) console.error('Error creating default admin:', err);
        else console.log('✅ Default admin user ready');
        // Start server after admin user is ready
        startServer();
    });
}

// Start Server
function startServer() {
    app.listen(PORT, () => {
        console.log(`\n🚀 POS Server running on http://localhost:${PORT}`);
        console.log(`📊 Database: SQLite (pos_database.db)`);
        console.log(`🔐 Default Admin: username=admin, password=admin123\n`);
    });
}

// =================== USER ROUTES ===================

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Compare password
        const isValidPassword = bcrypt.compareSync(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Remove password from response
        delete user.password;
        user.permissions = JSON.parse(user.permissions || '[]');

        res.json({
            success: true,
            message: 'Login successful',
            user: user
        });
    });
});

// Register
app.post('/api/register', (req, res) => {
    const { username, password, name, email, phone, role, store } = req.body;

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Set permissions based on role
    let permissions = [];
    if (role === 'admin') {
        permissions = ['sales', 'reports', 'manage_products', 'manage_users', 'settings'];
    } else if (role === 'manager') {
        permissions = ['sales', 'reports', 'manage_products'];
    } else {
        permissions = ['sales'];
    }

    db.run(`
        INSERT INTO users (username, password, name, email, phone, role, store, permissions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [username, hashedPassword, name, email, phone, role, store, JSON.stringify(permissions)],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ success: false, message: 'Username or email already exists' });
                }
                return res.status(500).json({ success: false, message: 'Registration failed' });
            }

            res.json({
                success: true,
                message: 'Registration successful',
                userId: this.lastID
            });
        });
});

// Get all users
app.get('/api/users', (req, res) => {
    db.all('SELECT id, username, name, email, phone, role, store, is_active, created_at FROM users', [], (err, users) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, users });
    });
});

// =================== PRODUCT ROUTES ===================

// Get all products
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY category, name', [], (err, products) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, products });
    });
});

// Get products by category
app.get('/api/products/category/:category', (req, res) => {
    const { category } = req.params;
    db.all('SELECT * FROM products WHERE category = ? ORDER BY name', [category], (err, products) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, products });
    });
});

// Add product
app.post('/api/products', (req, res) => {
    const { name, sku, barcode, category, price, stock, description } = req.body;
    db.run(`
        INSERT INTO products (name, sku, barcode, category, price, stock, description, last_restocked)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [name, sku, barcode, category, price, stock, description], function (err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to add product' });
        }
        res.json({ success: true, productId: this.lastID });
    });
});

// Update product
app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, sku, barcode, category, price, stock, description } = req.body;
    db.run(`
        UPDATE products SET name=?, sku=?, barcode=?, category=?, price=?, stock=?, description=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    `, [name, sku, barcode, category, price, stock, description, id], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to update product' });
        }
        res.json({ success: true });
    });
});

// Update product stock
app.put('/api/products/:id/stock', (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    db.run('UPDATE products SET stock=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [stock, id], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to update stock' });
        }
        res.json({ success: true });
    });
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM products WHERE id=?', [id], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to delete product' });
        }
        res.json({ success: true });
    });
});

// =================== TRANSACTION ROUTES ===================

// Save transaction
app.post('/api/transactions', (req, res) => {
    const { transaction_id, cashier, items, subtotal, discount, tax, total, payment_method, received_amount, change_amount, notes } = req.body;
    db.run(`
        INSERT INTO transactions (transaction_id, cashier, items, subtotal, discount, tax, total, payment_method, received_amount, change_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [transaction_id, cashier, items, subtotal, discount, tax, total, payment_method, received_amount, change_amount, notes],
        function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to save transaction' });
            }
            res.json({ success: true, transactionId: this.lastID });
        });
});

// Get all transactions
app.get('/api/transactions', (req, res) => {
    db.all('SELECT * FROM transactions ORDER BY date DESC', [], (err, transactions) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, transactions });
    });
});

// Get transactions by date range
app.get('/api/transactions/date/:startDate/:endDate', (req, res) => {
    const { startDate, endDate } = req.params;
    db.all(`
        SELECT * FROM transactions 
        WHERE date BETWEEN ? AND ? 
        ORDER BY date DESC
    `, [startDate, endDate], (err, transactions) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, transactions });
    });
});

// =================== REPORT ROUTES ===================

// Get sales summary
app.get('/api/reports/summary', (req, res) => {
    db.all(`
        SELECT 
            DATE(date) as date,
            COUNT(*) as total_transactions,
            SUM(total) as total_sales,
            SUM(discount) as total_discount,
            SUM(tax) as total_tax
        FROM transactions
        GROUP BY DATE(date)
        ORDER BY date DESC
    `, [], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, report: result });
    });
});

// Get top products
app.get('/api/reports/top-products', (req, res) => {
    db.all(`
        SELECT 
            name, 
            category, 
            COUNT(*) as times_sold,
            SUM(price * quantity) as revenue
        FROM products
        LIMIT 10
    `, [], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, report: result });
    });
});

// Get daily sales
app.get('/api/reports/daily', (req, res) => {
    db.all(`
        SELECT 
            DATE(date) as date,
            SUM(total) as daily_sales,
            COUNT(*) as transaction_count
        FROM transactions
        GROUP BY DATE(date)
        ORDER BY date DESC
    `, [], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, report: result[0] });
    });
});

// Get low stock products
app.get('/api/reports/low-stock', (req, res) => {
    db.all('SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC', [], (err, products) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, products });
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('\n✅ Database connection closed');
        }
        process.exit(0);
    });
});
