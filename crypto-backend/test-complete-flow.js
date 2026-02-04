/**
 * Complete End-to-End Test for OKX Balance Display
 * 
 * This script tests the entire flow:
 * 1. Backend receives API request
 * 2. Backend fetches OKX balance
 * 3. Backend returns correctly formatted data
 * 4. Simulates frontend consumption of the data
 */

import axios from 'axios';

const BACKEND_URL = 'http://192.168.0.54:3000';

console.log('='.repeat(70));
console.log('OKX BALANCE END-TO-END TEST');
console.log('='.repeat(70));
console.log('');

async function testEndToEnd() {
  try {
    // Step 1: Check backend is running
    console.log('📡 Step 1: Checking backend server...');
    const statusResponse = await axios.get(`${BACKEND_URL}/status`);
    console.log(`   ✅ Backend is running (uptime: ${Math.floor(statusResponse.data.uptime / 1000)}s)`);
    console.log('');

    // Step 2: Fetch OKX balance from backend
    console.log('💰 Step 2: Fetching OKX balance from backend API...');
    const balanceResponse = await axios.get(`${BACKEND_URL}/api/exchange/okx/balance`);
    
    console.log(`   ✅ Response received (${balanceResponse.status})`);
    console.log('');

    // Step 3: Validate response format
    console.log('🔍 Step 3: Validating response format...');
    const { success, exchange, count, data, timestamp } = balanceResponse.data;
    
    if (!success) {
      throw new Error('Response indicates failure');
    }
    if (!Array.isArray(data)) {
      throw new Error('Data is not an array');
    }
    
    console.log('   ✅ Response format is correct');
    console.log(`   - success: ${success}`);
    console.log(`   - exchange: ${exchange}`);
    console.log(`   - count: ${count}`);
    console.log(`   - timestamp: ${new Date(timestamp).toLocaleString()}`);
    console.log('');

    // Step 4: Display balances (as frontend would)
    console.log('📊 Step 4: Processing balances (frontend simulation)...');
    console.log('');

    if (count === 0) {
      console.log('   ⚠️  No balances found');
    } else {
      console.log(`   Found ${count} asset(s):`);
      console.log('');

      for (let i = 0; i < data.length; i++) {
        const asset = data[i];
        console.log(`   ${i + 1}. ${asset.symbol}`);
        console.log(`      Total:   ${asset.total.toFixed(8)} ${asset.symbol}`);
        console.log(`      Free:    ${asset.free.toFixed(8)} ${asset.symbol}`);
        console.log(`      Used:    ${asset.used.toFixed(8)} ${asset.symbol}`);
        if (asset.account) {
          console.log(`      Account: ${asset.account}`);
        }
        console.log('');
      }
    }

    // Step 5: Test repeated fetches (simulate 5-second refresh)
    console.log('🔄 Step 5: Testing repeated fetches (simulating auto-refresh)...');
    console.log('   Fetching 3 times with 2-second interval...');
    console.log('');

    for (let i = 1; i <= 3; i++) {
      const startTime = Date.now();
      const response = await axios.get(`${BACKEND_URL}/api/exchange/okx/balance`);
      const duration = Date.now() - startTime;
      
      console.log(`   Fetch #${i}: ${response.data.count} assets (${duration}ms)`);
      
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    console.log('');

    // Step 6: Display what frontend component should show
    console.log('='.repeat(70));
    console.log('EXPECTED FRONTEND DISPLAY:');
    console.log('='.repeat(70));
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Exchange Balances                           [Refresh] ↻       ║');
    console.log('║  Auto-updating every 5s                                        ║');
    console.log('║                                                                ║');
    console.log('║  ● Last updated: [TIME]                                        ║');
    console.log('║                                                                ║');
    console.log('║  OKX (3 assets)                                                ║');
    console.log('║  ┌────────────────────────────────────────────────────────┐   ║');
    
    for (const asset of data) {
      const symbol = asset.symbol.padEnd(8);
      const amount = asset.total.toFixed(8);
      console.log(`║  │ ${symbol}  ${amount}                                   │   ║`);
    }
    
    console.log('║  └────────────────────────────────────────────────────────┘   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    // Final summary
    console.log('='.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(70));
    console.log('');
    console.log('Summary:');
    console.log(`  - Backend API: Working ✅`);
    console.log(`  - Data format: Valid ✅`);
    console.log(`  - Assets found: ${count} ✅`);
    console.log(`  - Repeated fetches: Working ✅`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Open your PWA frontend');
    console.log('  2. Go to Dashboard page');
    console.log('  3. You should see the Exchange Balances card');
    console.log('  4. It will auto-update every 5 seconds');
    console.log('');
    console.log('If you don\'t see the card:');
    console.log('  - Open browser console (F12)');
    console.log('  - Look for [ExchangeSync] logs');
    console.log('  - Check VITE_USE_BACKEND is set to \'true\' in .env');
    console.log('  - Check VITE_API_BASE_URL matches backend URL');
    console.log('');

  } catch (error) {
    console.log('');
    console.log('='.repeat(70));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(70));
    console.log('');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.log('');
      console.log('Response details:');
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data:`, error.response.data);
    }
    
    process.exit(1);
  }
}

// Run test
testEndToEnd();
