/**
 * Hardware Barcode Scanner Integration
 * Supports USB barcode scanners with red light (laser/LED)
 * Works with standard keyboard wedge scanners
 */

class BarcodeScanner {
    constructor() {
        this.buffer = '';
        this.timeout = null;
        this.scanDelay = 100; // milliseconds between characters
        this.minLength = 3; // minimum barcode length
        this.enabled = true;
        this.callbacks = [];

        this.init();
    }

    init() {
        console.log('🔴 Hardware Barcode Scanner initialized');

        // Listen for keyboard input (keyboard wedge scanners)
        document.addEventListener('keypress', (e) => this.handleKeyPress(e));
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Auto-enable on page load
        this.enable();
    }

    handleKeyPress(event) {
        if (!this.enabled) return;

        // Ignore if user is typing in an input field (except search)
        const target = event.target;
        if (target.tagName === 'INPUT' && target.id !== 'productSearch') {
            return;
        }
        if (target.tagName === 'TEXTAREA') {
            return;
        }

        const char = event.key;

        // Clear timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        // Add character to buffer
        this.buffer += char;

        // Set timeout to process barcode
        this.timeout = setTimeout(() => {
            this.processBarcode();
        }, this.scanDelay);
    }

    handleKeyDown(event) {
        if (!this.enabled) return;

        // Enter key typically signals end of barcode scan
        if (event.key === 'Enter' && this.buffer.length > 0) {
            event.preventDefault();
            clearTimeout(this.timeout);
            this.processBarcode();
        }
    }

    processBarcode() {
        const barcode = this.buffer.trim();

        // Check minimum length
        if (barcode.length >= this.minLength) {
            console.log('🔴 Scanned:', barcode);

            // Play beep sound
            this.playBeep();

            // Show red light effect
            this.showScanEffect();

            // Trigger callbacks
            this.callbacks.forEach(callback => {
                try {
                    callback(barcode);
                } catch (error) {
                    console.error('Scanner callback error:', error);
                }
            });

            // Auto-search product
            this.searchProduct(barcode);
        }

        // Clear buffer
        this.buffer = '';
    }

    searchProduct(barcode) {
        // Try to find product by barcode
        const inventory = JSON.parse(
            localStorage.getItem('inventoryProducts') ||
            localStorage.getItem('inventory') ||
            '[]'
        );
        const product = inventory.find(p =>
            p.barcode === barcode ||
            p.sku === barcode ||
            p.id === barcode
        );

        if (product) {
            console.log('✅ Product found:', product.name);

            // Show scan result
            if (typeof showScannedProduct === 'function') {
                showScannedProduct(product);
            }

            // Add to cart automatically
            if (typeof addToCart === 'function') {
                addToCart(product);
            }
        } else {
            console.log('❌ Product not found for barcode:', barcode);

            // Show not found message
            if (typeof showNotification === 'function') {
                showNotification('Product not found: ' + barcode, 'error');
            } else {
                alert('Product not found: ' + barcode);
            }
        }
    }

    playBeep() {
        try {
            // Create beep sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 2000; // 2000 Hz beep
            oscillator.type = 'square';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('Could not play beep sound:', error);
        }
    }

    showScanEffect() {
        // Create red light flash effect
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 0, 0, 0.2);
            pointer-events: none;
            z-index: 99999;
            animation: scanFlash 0.3s ease-out;
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes scanFlash {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(flash);

        setTimeout(() => {
            document.body.removeChild(flash);
        }, 300);
    }

    enable() {
        this.enabled = true;
        console.log('🔴 Scanner enabled - Ready to scan');
    }

    disable() {
        this.enabled = false;
        console.log('⚪ Scanner disabled');
    }

    onScan(callback) {
        if (typeof callback === 'function') {
            this.callbacks.push(callback);
        }
    }

    clearCallbacks() {
        this.callbacks = [];
    }

    setMinLength(length) {
        this.minLength = length;
    }

    setScanDelay(delay) {
        this.scanDelay = delay;
    }
}

// Initialize scanner globally
let hardwareScanner = null;

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        hardwareScanner = new BarcodeScanner();

        // Make it globally accessible
        window.barcodeScanner = hardwareScanner;

        console.log('✅ Hardware scanner ready. Waiting for barcode scan...');
    });
}

// Helper function to show scanned product
function showScannedProduct(product) {
    const scanResult = document.getElementById('scanResult');
    if (scanResult) {
        document.getElementById('scannedItem').textContent = product.name;
        document.getElementById('scannedQty').textContent = '1';
        document.getElementById('quickQty').value = '1';
        scanResult.style.display = 'block';

        // Store scanned product temporarily
        window.currentScannedProduct = product;
    }
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    const slideStyle = document.createElement('style');
    slideStyle.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(slideStyle);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
