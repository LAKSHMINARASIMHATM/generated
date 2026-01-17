import { Router } from 'express';
import analysisRoutes from './routes/analysis.routes';
import authRoutes from './routes/auth.routes';
import billRoutes from './routes/bill.routes';
import ocrRoutes from './routes/ocr.routes'; // Add OCR routes

const router = Router();

// Note: These routes will be prefixed with /api/v1 in the backend app.ts
router.use('/analysis', analysisRoutes);
router.use('/auth', authRoutes);
router.use('/bills', billRoutes);
router.use('/ocr', ocrRoutes); // Add OCR routes

export default router;