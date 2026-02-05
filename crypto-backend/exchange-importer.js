/**
 * Exchange Balance Auto-Importer
 * Automatically imports exchange balances to wallets every 5 minutes
 * Runs independently of frontend - backend-driven automation
 */

import ccxt from 'ccxt';
import { getAllApiKeys, getAllWallets, createWallet, getAllAssets, createAsset, updateAsset } from './db.js';

const IMPORT_INTERVAL = 5 * 60 * 1000; // 5 minutes
let importTimer = null;

/**
 * Import balances from all configured exchanges
 */
async function importAllExchangeBalances() {
  const startTime = Date.now();
  console.log(`[IMPORTER] ⏰ Starting exchange balance import at ${new Date().toLocaleString()}`);
  
  try {
    const apiKeys = getAllApiKeys();
    
    if (apiKeys.length === 0) {
      console.log('[IMPORTER] ℹ️  No API keys configured, skipping import');
      return;
    }
    
    console.log(`[IMPORTER] 🔑 Found ${apiKeys.length} exchange API key(s)`);
    
    let totalImported = 0;
    
    for (const apiKeyRecord of apiKeys) {
      try {
        const { exchange, apiKey, apiSecret, password } = apiKeyRecord;
        console.log(`[IMPORTER] 📊 Processing ${exchange}...`);
        
        // Fetch balances from exchange
        const balances = await fetchExchangeBalance(exchange, apiKey, apiSecret, password);
        
        if (balances.length === 0) {
          console.log(`[IMPORTER]   ℹ️  No balances found for ${exchange}`);
          continue;
        }
        
        console.log(`[IMPORTER]   ✓ Found ${balances.length} asset(s) in ${exchange}`);
        
        // Find or create exchange wallet
        const wallet = await findOrCreateExchangeWallet(exchange);
        console.log(`[IMPORTER]   💼 Using wallet: ${wallet.name} (ID: ${wallet.id})`);
        
        // Import each balance as asset
        let importedCount = 0;
        for (const balance of balances) {
          const imported = await importAsset(wallet.id, balance);
          if (imported) importedCount++;
        }
        
        console.log(`[IMPORTER]   ✅ Imported ${importedCount}/${balances.length} assets`);
        totalImported += importedCount;
        
      } catch (error) {
        console.error(`[IMPORTER]   ❌ Error importing ${apiKeyRecord.exchange}:`, error.message);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[IMPORTER] ✅ Import complete in ${duration}ms (${totalImported} assets updated)`);
    
  } catch (error) {
    console.error('[IMPORTER] ❌ Import failed:', error.message);
  }
}

/**
 * Fetch balance from exchange using CCXT
 */
async function fetchExchangeBalance(exchangeName, apiKey, apiSecret, password) {
  const ExchangeClass = ccxt[exchangeName];
  if (!ExchangeClass) {
    throw new Error(`Exchange ${exchangeName} not supported`);
  }
  
  const config = {
    apiKey,
    secret: apiSecret,
    enableRateLimit: true,
    options: {
      defaultType: 'spot',
    }
  };
  
  if (password) {
    config.password = password;
  }
  
  // OKX-specific configuration
  if (exchangeName.toLowerCase() === 'okx') {
    config.options = {
      ...config.options,
      recvWindow: 5000,
    };
  }
  
  const exchange = new ExchangeClass(config);
  const balances = [];
  
  // OKX: Fetch from trading and funding accounts
  if (exchangeName.toLowerCase() === 'okx') {
    try {
      const tradingBalance = await exchange.fetchBalance();
      for (const [currency, total] of Object.entries(tradingBalance.total || {})) {
        if (total > 0) {
          balances.push({
            symbol: currency,
            free: tradingBalance.free[currency] || 0,
            used: tradingBalance.used[currency] || 0,
            total: total,
          });
        }
      }
    } catch (err) {
      console.error(`[IMPORTER]     Trading account error: ${err.message}`);
    }
    
    try {
      const fundingBalance = await exchange.fetchBalance({ type: 'funding' });
      for (const [currency, total] of Object.entries(fundingBalance.total || {})) {
        if (total > 0) {
          const existing = balances.find(b => b.symbol === currency);
          if (existing) {
            existing.free += fundingBalance.free[currency] || 0;
            existing.used += fundingBalance.used[currency] || 0;
            existing.total += total;
          } else {
            balances.push({
              symbol: currency,
              free: fundingBalance.free[currency] || 0,
              used: fundingBalance.used[currency] || 0,
              total: total,
            });
          }
        }
      }
    } catch (err) {
      console.error(`[IMPORTER]     Funding account error: ${err.message}`);
    }
  } else {
    // Standard exchange balance fetch
    const balance = await exchange.fetchBalance();
    for (const [currency, total] of Object.entries(balance.total || {})) {
      if (total > 0) {
        balances.push({
          symbol: currency,
          free: balance.free[currency] || 0,
          used: balance.used[currency] || 0,
          total: total,
        });
      }
    }
  }
  
  return balances;
}

/**
 * Find or create exchange wallet
 */
function findOrCreateExchangeWallet(exchangeName) {
  const wallets = getAllWallets();
  const normalizedExchange = exchangeName.toLowerCase();
  
  // Find existing exchange wallet
  let wallet = wallets.find(w => 
    w.type === 'exchange' && 
    w.exchange_name && 
    w.exchange_name.toLowerCase() === normalizedExchange
  );
  
  if (!wallet) {
    // Create new exchange wallet
    const walletName = exchangeName.toUpperCase();
    wallet = createWallet(walletName, 'exchange', normalizedExchange);
    console.log(`[IMPORTER]   📝 Created new wallet: ${walletName}`);
  }
  
  return wallet;
}

/**
 * Import asset to wallet (create or update)
 */
function importAsset(walletId, balance) {
  const assets = getAllAssets();
  const existing = assets.find(a => 
    a.wallet_id === walletId && 
    a.symbol.toLowerCase() === balance.symbol.toLowerCase()
  );
  
  if (existing) {
    // Update existing asset
    if (Math.abs(existing.quantity - balance.total) > 0.00000001) {
      updateAsset(existing.id, { quantity: balance.total });
      console.log(`[IMPORTER]     🔄 Updated ${balance.symbol}: ${balance.total}`);
      return true;
    }
    return false;
  } else {
    // Create new asset
    createAsset(
      walletId,
      balance.symbol,
      balance.total,
      0, // purchase_price unknown for exchange imports
      new Date().toISOString().split('T')[0] // today
    );
    console.log(`[IMPORTER]     ➕ Added ${balance.symbol}: ${balance.total}`);
    return true;
  }
}

/**
 * Start auto-import timer
 */
export function startExchangeImporter() {
  if (importTimer) {
    console.log('[IMPORTER] ⚠️  Importer already running');
    return;
  }
  
  console.log('[IMPORTER] 🚀 Starting exchange balance auto-importer');
  console.log(`[IMPORTER] 📅 Import interval: ${IMPORT_INTERVAL / 1000}s (${IMPORT_INTERVAL / 60000} minutes)`);
  
  // Run immediately on start
  importAllExchangeBalances();
  
  // Then run every interval
  importTimer = setInterval(importAllExchangeBalances, IMPORT_INTERVAL);
  
  console.log('[IMPORTER] ✅ Auto-importer started');
}

/**
 * Stop auto-import timer
 */
export function stopExchangeImporter() {
  if (importTimer) {
    clearInterval(importTimer);
    importTimer = null;
    console.log('[IMPORTER] 🛑 Auto-importer stopped');
  }
}

/**
 * Trigger manual import
 */
export async function triggerManualImport() {
  console.log('[IMPORTER] 🔄 Manual import triggered');
  await importAllExchangeBalances();
}
