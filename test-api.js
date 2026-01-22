import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...\n');

    // Test insights endpoint
    console.log('1. Testing /api/v1/analysis/insights');
    try {
      const insights = await axios.get(`${API_BASE}/analysis/insights`);
      console.log('✅ Insights:', insights.data);
    } catch (error) {
      console.log('❌ Insights Error:', error.response?.data || error.message);
    }

    // Test shopping list endpoint
    console.log('\n2. Testing /api/v1/analysis/shopping-list');
    try {
      const shoppingList = await axios.get(`${API_BASE}/analysis/shopping-list`);
      console.log('✅ Shopping List:', shoppingList.data);
    } catch (error) {
      console.log('❌ Shopping List Error:', error.response?.data || error.message);
    }

    // Test prices endpoint (should fail since no bills exist)
    console.log('\n3. Testing /api/v1/analysis/prices/bill_1769054994010_dll907p22');
    try {
      const prices = await axios.get(`${API_BASE}/analysis/prices/bill_1769054994010_dll907p22`);
      console.log('✅ Prices:', prices.data);
    } catch (error) {
      console.log('❌ Prices Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
