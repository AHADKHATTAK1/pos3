/**
 * API Client for POS System
 * Handles all communication with SQL backend
 */

const API_BASE_URL = (() => {
    const stored = localStorage.getItem('apiBaseUrl');
    if (stored) return stored.replace(/\/$/, '') + '/api';
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/api`;
    }
    return 'http://localhost:3000/api';
})();

// Check if server is online
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        return response.ok;
    } catch (error) {
        console.warn('Server offline, using offline mode');
        return false;
    }
}

// =================== AUTH API ===================

async function apiLogin(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return await response.json();
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Server connection failed' };
    }
}

async function apiRegister(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return await response.json();
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, message: 'Server connection failed' };
    }
}

async function apiGetUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        return await response.json();
    } catch (error) {
        console.error('Get users error:', error);
        return { success: false, message: 'Server connection failed' };
    }
}

// =================== PRODUCTS API ===================

async function apiGetProducts(category = null) {
    try {
        const url = category ? `${API_BASE_URL}/products?category=${category}` : `${API_BASE_URL}/products`;
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Get products error:', error);
        return { success: false, message: 'Server connection failed' };
    }
}

async function apiGetProductByBarcode(barcode) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/barcode/${barcode}`);
        return await response.json();
    } catch (error) {
        console.error('Get product error:', error);
        return { success: false, message: 'Product not found' };
    }
}

async function apiAddProduct(product) {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        return await response.json();
    } catch (error) {
        console.error('Add product error:', error);
        return { success: false, message: 'Failed to add product' };
    }
}

async function apiUpdateProduct(id, product) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        return await response.json();
    } catch (error) {
        console.error('Update product error:', error);
        return { success: false, message: 'Failed to update product' };
    }
}

async function apiUpdateStock(id, change) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${id}/stock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ change })
        });
        return await response.json();
    } catch (error) {
        console.error('Update stock error:', error);
        return { success: false, message: 'Failed to update stock' };
    }
}

async function apiDeleteProduct(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error('Delete product error:', error);
        return { success: false, message: 'Failed to delete product' };
    }
}

// =================== TRANSACTIONS API ===================

async function apiGetTransactions(startDate = null, endDate = null) {
    try {
        let url = `${API_BASE_URL}/transactions`;
        if (startDate && endDate) {
            url += `?startDate=${startDate}&endDate=${endDate}`;
        }
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Get transactions error:', error);
        return { success: false, message: 'Server connection failed' };
    }
}

async function apiAddTransaction(transaction) {
    try {
        const response = await fetch(`${API_BASE_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
        return await response.json();
    } catch (error) {
        console.error('Add transaction error:', error);
        return { success: false, message: 'Failed to save transaction' };
    }
}

// =================== COMPANIES API ===================

async function apiGetCompanies() {
    try {
        const response = await fetch(`${API_BASE_URL}/companies`);
        return await response.json();
    } catch (error) {
        console.error('Get companies error:', error);
        return { success: false, message: 'Server connection failed' };
    }
}

async function apiAddCompany(company) {
    try {
        const response = await fetch(`${API_BASE_URL}/companies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(company)
        });
        return await response.json();
    } catch (error) {
        console.error('Add company error:', error);
        return { success: false, message: 'Failed to add company' };
    }
}

// =================== REPORTS API ===================

async function apiGetSalesReport(period) {
    try {
        const response = await fetch(`${API_BASE_URL}/reports/sales?period=${period}`);
        return await response.json();
    } catch (error) {
        console.error('Get sales report error:', error);
        return { success: false, message: 'Server connection failed' };
    }
}

async function apiGetLowStock() {
    try {
        const response = await fetch(`${API_BASE_URL}/reports/low-stock`);
        return await response.json();
    } catch (error) {
        console.error('Get low stock error:', error);
        return { success: false, message: 'Server connection failed' };
    }
}
