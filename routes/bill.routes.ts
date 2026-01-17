
import express from 'express';
import { uploadBill, getUserBills, getBill, deleteBill } from '../controllers/bill.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/upload', protect, uploadBill);
router.get('/', protect, getUserBills);
router.get('/:id', protect, getBill);
router.delete('/:id', protect, deleteBill);

export default router;
