import fetch from 'node-fetch';
import * as fs from 'fs';

async function testLargeOCR() {
    const imagePath = 'C:/Users/T M lakshmi narasimh/.gemini/antigravity/brain/7863cb4b-fe33-4a99-b84f-69baa54d190e/uploaded_image_1768414820025.jpg';

    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');

        console.log(`Sending image of size: ${base64Image.length} characters`);

        const response = await fetch('http://localhost:8000/api/v1/ocr/process-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageBase64: base64Image })
        });

        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testLargeOCR();
