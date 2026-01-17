import { asyncHandler } from '../../utils/asyncHandler';
import { OCRService } from '../../services/ocr/ocr.service';
// Updated to use .tsx extension to resolve module not found error
import { mockBackend } from '../../../../mockBackend.tsx';

export const uploadBill = asyncHandler(async (req: any, res: any) => {
  const { image } = req.body;
  if (!image) throw new Error('Image required');

  const extractedData = await OCRService.extractFromImage(image);

  const newBill = {
    ...extractedData,
    id: Math.random().toString(36).substr(2, 9),
    userId: req.user?.id,
    date: new Date().toISOString(),
    image,
  };

  const saved = mockBackend.bills.save(newBill as any);
  res.status(201).json(saved);
});

export const getUserBills = asyncHandler(async (req: any, res: any) => {
  const bills = mockBackend.bills.getAll();
  res.status(200).json(bills);
});

export const getBill = asyncHandler(async (req: any, res: any) => {
  const bills = mockBackend.bills.getAll();
  const bill = bills.find((b: any) => b.id === req.params.id);
  if (!bill) throw new Error('Bill not found');
  res.status(200).json(bill);
});

export const deleteBill = asyncHandler(async (req: any, res: any) => {
  mockBackend.bills.delete(req.params.id);
  res.status(200).json({ message: 'Deleted' });
});