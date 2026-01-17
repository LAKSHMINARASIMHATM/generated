
import { Router } from 'express';
import * as BillController from './bill.controller';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/upload', BillController.uploadBill);
router.get('/', BillController.getUserBills);
router.get('/:id', BillController.getBill);
router.delete('/:id', BillController.deleteBill);

export default router;
