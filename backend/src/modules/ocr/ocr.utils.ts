export function processExtractedText(text: string) {
    let lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    console.log('--- OCR UTILS INPUT TEXT ---');
    console.log(text);
    console.log('----------------------------');

    // Pre-process lines to handle multi-line items (Name on one line, Numbers on next)
    const mergedLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check if this line looks like a "numbers line" (starts with digit, has multiple numbers)
        // Example: "2 22.00 10.00 20.0" or "1 60.00 45.00 45.0"
        const isNumberLine = /^\d+\s+[\d.,]+\s+[\d.,]+/.test(line);

        if (isNumberLine && mergedLines.length > 0) {
            const prevLine = mergedLines[mergedLines.length - 1];
            // Check if previous line looks like a name (mostly text, not a number line)
            const isPrevLineName = /[a-zA-Z]/.test(prevLine) && !/^\d+\s+[\d.,]+\s+[\d.,]+/.test(prevLine);

            if (isPrevLineName) {
                // Merge with previous line
                mergedLines[mergedLines.length - 1] = prevLine + ' ' + line;
                continue;
            }
        }
        mergedLines.push(line);
    }
    lines = mergedLines;
    console.log('--- MERGED LINES ---');
    lines.forEach(l => console.log(l));
    console.log('--------------------');
    const lowerLines = lines.map(l => l.toLowerCase());

    let storeName = 'Unknown Store';
    const storeKeywords = ['mart', 'market', 'super', 'store', 'shop', 'pvt ltd', 'inc', 'corp', 'retail', 'foods'];

    // Look for store name - usually in the first few lines
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        const lowerLine = lowerLines[i];
        if (storeKeywords.some(k => lowerLine.includes(k))) {
            storeName = line.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
            break;
        }
    }

    // If still unknown, take the first line that isn't just numbers or symbols
    if (storeName === 'UNKNOWN STORE' || storeName === 'Unknown Store') {
        for (const line of lines.slice(0, 5)) {
            if (line.match(/[a-zA-Z]{3,}/) && !line.includes('invoice') && !line.includes('bill')) {
                storeName = line.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
                break;
            }
        }
    }

    // Extract total amount
    let totalAmount = 0;
    const totalLabels = ['total', 'amount', 'due', 'paid', 'grand total', 'net amount', 'payable', 'GST'];

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const lowerLine = lowerLines[i];

        if (totalLabels.some(label => lowerLine.includes(label))) {
            // Look for a number in this line or nearby
            const numbers = line.match(/\d+[.,]\d{2}|\d{3,}/g);
            if (numbers) {
                let amountStr = numbers[numbers.length - 1].replace(',', '.');
                // Heuristic for missing decimal point in large numbers
                if (amountStr.length >= 5 && !amountStr.includes('.')) {
                    amountStr = amountStr.slice(0, -2) + '.' + amountStr.slice(-2);
                }
                const parsed = parseFloat(amountStr);
                if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
                    totalAmount = parsed;
                    break;
                }
            }
        }
    }

    // Extract items
    const items = [];
    const phonePattern = /\d{10}/;

    // Simple categorization map
    const categoryMap: Record<string, string> = {
        'milk': 'Dairy', 'curd': 'Dairy', 'cheese': 'Dairy', 'butter': 'Dairy', 'paneer': 'Dairy',
        'bread': 'Bakery', 'bun': 'Bakery', 'cake': 'Bakery', 'biscuit': 'Bakery',
        'apple': 'Produce', 'banana': 'Produce', 'onion': 'Produce', 'potato': 'Produce', 'tomato': 'Produce',
        'chicken': 'Meat', 'mutton': 'Meat', 'fish': 'Meat', 'egg': 'Meat',
        'soap': 'Personal Care', 'shampoo': 'Personal Care', 'paste': 'Personal Care',
        'oil': 'Grocery', 'rice': 'Grocery', 'sugar': 'Grocery', 'salt': 'Grocery', 'dal': 'Grocery', 'masala': 'Grocery'
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = lowerLines[i];

        // Skip header/footer lines
        if (totalLabels.some(l => lowerLine.includes(l)) || lowerLine.includes('tax') || lowerLine.includes('date') || lowerLine.includes('time') ||
            lowerLine.includes('invoice') || lowerLine.includes('bill') || lowerLine.includes('phone') || lowerLine.includes('call') ||
            phonePattern.test(line.replace(/\s/g, ''))) {
            continue;
        }

        // Improved item extraction logic
        // Look for price and optional quantity
        // Example: "MAHANANDI PAPAD 2 22.00 10.00 20.0" or "SUGAR 1KG 1 48.00 45.00 45.0"

        // Strategy: Look for the last number as price/amount.
        // Then look for preceding numbers as Rate, MRP, Qty in that order (right to left)

        // Find all numbers in the line, support both .00 and .0 formats
        const numbers = line.match(/(\d+([.,]\d{1,2})?)(?=\s|kg|g|ml|l|$)/gi);

        if (numbers && numbers.length >= 1) {
            // Last number is likely the total amount for the item
            const amountStr = numbers[numbers.length - 1].replace(',', '.');
            const price = parseFloat(amountStr);

            if (!isNaN(price) && price > 0 && price < (totalAmount || 100000)) {
                let namePart = line;
                let quantity = 1;
                let mrp: number | undefined = undefined;

                // If we have multiple numbers, try to identify columns
                // Common formats:
                // Name Qty MRP Rate Amount
                // Name Qty Rate Amount
                // Name Rate Amount

                if (numbers.length >= 3) {
                    // Potential format: ... Qty MRP Rate Amount OR ... Qty Rate Amount
                    // Let's assume the last 3 numbers could be MRP, Rate, Amount OR Qty, Rate, Amount

                    // Check for Qty MRP Rate Amount (4 numbers at end)
                    if (numbers.length >= 4) {
                        const qtyStr = numbers[numbers.length - 4];
                        const mrpStr = numbers[numbers.length - 3].replace(',', '.');
                        // const rateStr = numbers[numbers.length - 2].replace(',', '.');

                        // Heuristic: Qty is usually integer and small
                        if (/^\d+$/.test(qtyStr) && parseInt(qtyStr) < 100) {
                            quantity = parseInt(qtyStr);
                            mrp = parseFloat(mrpStr);

                            // Remove these numbers from name
                            const lastNumIndex = line.lastIndexOf(numbers[numbers.length - 4]);
                            if (lastNumIndex !== -1) {
                                namePart = line.substring(0, lastNumIndex).trim();
                            }
                        }
                    }

                    // If not matched above, try Qty MRP Amount OR Qty Rate Amount (3 numbers at end)
                    if (quantity === 1 && numbers.length >= 3) {
                        const qtyStr = numbers[numbers.length - 3];
                        const val2Str = numbers[numbers.length - 2].replace(',', '.');
                        const val2 = parseFloat(val2Str);

                        // Check if Qty is valid
                        if (/^\d+$/.test(qtyStr) && parseInt(qtyStr) < 100) {
                            quantity = parseInt(qtyStr);

                            // Check if val2 is MRP (MRP > Price)
                            if (val2 > price) {
                                mrp = val2;
                            }

                            // Remove these numbers from name
                            const lastNumIndex = line.lastIndexOf(numbers[numbers.length - 3]);
                            if (lastNumIndex !== -1) {
                                namePart = line.substring(0, lastNumIndex).trim();
                            }
                        }
                    }
                }

                // Fallback: just remove the last price
                if (namePart === line) {
                    namePart = line.substring(0, line.lastIndexOf(numbers[numbers.length - 1])).trim();
                }

                // Clean name
                const tokens = namePart.split(/\s+/);
                const excludeWords = ['MRP', 'RATE', 'NET', 'AMT', 'USER', 'ADMIN', 'TIRNE', 'NARE', 'AMOUNT', 'TOTAL', 'QTY', 'CODE', 'HSN', 'TAX', 'VAT', 'GST', 'DISC', 'PRICE', 'ITEM', 'DESC'];

                const cleanTokens = tokens.filter(token => {
                    const upperToken = token.toUpperCase();
                    if (excludeWords.includes(upperToken)) return false;
                    if (/^\d+$/.test(token)) return false; // Remove standalone numbers
                    if (/^[&+\-.,:;=]+$/.test(token)) return false;
                    if (/[a-zA-Z]/.test(token)) return true;
                    return false;
                });

                const cleanName = cleanTokens.join(' ');

                if (cleanName.length > 2) {
                    // Detect category
                    let category = 'Other';
                    const lowerName = cleanName.toLowerCase();
                    for (const [keyword, cat] of Object.entries(categoryMap)) {
                        if (lowerName.includes(keyword)) {
                            category = cat;
                            break;
                        }
                    }

                    items.push({
                        name: cleanName.substring(0, 50).toUpperCase(),
                        price,
                        quantity,
                        category,
                        mrp
                    });
                }
            }
        }
    }

    // If no items found but total exists, create a general item
    if (items.length === 0 && totalAmount > 0) {
        items.push({
            name: 'GENERAL PURCHASE',
            price: totalAmount,
            quantity: 1,
            category: 'Other'
        });
    }

    return {
        storeName,
        totalAmount,
        items
    };
}
