import express from 'express';
import { getSpendingInsights, compareBillPrices, generateShoppingList, getEnhancedInsights, getOCRMetrics, validateBill } from '../controllers/analysis.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Standard analysis routes
router.get('/spending-insights', protect, getSpendingInsights);
router.get('/price-comparison/:billId', protect, compareBillPrices);
router.get('/shopping-list', protect, generateShoppingList);

// Enhanced OCR-aware analysis routes
router.get('/enhanced-insights', protect, getEnhancedInsights);
router.get('/ocr-metrics', protect, getOCRMetrics);
router.get('/validate-bill/:billId', protect, validateBill);

export default router;