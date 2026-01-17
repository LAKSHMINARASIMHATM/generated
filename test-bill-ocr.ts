import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

// Helper function to process extracted text and extract bill information (copied from ocr.controller.ts)
function processExtractedText(text: string) {
    const lines = text.toLowerCase().split('\n').filter(line => line.trim() !== '');

    let storeName = 'Unknown Store';
    // Look for store name in first few lines
    for (const line of lines.slice(0, 5)) {
        if (line && !line.match(/\d/) && line.length > 3 &&
            !line.includes('total') && !line.includes('amount') &&
            !line.includes('sub') && !line.includes('tax')) {
            storeName = line.replace(/^\d+\s*/, '').trim().toUpperCase();
            break;
        }
    }

    // Extract total amount
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

    // Extract items
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

    // If no items found but total exists, create a general item
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

    console.log(`Testing OCR on bill: ${imagePath}`);

    try {
        if (!fs.existsSync(imagePath)) {
            console.error('Image file not found!');
            return;
        }

        console.log('Running Tesseract...');
        const { stdout } = await execPromise(`tesseract "${imagePath}" stdout`);

        console.log('\n--- RAW TEXT START ---');
        console.log(stdout);
        console.log('--- RAW TEXT END ---\n');

        const processedData = processExtractedText(stdout);

        console.log('--- PROCESSED DATA ---');
        console.log(JSON.stringify(processedData, null, 2));
        console.log('----------------------');

    } catch (error) {
        console.error('OCR test failed:', error);
    }
}

testBillOCR();
