import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { Bill, IBill } from '../../models/Bill.model';
import { priceComparisonService } from '../../services/price-comparison.service';

export const getInsights = asyncHandler(async (req: any, res: any) => {
    const bills = await Bill.find().sort({ date: -1 });
    // TODO: Implement insights calculation
    const insights = {
        totalSpent: bills.reduce((sum, bill) => sum + bill.totalAmount, 0),
        totalBills: bills.length,
        averageBillAmount: bills.length > 0 ? bills.reduce((sum, bill) => sum + bill.totalAmount, 0) / bills.length : 0
    };
    res.status(200).json(insights);
});

export const getShoppingList = asyncHandler(async (req: any, res: any) => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const bills = await Bill.find({ date: { $gte: threeMonthsAgo } }).sort({ date: -1 });

    // Calculate item frequency
    const itemFrequency: Record<string, { count: number; totalPrice: number; totalQuantity: number; category: string }> = {};

    bills.forEach(bill => {
        bill.items.forEach(item => {
            const key = item.name.toLowerCase().trim();
            if (!itemFrequency[key]) {
                itemFrequency[key] = { count: 0, totalPrice: 0, totalQuantity: 0, category: item.category || 'Other' };
            }
            itemFrequency[key].count += 1;
            itemFrequency[key].totalPrice += item.price;
            itemFrequency[key].totalQuantity += item.quantity || 1;
        });
    });

    // Generate list from items bought 2+ times
    const items = Object.entries(itemFrequency)
        .filter(([_, data]) => data.count >= 2)
        .map(([name, data]) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: name.charAt(0).toUpperCase() + name.slice(1),
            frequency: data.count,
            avgPrice: data.totalPrice / data.count,
            suggestedQuantity: Math.ceil(data.totalQuantity / data.count),
            category: data.category,
            checked: false
        }))
        .sort((a, b) => b.frequency - a.frequency);

    res.status(200).json({
        items,
        totalItems: items.length
    });
});

export const getPrices = asyncHandler(async (req: any, res: any) => {
    const { billId } = req.params;
    console.log(`\n🎯 [API REQUEST] GET /api/v1/analysis/prices/${billId}`);

    const bill = await Bill.findOne({ id: billId });

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
