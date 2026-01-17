import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const paddleocr = require('paddleocr');
console.log('PaddleOCR keys:', Object.keys(paddleocr));
console.log('PaddleOCR default keys:', paddleocr.default ? Object.keys(paddleocr.default) : 'no default');
console.log('PaddleOCR full object:', paddleocr);
