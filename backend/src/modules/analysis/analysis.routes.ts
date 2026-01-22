import { Router } from 'express';
import { getPrices, getInsights, getShoppingList } from './analysis.controller';

const router = Router();

router.get('/prices/:billId', getPrices);
router.get('/insights', getInsights);
router.get('/shopping-list', getShoppingList);

export default router;
