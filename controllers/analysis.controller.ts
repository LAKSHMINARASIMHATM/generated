import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { mockBackend } from '../mockBackend.tsx';
import { Bill, Category } from '../types.tsx';

// Original functions needed by existing routes
export const getSpendingInsights = asyncHandler(async (req: any, res: any) => {
  const bills = mockBackend.bills.getAll();
  const insights = mockBackend.analysis.getSpendingInsights(bills);
  res.status(200).json(insights);
});

export const compareBillPrices = asyncHandler(async (req: any, res: any) => {
  const { billId } = req.params;
  // Placeholder implementation - in a real app this would compare prices
  res.status(200).json({
    billId,
    comparison: 'Price comparison not implemented in mock backend',
    status: 'placeholder'
  });
});

export const generateShoppingList = asyncHandler(async (req: any, res: any) => {
  const bills = mockBackend.bills.getAll();
  const list = mockBackend.analysis.generateShoppingList(bills);
  res.status(200).json(list);
});

// Enhanced analysis controller with OCR-aware processing
export const getEnhancedInsights = asyncHandler(async (req: any, res: any) => {
  const bills = mockBackend.bills.getAll();
  
  // Enhanced insights with OCR quality metrics
  const insights = mockBackend.analysis.getSpendingInsights(bills);
  
  // Add OCR-specific analytics
  const ocrMetrics = analyzeOCRAccuracy(bills);
  
  res.status(200).json({
    ...insights,
    ocrMetrics,
    recommendations: generateRecommendations(bills, ocrMetrics)
  });
});

// New endpoint for OCR quality analysis
export const getOCRMetrics = asyncHandler(async (req: any, res: any) => {
  const bills = mockBackend.bills.getAll();
  const metrics = analyzeOCRAccuracy(bills);
  res.status(200).json(metrics);
});

// New endpoint for bill validation
export const validateBill = asyncHandler(async (req: any, res: any) => {
  const { billId } = req.params;
  const bills = mockBackend.bills.getAll();
  const bill = bills.find(b => b.id === billId);
  
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }
  
  const validation = validateBillData(bill);
  res.status(200).json(validation);
});

// Helper functions
function analyzeOCRAccuracy(bills: Bill[]): any {
  const totalBills = bills.length;
  if (totalBills === 0) return { accuracy: 0, confidence: 0, issues: [] };
  
  let totalItems = 0;
  let validPrices = 0;
  let validQuantities = 0;
  let categorizedItems = 0;
  
  bills.forEach(bill => {
    bill.items.forEach(item => {
      totalItems++;
      if (item.price > 0) validPrices++;
      if (item.quantity > 0) validQuantities++;
      if (item.category !== Category.Other) categorizedItems++;
    });
  });
  
  const priceAccuracy = totalItems > 0 ? (validPrices / totalItems) * 100 : 0;
  const quantityAccuracy = totalItems > 0 ? (validQuantities / totalItems) * 100 : 0;
  const categorizationRate = totalItems > 0 ? (categorizedItems / totalItems) * 100 : 0;
  
  const overallAccuracy = (priceAccuracy + quantityAccuracy + categorizationRate) / 3;
  
  return {
    totalBills,
    totalItems,
    overallAccuracy: parseFloat(overallAccuracy.toFixed(2)),
    priceAccuracy: parseFloat(priceAccuracy.toFixed(2)),
    quantityAccuracy: parseFloat(quantityAccuracy.toFixed(2)),
    categorizationRate: parseFloat(categorizationRate.toFixed(2)),
    issues: identifyCommonIssues(bills)
  };
}

function identifyCommonIssues(bills: Bill[]): string[] {
  const issues: string[] = [];
  
  bills.forEach(bill => {
    // Check for missing store names
    if (!bill.storeName || bill.storeName.trim().toLowerCase() === 'unknown store') {
      issues.push('Missing or unknown store names');
    }
    
    // Check for zero/negative totals
    if (bill.totalAmount <= 0) {
      issues.push('Invalid total amounts');
    }
    
    bill.items.forEach(item => {
      // Check for problematic items
      if (item.price <= 0) issues.push('Items with invalid prices');
      if (item.quantity <= 0) issues.push('Items with invalid quantities');
      if (item.name.trim().length < 2) issues.push('Items with very short names');
    });
  });
  
  // Remove duplicates and return unique issues
  return [...new Set(issues)];
}

function generateRecommendations(bills: Bill[], metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.overallAccuracy < 80) {
    recommendations.push('Consider retaking photos with better lighting and clarity');
  }
  
  if (metrics.categorizationRate < 70) {
    recommendations.push('Review and manually categorize items for better insights');
  }
  
  if (bills.length > 0) {
    const recentBills = bills.slice(0, 5);
    const avgItemsPerBill = recentBills.reduce((sum, bill) => sum + bill.items.length, 0) / recentBills.length;
    
    if (avgItemsPerBill < 3) {
      recommendations.push('Try capturing receipts with more complete item listings');
    }
  }
  
  return recommendations;
}

function validateBillData(bill: Bill): any {
  const issues: string[] = [];
  let isValid = true;
  
  // Validate store name
  if (!bill.storeName || bill.storeName.trim().toLowerCase() === 'unknown store') {
    issues.push('Missing store name');
    isValid = false;
  }
  
  // Validate total amount
  if (bill.totalAmount <= 0) {
    issues.push('Invalid total amount');
    isValid = false;
  }
  
  // Validate items
  if (bill.items.length === 0) {
    issues.push('No items found');
    isValid = false;
  }
  
  let validItems = 0;
  bill.items.forEach((item, index) => {
    if (item.name.trim().length < 2) {
      issues.push(`Item ${index + 1}: Name too short`);
    }
    if (item.price <= 0) {
      issues.push(`Item ${index + 1}: Invalid price`);
    }
    if (item.quantity <= 0) {
      issues.push(`Item ${index + 1}: Invalid quantity`);
    }
    if (item.name && item.price > 0 && item.quantity > 0) {
      validItems++;
    }
  });
  
  const accuracy = bill.items.length > 0 ? (validItems / bill.items.length) * 100 : 0;
  
  return {
    isValid,
    accuracy: parseFloat(accuracy.toFixed(2)),
    issues,
    suggestions: generateBillSuggestions(bill, issues)
  };
}

function generateBillSuggestions(bill: Bill, issues: string[]): string[] {
  const suggestions: string[] = [];
  
  if (issues.includes('Missing store name')) {
    suggestions.push('Retake photo focusing on the store header');
  }
  
  if (issues.some(issue => issue.includes('Invalid price'))) {
    suggestions.push('Ensure prices are clearly visible in the receipt');
  }
  
  if (bill.items.length < 3) {
    suggestions.push('Try capturing a wider shot of the receipt');
  }
  
  return suggestions;
}