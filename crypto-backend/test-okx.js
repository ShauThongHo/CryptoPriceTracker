/**
 * OKX API Test Script
 * 
 * This script tests OKX API connectivity and balance fetching.
 * Run: node test-okx.js
 * 
 * You will be prompted to enter:
 * - API Key
 * - API Secret
 * - Passphrase
 */

import ccxt from 'ccxt';
import readline from 'readline';

// Create readline interface for secure input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Helper function to prompt for password (hidden input)
function promptPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(question);
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    
    let password = '';
    
    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        // Ctrl+C
        process.exit();
      } else if (char === '\u007f') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          stdout.write('\b \b');
        }
      } else {
        password += char;
        stdout.write('*');
      }
    };
    
    stdin.on('data', onData);
  });
}

// Test OKX API
async function testOKX() {
  console.log('='.repeat(60));
  console.log('OKX API Connection Test');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // Get credentials from user
    console.log('Please enter your OKX API credentials:');
    console.log('(These will NOT be saved, only used for testing)');
    console.log('');
    
    const apiKey = await prompt('API Key: ');
    const apiSecret = await prompt('API Secret: ');
    const passphrase = await prompt('Passphrase: ');
    
    console.log('');
    console.log('🔄 Initializing OKX connection...');
    console.log('');
    
    // Initialize OKX exchange
    const exchange = new ccxt.okx({
      apiKey: apiKey,
      secret: apiSecret,
      password: passphrase,
      enableRateLimit: true,
      options: {
        defaultType: 'spot', // 'spot', 'future', 'swap'
      }
    });
    
    console.log('✅ Exchange object created');
    console.log('Exchange ID:', exchange.id);
    console.log('Exchange Name:', exchange.name);
    console.log('');
    
    // Test 1: Check if API is accessible
    console.log('📡 Test 1: Checking API connectivity...');
    try {
      await exchange.loadMarkets();
      console.log('✅ Markets loaded successfully');
      console.log('   Total markets:', Object.keys(exchange.markets).length);
      console.log('');
    } catch (error) {
      console.error('❌ Failed to load markets:', error.message);
      throw error;
    }
    
    // Test 2: Fetch account balance
    console.log('💰 Test 2: Fetching account balance...');
    console.log('');
    
    try {
      const balance = await exchange.fetchBalance();
      
      console.log('✅ Balance fetched successfully!');
      console.log('');
      console.log('='.repeat(60));
      console.log('ACCOUNT BALANCE DETAILS:');
      console.log('='.repeat(60));
      
      // Show all non-zero balances
      const assets = Object.keys(balance.total).filter(currency => 
        balance.total[currency] > 0
      );
      
      if (assets.length === 0) {
        console.log('⚠️  No assets found (balance is 0 for all currencies)');
      } else {
        console.log(`Found ${assets.length} asset(s) with non-zero balance:\n`);
        
        assets.forEach(currency => {
          const total = balance.total[currency];
          const free = balance.free[currency] || 0;
          const used = balance.used[currency] || 0;
          
          console.log(`${currency}:`);
          console.log(`  Total: ${total}`);
          console.log(`  Free:  ${free}`);
          console.log(`  Used:  ${used}`);
          console.log('');
        });
      }
      
      // Show raw balance object for debugging
      console.log('='.repeat(60));
      console.log('RAW BALANCE OBJECT (for debugging):');
      console.log('='.repeat(60));
      console.log(JSON.stringify(balance, null, 2));
      console.log('');
      
    } catch (error) {
      console.error('❌ Failed to fetch balance');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      
      if (error.constructor.name === 'AuthenticationError') {
        console.error('');
        console.error('🔑 AUTHENTICATION ERROR - Possible causes:');
        console.error('   1. API Key is incorrect');
        console.error('   2. API Secret is incorrect');
        console.error('   3. Passphrase is incorrect');
        console.error('   4. API Key does not have "Read" permission');
        console.error('   5. IP address is not whitelisted (if enabled in OKX)');
        console.error('');
        console.error('💡 Please check your OKX API settings at:');
        console.error('   https://www.okx.com/account/my-api');
      } else if (error.constructor.name === 'PermissionDenied') {
        console.error('');
        console.error('🚫 PERMISSION DENIED - Possible causes:');
        console.error('   1. API Key does not have "Read" or "Trade" permission');
        console.error('   2. Check API key permissions in OKX settings');
      }
      
      throw error;
    }
    
    // Test 3: Fetch trading account balance (if available)
    console.log('📊 Test 3: Fetching trading account balance...');
    console.log('');
    
    try {
      // Try to fetch trading balance
      exchange.options.defaultType = 'spot';
      const tradingBalance = await exchange.fetchBalance({ type: 'trading' });
      
      console.log('✅ Trading balance fetched successfully!');
      console.log('');
      
      const tradingAssets = Object.keys(tradingBalance.total).filter(currency => 
        tradingBalance.total[currency] > 0
      );
      
      if (tradingAssets.length > 0) {
        console.log(`Found ${tradingAssets.length} trading asset(s):\n`);
        tradingAssets.forEach(currency => {
          console.log(`${currency}: ${tradingBalance.total[currency]}`);
        });
      } else {
        console.log('No assets in trading account');
      }
      console.log('');
    } catch (error) {
      console.log('⚠️  Trading balance not available:', error.message);
      console.log('');
    }
    
    // Test 4: Test different account types
    console.log('🔍 Test 4: Checking different account types...');
    console.log('');
    
    const accountTypes = ['funding', 'trading', 'spot'];
    
    for (const type of accountTypes) {
      try {
        console.log(`  Trying account type: ${type}...`);
        const typeBalance = await exchange.fetchBalance({ type });
        
        const assets = Object.keys(typeBalance.total).filter(c => typeBalance.total[c] > 0);
        if (assets.length > 0) {
          console.log(`  ✅ ${type}: Found ${assets.length} asset(s)`);
          assets.forEach(currency => {
            console.log(`     ${currency}: ${typeBalance.total[currency]}`);
          });
        } else {
          console.log(`  ℹ️  ${type}: No assets`);
        }
      } catch (error) {
        console.log(`  ⚠️  ${type}: ${error.message}`);
      }
      console.log('');
    }
    
    console.log('='.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('');
    console.log('='.repeat(60));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(60));
    console.error('Error:', error.message);
    
    if (error.stack) {
      console.log('');
      console.log('Stack trace:');
      console.log(error.stack);
    }
  } finally {
    rl.close();
  }
}

// Run the test
testOKX().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
