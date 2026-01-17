
import { Router } from 'express';
import * as AnalysisController from './analysis.controller';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/spending-insights', AnalysisController.getInsights);
router.get('/shopping-list', AnalysisController.getShoppingList);

export default router;
