/**
 * Test Backend OKX API Endpoint
 * 
 * This script tests the backend server's /api/exchange/balance/:exchange endpoint
 * 
 * Prerequisites:
 * 1. Backend server must be running (npm start)
 * 2. OKX API key must be saved in the backend database
 * 
 * Run: node test-backend-okx.js
 */

import axios from 'axios';

const BACKEND_URL = 'http://localhost:3000';
const EXCHANGE_NAME = 'okx';

async function testBackendOKX() {
  console.log('='.repeat(70));
  console.log('Backend OKX API Endpoint Test');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Exchange: ${EXCHANGE_NAME}`);
  console.log('');
  
  try {
    // Test 1: Check if backend is running
    console.log('🔄 Step 1: Checking if backend server is running...');
    try {
      const statusResponse = await axios.get(`${BACKEND_URL}/status`);
      console.log('   ✅ Backend is running');
      console.log(`   Server uptime: ${Math.floor(statusResponse.data.uptime / 1000)}s`);
      console.log('');
    } catch (error) {
      console.error('   ❌ Backend is not running!');
      console.error('   Please start the backend server first:');
      console.error('   cd crypto-backend && npm start');
      console.error('');
      process.exit(1);
    }
    
    // Test 2: Check if API key exists
    console.log('🔄 Step 2: Checking if OKX API key is saved...');
    try {
      const listResponse = await axios.get(`${BACKEND_URL}/api/exchange/list`);
      const exchanges = listResponse.data.data || [];
      const okxRecord = exchanges.find(e => e.exchange.toLowerCase() === 'okx');
      
      if (okxRecord) {
        console.log('   ✅ OKX API key found in database');
        console.log(`   Created at: ${new Date(okxRecord.createdAt).toLocaleString()}`);
        if (okxRecord.lastUsed) {
          console.log(`   Last used: ${new Date(okxRecord.lastUsed).toLocaleString()}`);
        }
      } else {
        console.error('   ❌ No OKX API key found in backend database!');
        console.error('');
        console.error('   You need to save your API key first:');
        console.error('   1. Open your PWA frontend');
        console.error('   2. Go to Settings');
        console.error('   3. Add OKX API key');
        console.error('');
        console.error('   Or use curl to add it:');
        console.error('');
        console.error('   curl -X POST http://localhost:3000/api/exchange/apikey \\');
        console.error('     -H "Content-Type: application/json" \\');
        console.error('     -d \'{"exchange":"okx","apiKey":"YOUR_KEY","apiSecret":"YOUR_SECRET","password":"YOUR_PASSPHRASE"}\'');
        console.error('');
        process.exit(1);
      }
      console.log('');
    } catch (error) {
      console.error('   ❌ Error checking API keys:', error.message);
      throw error;
    }
    
    // Test 3: Fetch balance from backend
    console.log('🔄 Step 3: Fetching OKX balance from backend API...');
    console.log('');
    
    try {
      const startTime = Date.now();
      const balanceResponse = await axios.get(`${BACKEND_URL}/api/exchange/balance/${EXCHANGE_NAME}`);
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Balance fetched successfully! (${duration}ms)`);
      console.log('');
      console.log('='.repeat(70));
      console.log('BACKEND RESPONSE:');
      console.log('='.repeat(70));
      console.log('');
      
      const { success, exchange, count, data, timestamp } = balanceResponse.data;
      
      console.log(`Success: ${success}`);
      console.log(`Exchange: ${exchange}`);
      console.log(`Asset count: ${count}`);
      console.log(`Timestamp: ${new Date(timestamp).toLocaleString()}`);
      console.log('');
      
      if (count === 0) {
        console.log('⚠️  No assets found (count = 0)');
        console.log('');
        console.log('Possible reasons:');
        console.log('  1. Account has no balance');
        console.log('  2. Backend is not fetching from correct account type');
        console.log('  3. API key permissions issue');
        console.log('');
      } else {
        console.log(`Found ${count} asset(s):\n`);
        
        data.forEach((asset, index) => {
          console.log(`${index + 1}. ${asset.symbol}:`);
          console.log(`   Total: ${asset.total}`);
          console.log(`   Free:  ${asset.free}`);
          console.log(`   Used:  ${asset.used}`);
          if (asset.account) {
            console.log(`   Account: ${asset.account}`);
          }
          console.log('');
        });
      }
      
      console.log('='.repeat(70));
      console.log('RAW RESPONSE DATA:');
      console.log('='.repeat(70));
      console.log(JSON.stringify(balanceResponse.data, null, 2));
      console.log('');
      
    } catch (error) {
      console.error('   ❌ Failed to fetch balance from backend');
      console.error('');
      console.error(`   Status: ${error.response?.status || 'N/A'}`);
      console.error(`   Error: ${error.response?.data?.error || error.message}`);
      console.error('');
      
      if (error.response?.status === 404) {
        console.error('   💡 API key not found in database');
      } else if (error.response?.status === 500) {
        console.error('   💡 Server error - check backend logs for details');
      }
      
      if (error.response?.data) {
        console.error('   Response data:');
        console.error('   ', JSON.stringify(error.response.data, null, 2));
      }
      console.error('');
      
      throw error;
    }
    
    console.log('='.repeat(70));
    console.log('✅ BACKEND TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log('');
    
  } catch (error) {
    console.log('');
    console.log('='.repeat(70));
    console.log('❌ BACKEND TEST FAILED');
    console.log('='.repeat(70));
    console.log('');
    console.error('Error:', error.message);
    
    if (error.stack) {
      console.log('');
      console.log('Stack trace:');
      console.log(error.stack);
    }
    
    process.exit(1);
  }
}

// Run the test
console.log('');
testBackendOKX();
