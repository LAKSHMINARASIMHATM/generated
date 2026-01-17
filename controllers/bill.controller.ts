import { Response } from 'express';
// Updated to use .tsx extension to resolve module not found error
import { extractBillData } from '../geminiService.tsx';
// Updated to use .tsx extension to resolve module not found error
import { mockBackend } from '../mockBackend.tsx';
// Updated to use .tsx extension to resolve module not found error
import { Bill } from '../types.tsx';

// Using any for req and res to resolve Property 'body', 'status' and 'json' missing errors
export const uploadBill = async (req: any, res: any) => {
  try {
    const { image } = req.body; // Expecting base64 string
    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const extracted = await extractBillData(image);
    const newBill: Bill = {
      ...extracted,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      image,
    } as Bill;

    const saved = mockBackend.bills.save(newBill);
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserBills = async (req: any, res: any) => {
  try {
    const bills = mockBackend.bills.getAll();
    res.json(bills);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getBill = async (req: any, res: any) => {
  try {
    const bills = mockBackend.bills.getAll();
    const bill = bills.find(b => b.id === req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBill = async (req: any, res: any) => {
  try {
    mockBackend.bills.delete(req.params.id);
    res.json({ message: 'Bill deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};