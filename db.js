/**
 * IndexedDB Database Manager for POS System
 * Provides offline-first database functionality
 */

const DB_NAME = 'POSDB';
const DB_VERSION = 1;
let db;

// Initialize Database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database failed to open');
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('Database opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;

            // Users Store
            if (!db.objectStoreNames.contains('users')) {
                const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                usersStore.createIndex('username', 'username', { unique: true });
                usersStore.createIndex('email', 'email', { unique: true });
                usersStore.createIndex('role', 'role', { unique: false });
                console.log('Users store created');
            }

            // Products Store
            if (!db.objectStoreNames.contains('products')) {
                const productsStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                productsStore.createIndex('barcode', 'barcode', { unique: true });
                productsStore.createIndex('sku', 'sku', { unique: false });
                productsStore.createIndex('category', 'category', { unique: false });
                productsStore.createIndex('name', 'name', { unique: false });
                console.log('Products store created');
            }

            // Transactions Store
            if (!db.objectStoreNames.contains('transactions')) {
                const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                transactionsStore.createIndex('date', 'date', { unique: false });
                transactionsStore.createIndex('cashier', 'cashier', { unique: false });
                transactionsStore.createIndex('paymentMethod', 'paymentMethod', { unique: false });
                console.log('Transactions store created');
            }

            // Settings Store
            if (!db.objectStoreNames.contains('settings')) {
                const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                console.log('Settings store created');
            }

            // Companies Store (for multi-company feature)
            if (!db.objectStoreNames.contains('companies')) {
                const companiesStore = db.createObjectStore('companies', { keyPath: 'id', autoIncrement: true });
                companiesStore.createIndex('name', 'name', { unique: true });
                console.log('Companies store created');
            }
        };
    });
}

// ============= USERS OPERATIONS =============

// Add User
function addUser(user) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.add(user);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get User by Username
function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('username');
        const request = index.get(username);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get User by Email
function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('email');
        const request = index.get(email);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get All Users
function getAllUsers() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Update User
function updateUser(id, userData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.get(id);

        request.onsuccess = () => {
            const user = request.result;
            if (user) {
                Object.assign(user, userData);
                const updateRequest = store.put(user);
                updateRequest.onsuccess = () => resolve(updateRequest.result);
                updateRequest.onerror = () => reject(updateRequest.error);
            } else {
                reject(new Error('User not found'));
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// Delete User
function deleteUser(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ============= PRODUCTS OPERATIONS =============

// Add Product
function addProduct(product) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        const request = store.add(product);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get Product by ID
function getProductById(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get Product by Barcode
function getProductByBarcode(barcode) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('barcode');
        const request = index.get(barcode);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get All Products
function getAllProducts() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get Products by Category
function getProductsByCategory(category) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['products'], 'readonly');
        const store = transaction.objectStore('products');
        const index = store.index('category');
        const request = index.getAll(category);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Update Product
function updateProduct(id, productData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        const request = store.get(id);

        request.onsuccess = () => {
            const product = request.result;
            if (product) {
                Object.assign(product, productData);
                const updateRequest = store.put(product);
                updateRequest.onsuccess = () => resolve(updateRequest.result);
                updateRequest.onerror = () => reject(updateRequest.error);
            } else {
                reject(new Error('Product not found'));
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// Delete Product
function deleteProduct(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ============= TRANSACTIONS OPERATIONS =============

// Add Transaction
function addTransaction(transaction) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['transactions'], 'readwrite');
        const store = tx.objectStore('transactions');
        const request = store.add(transaction);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get All Transactions
function getAllTransactions() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get Transactions by Date Range
function getTransactionsByDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        const index = store.index('date');
        const range = IDBKeyRange.bound(startDate, endDate);
        const request = index.getAll(range);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ============= SETTINGS OPERATIONS =============

// Save Setting
function saveSetting(key, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        const request = store.put({ key: key, value: value });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Get Setting
function getSetting(key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => reject(request.error);
    });
}

// ============= COMPANIES OPERATIONS =============

// Add Company
function addCompany(company) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['companies'], 'readwrite');
        const store = transaction.objectStore('companies');
        const request = store.add(company);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get All Companies
function getAllCompanies() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['companies'], 'readonly');
        const store = transaction.objectStore('companies');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ============= UTILITY FUNCTIONS =============

// Clear all data from a store
function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Export all data (for backup)
async function exportAllData() {
    const data = {
        users: await getAllUsers(),
        products: await getAllProducts(),
        transactions: await getAllTransactions(),
        companies: await getAllCompanies()
    };
    return data;
}

// Import data (for restore)
async function importAllData(data) {
    if (data.users) {
        for (const user of data.users) {
            await addUser(user);
        }
    }
    if (data.products) {
        for (const product of data.products) {
            await addProduct(product);
        }
    }
    if (data.transactions) {
        for (const transaction of data.transactions) {
            await addTransaction(transaction);
        }
    }
    if (data.companies) {
        for (const company of data.companies) {
            await addCompany(company);
        }
    }
}

// Batch save products for bulk import
async function saveProductsBatch(productsList) {
    try {
        for (const product of productsList) {
            try {
                await addProduct(product);
            } catch (e) {
                console.log('Product import error (may already exist):', product.name, e);
            }
        }
        console.log(`✅ Batch saved ${productsList.length} products`);
        return { success: true, count: productsList.length };
    } catch (error) {
        console.error('Batch save error:', error);
        return { success: false, error: error.message };
    }
}

// Clear all products and import new ones
async function replaceAllProducts(productsList) {
    try {
        // Delete all existing products
        const transaction = db.transaction(['products'], 'readwrite');
        const store = transaction.objectStore('products');
        await new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = resolve;
            request.onerror = reject;
        });

        // Add new products
        for (const product of productsList) {
            await addProduct(product);
        }
        console.log(`✅ Replaced all products with ${productsList.length} new products`);
        return { success: true, count: productsList.length };
    } catch (error) {
        console.error('Replace error:', error);
        return { success: false, error: error.message };
    }
}

// Sync LocalStorage data to IndexedDB (Migration helper)
async function migrateFromLocalStorage() {
    try {
        // Migrate inventory
        const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
        for (const product of inventory) {
            try {
                await addProduct(product);
            } catch (e) {
                console.log('Product already exists or error:', e);
            }
        }

        // Migrate transactions
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        for (const transaction of transactions) {
            try {
                await addTransaction(transaction);
            } catch (e) {
                console.log('Transaction migration error:', e);
            }
        }

        console.log('Migration from localStorage completed');
        return true;
    } catch (error) {
        console.error('Migration failed:', error);
        return false;
    }
}

// Initialize database on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initDB().catch(err => console.error('Failed to initialize database:', err));
    });
}
