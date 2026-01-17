const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

function processExtractedText(text) {
    const lines = text.toLowerCase().split('\n').filter(line => line.trim() !== '');

    let storeName = 'Unknown Store';
    for (const line of lines.slice(0, 5)) {
        if (line && !line.match(/\d/) && line.length > 3 &&
            !line.includes('total') && !line.includes('amount') &&
            !line.includes('sub') && !line.includes('tax')) {
            storeName = line.replace(/^\d+\s*/, '').trim().toUpperCase();
            break;
        }
    }

    let totalAmount = 0;
    for (const line of lines) {
        const totalPatterns = [
            /(?:total|amount|paid|payment|due).*?\$?(\d+(?:\.\d{2})?)/i,
            /(?:total|amount|paid|payment|due)[\s:]*\$?[\s:]*([\d,]+\.?\d{0,2})/i
        ];

        for (const pattern of totalPatterns) {
            const match = line.match(pattern);
            if (match && match[1]) {
                const amountStr = match[1].replace(/,/g, '');
                const parsedAmount = parseFloat(amountStr);
                if (!isNaN(parsedAmount) && parsedAmount > 0) {
                    totalAmount = parsedAmount;
                    break;
                }
            }
        }
        if (totalAmount > 0) break;
    }

    const items = [];
    for (const line of lines) {
        if (line &&
            !line.match(/^(total|sub.*?total|tax|change|amount|paid|balance|due|discount|savings|vat|gst|receipt|date|time|card|cash|credit)/i)) {

            const itemPattern = /(.+?)\s+\$?(\d+(?:\.\d{2})?)$/;
            const match = line.match(itemPattern);

            if (match) {
                const name = match[1].trim();
                const price = parseFloat(match[2].replace(/[^0-9.]/g, ''));

                if (name && !isNaN(price) && price > 0) {
                    items.push({
                        name: name.substring(0, 50),
                        price,
                        quantity: 1,
                        category: 'Other'
                    });
                }
            }
        }
    }

    if (items.length === 0 && totalAmount > 0) {
        items.push({
            name: 'General Purchase',
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

async function testBillOCR() {
    const imagePath = 'C:/Users/T M lakshmi narasimh/.gemini/antigravity/brain/7863cb4b-fe33-4a99-b84f-69baa54d190e/uploaded_image_1768414820025.jpg';

    try {
        if (!fs.existsSync(imagePath)) {
            console.error('Image file not found!');
            return;
        }

        const { stdout } = await execPromise(`tesseract "${imagePath}" stdout`);

        console.log('\n--- RAW TEXT ---');
        console.log(stdout);

        const processedData = processExtractedText(stdout);

        console.log('\n--- PROCESSED DATA ---');
        console.log(JSON.stringify(processedData, null, 2));

    } catch (error) {
        console.error('OCR test failed:', error);
    }
}

testBillOCR();
