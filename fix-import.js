// FIXED IMPORT FUNCTION - Replace in script.js around line 766-860

// After: const choice = prompt(confirmMsg);

if (choice === '1') {
    // Replace all mode
    replaceAllProducts(imported).then(result => {
        displayProducts();
        if (typeof updateDashboard === 'function') {
            updateDashboard();
            displayInventoryForDashboard(currentView || 'all');
        }
        const inventoryFrame = document.querySelector('iframe[src="inventory.html"]');
        if (inventoryFrame && inventoryFrame.contentWindow) {
            try {
                inventoryFrame.contentWindow.location.reload();
            } catch (e) {
                console.log('Could not refresh iframe:', e);
            }
        }
        alert(`✅ Import Successful (REPLACE MODE)\n\n${imported.length} products imported\nOld inventory cleared\n\n🔄 All displays refreshed`);
        if (closeModalOnSuccess) closeModal('inventorySheetModal');
    }).catch(err => {
        alert(`❌ Error saving products: ${err.message}`);
    });

} else if (choice === '2') {
    // Merge mode
    getAllProducts().then(existingProducts => {
        let updated = 0;
        let added = 0;
        let mergedProducts = [...(existingProducts || [])];

        imported.forEach(newProduct => {
            const existingIndex = mergedProducts.findIndex(p =>
                p.barcode === newProduct.barcode ||
                p.sku === newProduct.sku ||
                (p.name && p.name.toLowerCase() === newProduct.name.toLowerCase())
            );

            if (existingIndex >= 0) {
                mergedProducts[existingIndex] = { ...mergedProducts[existingIndex], ...newProduct };
                updated++;
            } else {
                mergedProducts.push(newProduct);
                added++;
            }
        });

        replaceAllProducts(mergedProducts).then(result => {
            displayProducts();
            if (typeof updateDashboard === 'function') {
                updateDashboard();
                displayInventoryForDashboard(currentView || 'all');
            }
            const inventoryFrame = document.querySelector('iframe[src="inventory.html"]');
            if (inventoryFrame && inventoryFrame.contentWindow) {
                try {
                    inventoryFrame.contentWindow.location.reload();
                } catch (e) {
                    console.log('Could not refresh iframe:', e);
                }
            }
            alert(`✅ Import Successful (MERGE MODE)\n\n✏️ Updated: ${updated} products\n➕ Added: ${added} products\n📦 Total: ${mergedProducts.length} products\n\n🔄 All displays refreshed`);
            if (closeModalOnSuccess) closeModal('inventorySheetModal');
        }).catch(err => {
            alert(`❌ Error merging products: ${err.message}`);
        });
    }).catch(err => {
        alert(`❌ Error loading existing products: ${err.message}`);
    });
}
