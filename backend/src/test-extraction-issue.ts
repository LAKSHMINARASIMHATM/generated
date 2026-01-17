import { processExtractedText } from './modules/ocr/ocr.utils';

const testCases = [
    "CLASSIC GARAM MASALA 200G 1 60 40",
    "CLASSIC GARAM MASALA 200G 60 40",
    "SUGAR 1KG 48 45",
    "ITEM 500ML 100 90"
];

console.log("Testing Extraction Logic...");

testCases.forEach(text => {
    console.log(`\nInput: "${text}"`);
    const result = processExtractedText(text);
    if (result.items.length > 0) {
        const item = result.items[0];
        console.log(`Extracted: Name="${item.name}", Qty=${item.quantity}, MRP=${item.mrp}, Price=${item.price}`);
    } else {
        console.log("No items extracted.");
    }
});
