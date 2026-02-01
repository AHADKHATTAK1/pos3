// ==================== GOOGLE APPS SCRIPT FOR SHEETS INTEGRATION ====================
// Instructions:
// 1. Open your Google Sheet
// 2. Go to Extensions → Apps Script
// 3. Delete any existing code and paste this entire script
// 4. Click Save (disk icon)
// 5. Click Deploy → New deployment
// 6. Choose "Web app" as type
// 7. Description: "POS System API"
// 8. Execute as: "Me"
// 9. Who has access: "Anyone" (or "Anyone with the link")
// 10. Click Deploy
// 11. Copy the Web App URL and paste it in your POS Backend Configuration

function doPost(e) {
    try {
        // Parse incoming data
        const data = JSON.parse(e.postData.contents);
        const action = data.action;

        // Get the active spreadsheet
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        if (action === 'test') {
            // Test connection
            return ContentService.createTextOutput(JSON.stringify({
                status: 'success',
                message: 'Connection successful',
                timestamp: new Date().toISOString()
            })).setMimeType(ContentService.MimeType.JSON);
        }

        if (action === 'sync') {
            // Sync transactions to sheet
            const sheetName = data.sheetName || 'Transactions';
            let sheet = ss.getSheetByName(sheetName);

            // Create sheet if it doesn't exist
            if (!sheet) {
                sheet = ss.insertSheet(sheetName);

                // Add headers
                sheet.getRange(1, 1, 1, 11).setValues([[
                    'Transaction ID',
                    'Date & Time',
                    'Items',
                    'Item Count',
                    'Total Quantity',
                    'Subtotal',
                    'Tax',
                    'Total',
                    'Payment Method',
                    'Amount Received',
                    'Change'
                ]]);

                // Format header row
                const headerRange = sheet.getRange(1, 1, 1, 11);
                headerRange.setBackground('#4285f4');
                headerRange.setFontColor('#ffffff');
                headerRange.setFontWeight('bold');
                sheet.setFrozenRows(1);
            }

            // Process each transaction
            const transactions = data.data;
            const lastRow = sheet.getLastRow();

            transactions.forEach((transaction, index) => {
                const rowData = [
                    transaction.transactionId,
                    transaction.date,
                    transaction.items,
                    transaction.itemCount,
                    transaction.totalQuantity,
                    transaction.subtotal,
                    transaction.tax,
                    transaction.total,
                    transaction.paymentMethod,
                    transaction.amountReceived,
                    transaction.change
                ];

                // Check if transaction already exists
                const existingData = sheet.getDataRange().getValues();
                const exists = existingData.some(row => row[0] === transaction.transactionId);

                if (!exists) {
                    sheet.appendRow(rowData);
                }
            });

            // Auto-resize columns
            sheet.autoResizeColumns(1, 11);

            return ContentService.createTextOutput(JSON.stringify({
                status: 'success',
                message: `Synced ${transactions.length} transactions`,
                timestamp: new Date().toISOString()
            })).setMimeType(ContentService.MimeType.JSON);
        }

        if (action === 'verify') {
            // Verify product against sheet
            const sheetName = 'Products';
            const sheet = ss.getSheetByName(sheetName);

            if (!sheet) {
                return ContentService.createTextOutput(JSON.stringify({
                    status: 'error',
                    message: 'Products sheet not found'
                })).setMimeType(ContentService.MimeType.JSON);
            }

            const barcode = data.barcode;
            const productData = sheet.getDataRange().getValues();

            // Find product (assuming barcode is in column 2)
            for (let i = 1; i < productData.length; i++) {
                if (productData[i][1] === barcode) {
                    return ContentService.createTextOutput(JSON.stringify({
                        status: 'success',
                        product: {
                            name: productData[i][0],
                            barcode: productData[i][1],
                            price: productData[i][2],
                            stock: productData[i][3]
                        }
                    })).setMimeType(ContentService.MimeType.JSON);
                }
            }

            return ContentService.createTextOutput(JSON.stringify({
                status: 'not_found',
                message: 'Product not found'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: 'Invalid action'
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function doGet(e) {
    return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'POS System API is running',
        timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
}

// ==================== HELPER FUNCTIONS ====================

// Function to create a Products sheet with sample data
function setupProductsSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Products');

    if (!sheet) {
        sheet = ss.insertSheet('Products');
    } else {
        sheet.clear();
    }

    // Add headers
    sheet.getRange(1, 1, 1, 5).setValues([[
        'Product Name',
        'Barcode',
        'Price',
        'Stock',
        'Icon'
    ]]);

    // Format header
    const headerRange = sheet.getRange(1, 1, 1, 5);
    headerRange.setBackground('#34a853');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Add sample products
    const sampleProducts = [
        ['Apple', '1234567890', 1.99, 100, '🍎'],
        ['Banana', '2345678901', 0.99, 150, '🍌'],
        ['Orange', '3456789012', 2.49, 80, '🍊'],
        ['Milk', '4567890123', 3.99, 50, '🥛'],
        ['Bread', '5678901234', 2.99, 40, '🍞']
    ];

    sheet.getRange(2, 1, sampleProducts.length, 5).setValues(sampleProducts);
    sheet.autoResizeColumns(1, 5);

    SpreadsheetApp.getUi().alert('Products sheet created successfully!');
}

// Function to create a Sales Summary sheet
function createSalesSummary() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const transSheet = ss.getSheetByName('Transactions');

    if (!transSheet) {
        SpreadsheetApp.getUi().alert('Please sync transactions first!');
        return;
    }

    let summarySheet = ss.getSheetByName('Sales Summary');
    if (!summarySheet) {
        summarySheet = ss.insertSheet('Sales Summary');
    } else {
        summarySheet.clear();
    }

    // Create summary with formulas
    summarySheet.getRange('A1').setValue('SALES SUMMARY');
    summarySheet.getRange('A1').setFontSize(16).setFontWeight('bold');

    summarySheet.getRange('A3').setValue('Total Sales:');
    summarySheet.getRange('B3').setFormula('=SUM(Transactions!H:H)');
    summarySheet.getRange('B3').setNumberFormat('$#,##0.00');

    summarySheet.getRange('A4').setValue('Total Transactions:');
    summarySheet.getRange('B4').setFormula('=COUNTA(Transactions!A:A)-1');

    summarySheet.getRange('A5').setValue('Average Sale:');
    summarySheet.getRange('B5').setFormula('=AVERAGE(Transactions!H:H)');
    summarySheet.getRange('B5').setNumberFormat('$#,##0.00');

    summarySheet.getRange('A6').setValue('Total Items Sold:');
    summarySheet.getRange('B6').setFormula('=SUM(Transactions!E:E)');

    summarySheet.autoResizeColumns(1, 2);

    SpreadsheetApp.getUi().alert('Sales summary created!');
}

// Create a custom menu when the sheet is opened
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('POS System')
        .addItem('Setup Products Sheet', 'setupProductsSheet')
        .addItem('Create Sales Summary', 'createSalesSummary')
        .addToUi();
}
