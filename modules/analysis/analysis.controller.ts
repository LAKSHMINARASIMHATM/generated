import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
// Updated to use .tsx extension to resolve module not found error
import { mockBackend } from '../../mockBackend.tsx';

// Using any for req and res to resolve Property 'status' missing errors
export const getInsights = asyncHandler(async (req: any, res: any) => {
  const bills = mockBackend.bills.getAll();
  const insights = mockBackend.analysis.getSpendingInsights(bills);
  res.status(200).json(insights);
});

// Using any for req and res to resolve Property 'status' missing errors
export const getShoppingList = asyncHandler(async (req: any, res: any) => {
  const bills = mockBackend.bills.getAll();
  const list = mockBackend.analysis.generateShoppingList(bills);
  res.status(200).json(list);
});