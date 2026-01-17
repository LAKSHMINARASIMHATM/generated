import fs from 'fs';
import path from 'path';

async function testPythonServer() {
    const imagePath = 'C:/Users/T M lakshmi narasimh/.gemini/antigravity/brain/0c64704c-eaf9-41b2-8cdf-90a2f6c7f6e0/uploaded_image_1768470141222.jpg';

    if (!fs.existsSync(imagePath)) {
        console.error('Test image not found:', imagePath);
        return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    console.log('Testing Python OCR Server at http://localhost:5001/ocr...');

    try {
        const response = await fetch('http://localhost:5001/ocr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageBase64 })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Response received!');

        if (result.success) {
            console.log('OCR Success!');
            console.log('Text length:', result.text.length);
            console.log('First 100 chars:', result.text.substring(0, 100));
            console.log('Structured data items:', result.structured_data.length);
        } else {
            console.error('OCR Failed:', result.error);
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testPythonServer();
