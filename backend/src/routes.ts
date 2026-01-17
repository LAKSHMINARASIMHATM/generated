
import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import billRoutes from './modules/bills/bill.routes';
import analysisRoutes from './modules/analysis/analysis.routes';
import ocrRoutes from './modules/ocr/ocr.routes';
import platformRoutes from './modules/platforms/platforms.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bills', billRoutes);
router.use('/analysis', analysisRoutes);
router.use('/ocr', ocrRoutes);

console.log('🔌 Registering platform routes...');
router.use('/platforms', (req, res, next) => {
    console.log(`🎯 Platform route hit: ${req.method} ${req.url}`);
    next();
}, platformRoutes);

export default router;
