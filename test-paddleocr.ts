import { ocr } from 'paddleocr';
import * as fs from 'fs';
import * as path from 'path';

async function testPaddleOCR() {
    console.log('Testing paddleocr node module...');
    try {
        // We need a real image for this to work properly, but let's see if it even initializes
        console.log('PaddleOCR ocr function:', typeof ocr);

        // If we have an image, we could try:
        // const result = await ocr('path/to/image.jpg');
        // console.log('Result:', result);
    } catch (error) {
        console.error('PaddleOCR test failed:', error);
    }
}

testPaddleOCR();
