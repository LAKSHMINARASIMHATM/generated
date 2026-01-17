import { createRequire } from 'module';
import * as fs from 'fs';

const require = createRequire(import.meta.url);
const paddleocr = require('paddleocr');
const { PaddleOcrService } = paddleocr;

function getJpegDimensions(buffer) {
    let i = 0;
    if (buffer[i] !== 0xFF || buffer[i + 1] !== 0xD8) return null;
    i += 2;
    while (i < buffer.length) {
        if (buffer[i] !== 0xFF) return null;
        if (buffer[i + 1] === 0xC0 || buffer[i + 1] === 0xC2) {
            return {
                height: (buffer[i + 5] << 8) + buffer[i + 6],
                width: (buffer[i + 7] << 8) + buffer[i + 8]
            };
        }
        i += 2 + (buffer[i + 2] << 8) + buffer[i + 3];
    }
    return null;
}

async function testPaddleOCR() {
    const imagePath = 'C:/Users/T M lakshmi narasimh/.gemini/antigravity/brain/7863cb4b-fe33-4a99-b84f-69baa54d190e/uploaded_image_1768414820025.jpg';

    console.log(`Testing PaddleOCR on bill: ${imagePath}`);

    try {
        if (!fs.existsSync(imagePath)) {
            console.error('Image file not found!');
            return;
        }

        const buffer = fs.readFileSync(imagePath);
        const dimensions = getJpegDimensions(buffer);

        if (!dimensions) {
            console.error('Could not get image dimensions!');
            return;
        }

        console.log(`Image dimensions: ${dimensions.width}x${dimensions.height}`);

        const ocr = await PaddleOcrService.createInstance();
        const recognitionResults = await ocr.recognize({
            width: dimensions.width,
            height: dimensions.height,
            data: new Uint8Array(buffer)
        });

        const result = ocr.processRecognition(recognitionResults);

        console.log('\n--- PADDLEOCR RAW TEXT ---');
        console.log(result.text);

    } catch (error) {
        console.error('PaddleOCR test failed:', error);
    }
}

testPaddleOCR();
