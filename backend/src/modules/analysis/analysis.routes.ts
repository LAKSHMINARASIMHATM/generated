import { Router } from 'express';
import { getPrices } from './analysis.controller';

const router = Router();

router.get('/prices/:billId', getPrices);

export default router;
