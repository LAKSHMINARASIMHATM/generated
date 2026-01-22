import { asyncHandler } from '../../utils/asyncHandler';
import { OCRService } from '../../services/ocr/ocr.service';
import { Bill, IBill } from '../../models/Bill.model';

export const saveBill = asyncHandler(async (req: any, res: any) => {
  const billData = req.body;
  console.log(`💾 Saving pre-processed bill: ${billData.id}`);

  // Check if bill already exists
  const existingBill = await Bill.findOne({ id: billData.id });
  if (existingBill) {
    console.log(`✅ Bill ${billData.id} already exists, skipping`);
    return res.status(200).json(existingBill);
  }

  const newBill = new Bill({
    ...billData,
    userId: req.user?.id || 'default_user',
    date: new Date(billData.date),
  });

  await newBill.save();
  console.log(`✅ Bill ${billData.id} saved successfully`);
  res.status(201).json(newBill);
});

export const uploadBill = asyncHandler(async (req: any, res: any) => {
  const { image } = req.body;
  if (!image) throw new Error('Image required');

  const extractedData = await OCRService.extractFromImage(image);

  const newBill = new Bill({
    ...extractedData,
    id: Math.random().toString(36).substr(2, 9),
    userId: req.user?.id,
    date: new Date(),
    image,
  });

  await newBill.save();
  res.status(201).json(newBill);
});

export const getUserBills = asyncHandler(async (req: any, res: any) => {
  const bills = await Bill.find({ userId: req.user?.id }).sort({ date: -1 });
  res.status(200).json(bills);
});

export const getBill = asyncHandler(async (req: any, res: any) => {
  const bill = await Bill.findOne({ id: req.params.id, userId: req.user?.id });
  if (!bill) throw new Error('Bill not found');
  res.status(200).json(bill);
});

export const deleteBill = asyncHandler(async (req: any, res: any) => {
  const bill = await Bill.findOneAndDelete({ id: req.params.id, userId: req.user?.id });
  if (!bill) throw new Error('Bill not found');
  res.status(200).json({ message: 'Deleted' });
});

export const syncBills = asyncHandler(async (req: any, res: any) => {
  const { bills } = req.body;
  if (!Array.isArray(bills)) throw new Error('Bills array required');

  const userId = req.user?.id || 'test_user'; // Default to test_user for testing
  const syncedBills = [];

  for (const billData of bills) {
    const existingBill = await Bill.findOne({ id: billData.id, userId });

    if (!existingBill) {
      const newBill = new Bill({
        ...billData,
        userId,
        date: new Date(billData.date),
      });
      await newBill.save();
      syncedBills.push(newBill);
    } else {
      syncedBills.push(existingBill);
    }
  }

  res.status(200).json({
    message: `Synced ${syncedBills.length} bills`,
    bills: syncedBills
  });
});