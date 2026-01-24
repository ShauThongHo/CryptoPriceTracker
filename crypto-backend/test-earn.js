/**
 * Automated Test Script for Earn/Staking Interest Calculation
 * 
 * This script tests the automatic interest calculation feature by:
 * 1. Creating a test wallet
 * 2. Creating test Earn positions with different configurations
 * 3. Simulating time passage by modifying database
 * 4. Verifying interest calculations for compound and simple interest
 * 
 * Usage: node test-earn.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
  createWallet, 
  createAsset, 
  getAllAssets,
  getDatabase 
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_FILE = path.join(__dirname, 'database.json');

console.log('\n🧪 ==================== EARN INTEREST CALCULATION TEST ====================\n');

// Test configuration
const TEST_PRINCIPAL = 10000;
const TEST_APY = 12; // 12%
const PAYOUT_INTERVAL = 24; // 24 hours (daily)
const SIMULATE_HOURS = 25; // Simulate 25 hours passing

// Helper: Calculate expected interest
function calculateExpectedInterest(principal, apy, hours, payoutIntervalHours, interestType) {
  const apyDecimal = apy / 100;
  const periodsPassed = Math.floor(hours / payoutIntervalHours); // Only complete periods
  const ratePerPeriod = apyDecimal / (365 * (24 / payoutIntervalHours));
  
  if (interestType === 'compound') {
    // Compound: A = P * (1 + r)^n
    const newAmount = principal * Math.pow((1 + ratePerPeriod), periodsPassed);
    return newAmount - principal;
  } else {
    // Simple: I = P * r * n
    return principal * ratePerPeriod * periodsPassed;
  }
}

async function runTests() {
  try {
    console.log('📋 Step 1: Create test wallet...');
    const wallet = createWallet('Test Earn Wallet', 'test');
    console.log(`   ✅ Wallet created: ID ${wallet.id}`);
    
    console.log('\n📋 Step 2: Create Earn positions...\n');
    
    // Test 1: Compound Interest (Daily Payout)
    console.log('   🔹 Test 1: Compound Interest (Daily Payout)');
    const asset1 = createAsset(wallet.id, 'USDT', TEST_PRINCIPAL, 'earn', 'Compound Test', {
      enabled: true,
      apy: TEST_APY,
      interestType: 'compound',
      payoutIntervalHours: PAYOUT_INTERVAL
    });
    console.log(`      ✅ Created asset ID ${asset1.id}: ${TEST_PRINCIPAL} USDT @ ${TEST_APY}% APY (compound)`);
    
    // Test 2: Simple Interest (Daily Payout)
    console.log('\n   🔹 Test 2: Simple Interest (Daily Payout)');
    const asset2 = createAsset(wallet.id, 'USDC', TEST_PRINCIPAL, 'earn', 'Simple Test', {
      enabled: true,
      apy: TEST_APY,
      interestType: 'simple',
      payoutIntervalHours: PAYOUT_INTERVAL
    });
    console.log(`      ✅ Created asset ID ${asset2.id}: ${TEST_PRINCIPAL} USDC @ ${TEST_APY}% APY (simple)`);
    
    // Test 3: Weekly Payout (Compound)
    console.log('\n   🔹 Test 3: Weekly Payout (Compound)');
    const asset3 = createAsset(wallet.id, 'DAI', TEST_PRINCIPAL, 'staking', 'Weekly Test', {
      enabled: true,
      apy: 8,
      interestType: 'compound',
      payoutIntervalHours: 168 // 7 days
    });
    console.log(`      ✅ Created asset ID ${asset3.id}: ${TEST_PRINCIPAL} DAI @ 8% APY (compound, weekly)`);
    
    console.log('\n📋 Step 3: Simulate time passage...');
    console.log(`   ⏰ Simulating ${SIMULATE_HOURS} hours passing...`);
    
    // Modify database to simulate time passage
    const db = getDatabase();
    const now = Date.now();
    const simulatedTime = now - (SIMULATE_HOURS * 3600 * 1000);
    
    db.data.assets.forEach(asset => {
      if (asset.earnConfig && asset.earnConfig.enabled) {
        // Set last payout to simulated time (25 hours ago)
        asset.earnConfig.lastPayoutAt = simulatedTime;
      }
    });
    
    // Save modified database
    fs.writeFileSync(DB_FILE, JSON.stringify(db.data, null, 2));
    console.log('   ✅ Database modified: lastPayoutAt set to 25 hours ago');
    
    console.log('\n📋 Step 4: Trigger interest calculation...');
    const assetsAfter = getAllAssets();
    
    console.log('\n📊 ==================== RESULTS ====================\n');
    
    // Find our test assets
    const result1 = assetsAfter.find(a => a.id === asset1.id);
    const result2 = assetsAfter.find(a => a.id === asset2.id);
    const result3 = assetsAfter.find(a => a.id === asset3.id);
    
    // Test 1: Compound Daily
    const expected1 = calculateExpectedInterest(TEST_PRINCIPAL, TEST_APY, SIMULATE_HOURS, PAYOUT_INTERVAL, 'compound');
    const actual1 = result1.amount - TEST_PRINCIPAL;
    const diff1 = Math.abs(actual1 - expected1);
    const match1 = diff1 < 0.00001; // Allow tiny precision difference
    const periodsPaid1 = Math.floor(SIMULATE_HOURS / PAYOUT_INTERVAL);
    
    console.log('🔹 Test 1: Compound Interest (Daily Payout)');
    console.log(`   Principal:          ${TEST_PRINCIPAL} USDT`);
    console.log(`   APY:                ${TEST_APY}%`);
    console.log(`   Time Elapsed:       ${SIMULATE_HOURS} hours`);
    console.log(`   Periods Paid:       ${periodsPaid1} payout(s)`);
    console.log(`   Expected Interest:  ${expected1.toFixed(8)} USDT`);
    console.log(`   Actual Interest:    ${actual1.toFixed(8)} USDT`);
    console.log(`   New Balance:        ${result1.amount.toFixed(8)} USDT`);
    console.log(`   ${match1 ? '✅ PASS' : '❌ FAIL'} (difference: ${diff1.toFixed(8)})`);
    
    // Test 2: Simple Daily
    const expected2 = calculateExpectedInterest(TEST_PRINCIPAL, TEST_APY, SIMULATE_HOURS, PAYOUT_INTERVAL, 'simple');
    const actual2 = result2.amount - TEST_PRINCIPAL;
    const diff2 = Math.abs(actual2 - expected2);
    const match2 = diff2 < 0.00001;
    const periodsPaid2 = Math.floor(SIMULATE_HOURS / PAYOUT_INTERVAL);
    
    console.log('\n🔹 Test 2: Simple Interest (Daily Payout)');
    console.log(`   Principal:          ${TEST_PRINCIPAL} USDC`);
    console.log(`   APY:                ${TEST_APY}%`);
    console.log(`   Time Elapsed:       ${SIMULATE_HOURS} hours`);
    console.log(`   Periods Paid:       ${periodsPaid2} payout(s)`);
    console.log(`   Expected Interest:  ${expected2.toFixed(8)} USDC`);
    console.log(`   Actual Interest:    ${actual2.toFixed(8)} USDC`);
    console.log(`   New Balance:        ${result2.amount.toFixed(8)} USDC`);
    console.log(`   ${match2 ? '✅ PASS' : '❌ FAIL'} (difference: ${diff2.toFixed(8)})`);
    
    // Test 3: Weekly (should NOT pay out yet)
    const actual3 = result3.amount - TEST_PRINCIPAL;
    const match3 = actual3 === 0; // Should be zero (no payout yet)
    
    console.log('\n🔹 Test 3: Weekly Payout (Should NOT pay yet)');
    console.log(`   Principal:          ${TEST_PRINCIPAL} DAI`);
    console.log(`   APY:                8%`);
    console.log(`   Payout Interval:    168 hours (weekly)`);
    console.log(`   Time Elapsed:       ${SIMULATE_HOURS} hours`);
    console.log(`   Periods Paid:       ${Math.floor(SIMULATE_HOURS / 168)} payout(s)`);
    console.log(`   Interest Paid:      ${actual3.toFixed(8)} DAI`);
    console.log(`   New Balance:        ${result3.amount.toFixed(8)} DAI`);
    console.log(`   ${match3 ? '✅ PASS (no payout yet)' : '❌ FAIL (unexpected payout)'}`);
    
    // Summary
    console.log('\n📊 ==================== SUMMARY ====================\n');
    const passedTests = [match1, match2, match3].filter(Boolean).length;
    const totalTests = 3;
    
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`   Tests Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n   🎉 All tests passed! Interest calculation is working correctly.\n');
    } else {
      console.log('\n   ⚠️  Some tests failed. Please review the calculations.\n');
    }
    
    // Cleanup info
    console.log('📋 Cleanup:');
    console.log(`   - Test wallet ID: ${wallet.id}`);
    console.log(`   - Test asset IDs: ${asset1.id}, ${asset2.id}, ${asset3.id}`);
    console.log('   - You can manually delete these from database.json\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
