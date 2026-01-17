import { createWorker } from 'tesseract.js';
import * as fs from 'fs';

function processExtractedText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    const lowerLines = lines.map(l => l.toLowerCase());

    let storeName = 'Unknown Store';
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        const lowerLine = lowerLines[i];
        if (lowerLine.includes('mart') || lowerLine.includes('market') || lowerLine.includes('super') || lowerLine.includes('store') || lowerLine.includes('shop')) {
            storeName = line.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
            break;
        }
    }

    if (storeName === 'UNKNOWN STORE') {
        for (const line of lines.slice(0, 5)) {
            if (line.match(/[a-zA-Z]{3,}/) && !line.includes('invoice') && !line.includes('bill')) {
                storeName = line.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
                break;
            }
        }
    }

    let totalAmount = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const lowerLine = lowerLines[i];

        if (lowerLine.includes('total') || lowerLine.includes('amount') || lowerLine.includes('due') || lowerLine.includes('paid')) {
            const numbers = line.match(/\d+[.,]\d{2}|\d{3,}/g);
            if (numbers) {
                let amountStr = numbers[numbers.length - 1].replace(',', '.');
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

    const items = [];
    const phonePattern = /\d{10}/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = lowerLines[i];

        if (lowerLine.includes('total') || lowerLine.includes('tax') || lowerLine.includes('date') || lowerLine.includes('time') ||
            lowerLine.includes('invoice') || lowerLine.includes('bill') || lowerLine.includes('phone') || lowerLine.includes('call') ||
            phonePattern.test(line.replace(/\s/g, ''))) {
            continue;
        }

        const numbers = line.match(/\d+[.,]\d{2}|\d+/g);
        if (numbers && numbers.length >= 1) {
            const lastNumber = numbers[numbers.length - 1].replace(',', '.');
            let price = parseFloat(lastNumber);

            const namePart = line.split(/\d/)[0].trim();
            if (namePart.length > 3 && !isNaN(price) && price > 0 && price < (totalAmount || 100000)) {
                items.push({
                    name: namePart.substring(0, 50).toUpperCase(),
                    price,
                    quantity: 1,
                    category: 'Other'
                });
            }
        }
    }

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

async function testBillOCR() {
    const imagePath = 'C:/Users/T M lakshmi narasimh/.gemini/antigravity/brain/7863cb4b-fe33-4a99-b84f-69baa54d190e/uploaded_image_1768414820025.jpg';

    console.log(`Testing Tesseract.js on bill: ${imagePath}`);

    let worker;
    try {
        if (!fs.existsSync(imagePath)) {
            console.error('Image file not found!');
            return;
        }

        worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(imagePath);

        const processedData = processExtractedText(text);

        console.log('\n--- PROCESSED DATA ---');
        console.log(JSON.stringify(processedData, null, 2));

    } catch (error) {
        console.error('OCR test failed:', error);
    } finally {
        if (worker) {
            await worker.terminate();
        }
    }
}

testBillOCR();
