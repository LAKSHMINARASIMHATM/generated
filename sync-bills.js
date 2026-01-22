// This script can be run in the browser console to sync bills from localStorage to the backend API
// Copy and paste this into the browser console on http://localhost:3000

async function syncBillsToBackend() {
  try {
    console.log('🔄 Starting bill sync...');
    
    // Get bills from localStorage
    const billsJSON = localStorage.getItem('smartspend_bills');
    if (!billsJSON) {
      console.log('❌ No bills found in localStorage');
      return;
    }
    
    const bills = JSON.parse(billsJSON);
    console.log(`📋 Found ${bills.length} bills in localStorage`);
    
    // Send bills to backend sync endpoint
    const response = await fetch('http://localhost:8000/api/v1/bills/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: You may need to add auth token if authentication is required
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

// Run the sync
syncBillsToBackend();
