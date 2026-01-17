import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { mockBackend } from '../../../../mockBackend.tsx';
import { priceComparisonService } from '../../services/price-comparison.service';

export const getInsights = asyncHandler(async (req: any, res: any) => {
    const bills = mockBackend.bills.getAll();
    const insights = mockBackend.analysis.getSpendingInsights(bills);
    res.status(200).json(insights);
});

export const getShoppingList = asyncHandler(async (req: any, res: any) => {
    const bills = mockBackend.bills.getAll();
    const list = mockBackend.analysis.generateShoppingList(bills);
    res.status(200).json(list);
});

export const getPrices = asyncHandler(async (req: any, res: any) => {
    const { billId } = req.params;
    console.log(`\n🎯 [API REQUEST] GET /api/v1/analysis/prices/${billId}`);

    const bills = mockBackend.bills.getAll();
    const bill = bills.find(b => b.id === billId);

    if (!bill) {
        console.log(`❌ [ERROR] Bill not found: ${billId}`);
        return res.status(404).json({ error: 'Bill not found' });
    }

    console.log(`📋 [BILL FOUND] "${bill.storeName}" with ${bill.items.length} items`);

    // Fetch prices for all items in the bill
    const itemsWithPrices = bill.items.map(item => ({
        name: item.name,
        price: item.price
    }));

    console.log(`🔍 [PROCESSING] Fetching prices for ${itemsWithPrices.length} items...\n`);
    const startTime = Date.now();

    const pricesMap = await priceComparisonService.fetchBulkPrices(itemsWithPrices);

    const elapsed = Date.now() - startTime;
    console.log(`⚡ [COMPLETED] Price fetching took ${elapsed}ms`);

    // Convert map to array format for easier frontend consumption
    const result = Array.from(pricesMap.entries()).map(([itemName, platforms]) => ({
        itemName,
        platforms
    }));

    console.log(`✅ [SUCCESS] Returning ${result.length} items with price comparisons\n`);

    res.status(200).json({
        success: true,
        billId,
        prices: result
    });
});
