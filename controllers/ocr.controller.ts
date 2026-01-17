import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createWorker } from 'tesseract.js';

// Using any for req and res to resolve Property 'status' missing errors
export const processImage = asyncHandler(async (req: any, res: any) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Decode base64 image
    const imageBuffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');

    // Create temporary file
    const tempDir = os.tmpdir();
    const tempFileName = `ocr_temp_${Date.now()}.jpg`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // Write image to temporary file
    fs.writeFileSync(tempFilePath, imageBuffer);

    console.log(`Processing image with Tesseract.js: ${tempFilePath}`);

    let worker;
    try {
      // Initialize Tesseract.js worker
      worker = await createWorker('eng');

      // Perform OCR
      const { data: { text } } = await worker.recognize(tempFilePath);

      // Clean up temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      if (!text || text.trim().length === 0) {
        throw new Error('Tesseract.js returned empty output');
      }

      console.log('Tesseract.js OCR successful');

      // Process the extracted text to extract bill information
      const processedData = processExtractedText(text);

      res.status(200).json({
        success: true,
        text: text,
        data: processedData,
        engine: 'tesseract.js'
      });
    } catch (tesseractError) {
      console.error('Tesseract.js processing failed:', tesseractError);

      // Clean up temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      // Fallback response
      res.status(200).json({
        success: true,
        text: 'OCR processing failed - please try with a clearer image',
        data: {
          storeName: 'Unknown Store',
          totalAmount: 0,
          items: []
        },
        engine: 'fallback',
        error: tesseractError.message
      });
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }
  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({ error: 'OCR processing failed' });
  }
});

// Helper function to process extracted text and extract bill information
function processExtractedText(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
  const lowerLines = lines.map(l => l.toLowerCase());

  let storeName = 'Unknown Store';
  // Look for store name - usually in the first few lines, often contains "mart", "market", "store", "super"
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    const lowerLine = lowerLines[i];
    if (lowerLine.includes('mart') || lowerLine.includes('market') || lowerLine.includes('super') || lowerLine.includes('store') || lowerLine.includes('shop')) {
      storeName = line.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
      break;
    }
  }

  // If still unknown, take the first line that isn't just numbers or symbols
  if (storeName === 'UNKNOWN STORE') {
    for (const line of lines.slice(0, 5)) {
      if (line.match(/[a-zA-Z]{3,}/) && !line.includes('invoice') && !line.includes('bill')) {
        storeName = line.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
        break;
      }
    }
  }

  // Extract total amount
  let totalAmount = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const lowerLine = lowerLines[i];

    if (lowerLine.includes('total') || lowerLine.includes('amount') || lowerLine.includes('due') || lowerLine.includes('paid')) {
      // Look for a number in this line or the next line
      const numbers = line.match(/\d+[.,]\d{2}|\d{3,}/g);
      if (numbers) {
        let amountStr = numbers[numbers.length - 1].replace(',', '.');
        // If it looks like 62000 but should be 620.00
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

  // Extract items
  const items = [];
  const phonePattern = /\d{10}/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = lowerLines[i];

    // Skip header/footer lines
    if (lowerLine.includes('total') || lowerLine.includes('tax') || lowerLine.includes('date') || lowerLine.includes('time') ||
      lowerLine.includes('invoice') || lowerLine.includes('bill') || lowerLine.includes('phone') || lowerLine.includes('call') ||
      phonePattern.test(line.replace(/\s/g, ''))) {
      continue;
    }

    // Look for lines that have a name and then some numbers
    // Pattern: Name ... Qty ... MRP ... Rate ... Amt
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

  // If no items found but total exists, create a general item
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