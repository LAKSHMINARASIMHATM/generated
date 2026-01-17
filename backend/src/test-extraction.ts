import { processExtractedText } from './modules/ocr/ocr.utils';

const mockText = `
CMart Super Market
Banaganapalle Road, Panyam
Ph : 8309134115
GST : 37BEVPL0975H1ZV
INVOICE
Bill# : 5335 Date : 02/12/25
User : Admin Time : 06:11 PM
Item Name Qty MRP Rate Amt.
MAHANANDI PAPAD 2 22.00 10.00 20.00
CLASSIC GARAM MASALA 200G 1 60.00 45.00 45.00
CLASSIC CHICKEN MASALA 200G 1 90.00 70.00 70.00
SUGAR 1KG 1 48.00 45.00 45.00
MSN GOLD 1KG 1 24.00 20.00 20.00
BALAJI DHANIYA 500G 1 160.00 110.00 110.00
KASTHURI MEHTI 10RS 1 60.00 40.00 40.00
SWETHA TELUGU CHILLI PC/WDR 500G 1 240.00 120.00 120.00
KOBIBERA 250G 1 85.00 70.00 70.00
RK AAVALU 40G 2 15.00 12.50 25.00
LAVANGALU 20RS 1 20.00 15.00 15.00
VG CHAKA 10GMS 1 10.00 10.00 10.00
MTR RASAM 10RS 1 12.00 10.00 10.00
JEERA 50 GMS 1 25.00 20.00 20.00
Items/Qty 16/ 14 TOTAL : 620.00
Payment Details :
Total Amount : 620.00 Return Change: 0.00
Tender Amount : 620.00 Card Amount
You have saved Rs. 288.00
**Thanks For Shopping**
Exchange within 24 Hours.With Bill, No Cash Refur
*** FOR FREE HOME DELIVERY ***
WhatsApp/Call : 8309134115
`;

console.log("Testing Extraction Logic...");
const result = processExtractedText(mockText);

console.log("Store Name:", result.storeName);
console.log("Total Amount:", result.totalAmount);
console.log("Items:");
result.items.forEach(item => {
    console.log(`- ${item.name} | Qty: ${item.quantity} | MRP: ${item.mrp} | Price: ${item.price}`);
});

// Verification checks
const expectedItems = [
    { name: "MAHANANDI PAPAD", qty: 2, mrp: 22.00, price: 20.00 },
    { name: "CLASSIC GARAM MASALA 200G", qty: 1, mrp: 60.00, price: 45.00 }
];

let passed = true;
for (const expected of expectedItems) {
    const found = result.items.find(i => i.name.includes(expected.name));
    if (!found) {
        console.error(`FAILED: Item ${expected.name} not found`);
        passed = false;
    } else {
        if (found.quantity !== expected.qty) {
            console.error(`FAILED: ${expected.name} Qty mismatch. Expected ${expected.qty}, got ${found.quantity}`);
            passed = false;
        }
        if (found.mrp !== expected.mrp) {
            console.error(`FAILED: ${expected.name} MRP mismatch. Expected ${expected.mrp}, got ${found.mrp}`);
            passed = false;
        }
        if (found.price !== expected.price) {
            console.error(`FAILED: ${expected.name} Price mismatch. Expected ${expected.price}, got ${found.price}`);
            passed = false;
        }
    }
}

if (passed) {
    console.log("\nVerification PASSED");
} else {
    console.log("\nVerification FAILED");
}
