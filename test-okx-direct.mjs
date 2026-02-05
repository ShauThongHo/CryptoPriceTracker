/**
 * Direct OKX API Test
 * Tests OKX API credentials directly without server
 */

import ccxt from 'ccxt';

const API_KEY = '470a68b3-fe24-47a1-96ca-1fc19a9f8ef2';
const API_SECRET = '15D25AA7DBCFA61DD766C6D1';
const PASSPHRASE = 'Ho_041125011047';

console.log('='.repeat(60));
console.log('Direct OKX API Test');
console.log('='.repeat(60));
console.log('');
console.log('API Key:', API_KEY.substring(0, 10) + '...');
console.log('API Secret:', API_SECRET.substring(0, 10) + '...');
console.log('Passphrase:', PASSPHRASE.substring(0, 5) + '...');
console.log('');

async function testOKX() {
  try {
    console.log('Creating OKX exchange instance...');
    const exchange = new ccxt.okx({
      apiKey: API_KEY,
      secret: API_SECRET,
      password: PASSPHRASE,
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
      }
    });

    console.log('✓ Exchange instance created');
    console.log('');
    
    console.log('Fetching balance...');
    const balance = await exchange.fetchBalance();
    
    console.log('✓ Balance fetched successfully!');
    console.log('');
    console.log('Balances with positive amounts:');
    
    const assets = [];
    for (const [currency, total] of Object.entries(balance.total || {})) {
      if (total > 0) {
        assets.push({
          symbol: currency,
          total: total,
          free: balance.free[currency] || 0,
          used: balance.used[currency] || 0,
        });
      }
    }
    
    if (assets.length > 0) {
      console.table(assets);
    } else {
      console.log('No assets with positive balance found.');
    }
    
    console.log('');
    console.log('Test completed successfully! ✓');
    
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    if (error.message.includes('Invalid Sign')) {
      console.error('');
      console.error('⚠️  API Signature Error!');
      console.error('This usually means:');
      console.error('1. API Secret is incorrect');
      console.error('2. API Key is incorrect');
      console.error('3. Passphrase is incorrect');
      console.error('4. API permissions are not set correctly');
      console.error('');
      console.error('Please verify your API credentials on OKX:');
      console.error('https://www.okx.com/account/my-api');
    }
  }
}

testOKX();
