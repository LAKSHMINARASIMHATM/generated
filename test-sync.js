// Test script to sync bills to backend
import fetch from 'node-fetch';

async function syncBillsToBackend() {
  try {
    console.log('🔄 Starting bill sync...');
    
    // Simulate bills data (similar to what would be in localStorage)
    const bills = [
      {
        id: 'bill_1769054994010_dll907p22',
        storeName: 'Test Store',
        totalAmount: 150.75,
        date: new Date().toISOString(),
        items: [
          { name: 'Milk', price: 2.99, quantity: 2 },
          { name: 'Bread', price: 3.49, quantity: 1 }
        ]
      }
    ];
    
    console.log(`📋 Syncing ${bills.length} bills to backend`);
    
    // Send bills to backend sync endpoint
    const response = await fetch('http://localhost:8000/api/v1/bills/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bills })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Sync successful:', result);
    } else {
      const error = await response.json();
      console.log('❌ Sync failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Sync error:', error);
  }
}

syncBillsToBackend();
