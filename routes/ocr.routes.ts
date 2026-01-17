import express from 'express';
import { processImage } from '../controllers/ocr.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// OCR processing route
router.post('/process-image', protect, processImage);

export default router;