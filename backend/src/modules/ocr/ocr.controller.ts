import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';

import { processExtractedText } from './ocr.utils';
import sharp from 'sharp';

// Helper to get image dimensions from buffer (basic JPEG/PNG support)
async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    try {
        const metadata = await sharp(buffer).metadata();
        return {
            width: metadata.width || 0,
            height: metadata.height || 0
        };
    } catch (error) {
        console.error('Error getting image dimensions:', error);
        return { width: 0, height: 0 };
    }
}

// Function to call Python OCR server
async function runPythonOCR(imageBase64: string): Promise<any> {
    try {
        const response = await fetch('http://localhost:5001/ocr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageBase64 })
        });

        if (!response.ok) {
            throw new Error(`Python server error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
            return result;
        } else {
            throw new Error(result.error || 'Unknown OCR error from Python server');
        }
    } catch (error: any) {
        console.error('Failed to communicate with Python OCR server:', error);
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            throw new Error('Python OCR server is not running. Please start it with "npm run python-server".');
        }
        throw error;
    }
}

// Using any for req and res to resolve Property 'status' missing errors
export const processImage = asyncHandler(async (req: any, res: any) => {
    try {
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        console.log(`Processing image with Python PaddleOCR...`);

        try {
            // Perform OCR using Python script
            const ocrResult = await runPythonOCR(imageBase64);
            const text = ocrResult.text;

            if (!text || text.trim().length === 0) {
                throw new Error('PaddleOCR returned empty output');
            }

            console.log('PaddleOCR successful');

            // Process the extracted text to extract bill information
            const processedData = processExtractedText(text);

            res.status(200).json({
                success: true,
                text: text,
                data: processedData,
                engine: 'paddleocr-python'
            });
        } catch (ocrError: any) {
            console.error('PaddleOCR processing failed:', ocrError);

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
                error: ocrError.message
            });
        }
    } catch (error: any) {
        console.error('OCR processing error (outer catch):', error);
        res.status(500).json({
            error: 'OCR processing failed',
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? null : error.stack
        });
    }
});
