import { Router } from 'express';
import * as BillController from './bill.controller';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

// Temporary sync route without auth for testing
router.post('/sync', BillController.syncBills);

// Save bill without auth (for frontend that uses mock auth)
router.post('/', BillController.saveBill);

router.use(protect);
router.post('/upload', BillController.uploadBill);
router.get('/', BillController.getUserBills);
router.get('/:id', BillController.getBill);
router.delete('/:id', BillController.deleteBill);

export default router;
