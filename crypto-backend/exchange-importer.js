/**
 * Exchange Balance Auto-Importer
 * Automatically imports exchange balances to wallets every 5 minutes
 * Runs independently of frontend - backend-driven automation
 */

import ccxt from 'ccxt';
import { getAllApiKeys, getAllWallets, createWallet, getAllAssets, createAsset, updateAsset } from './db.js';

const IMPORT_INTERVAL = 30 * 1000; // 30 seconds for testing (change to 5*60*1000 for production)
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
      console.log(`[IMPORTER]     Trading balance raw:`, JSON.stringify(tradingBalance.total));
      for (const [currency, total] of Object.entries(tradingBalance.total || {})) {
        if (total > 0) {
          balances.push({
            symbol: currency,
            free: tradingBalance.free[currency] || 0,
            used: tradingBalance.used[currency] || 0,
            total: total,
          });
          console.log(`[IMPORTER]     ✓ ${currency}: ${total} (trading)`);
        }
      }
    } catch (err) {
      console.error(`[IMPORTER]     ❌ Trading account error: ${err.message}`);
    }
    
    try {
      const fundingBalance = await exchange.fetchBalance({ type: 'funding' });
      console.log(`[IMPORTER]     Funding balance raw:`, JSON.stringify(fundingBalance.total));
      for (const [currency, total] of Object.entries(fundingBalance.total || {})) {
        if (total > 0) {
          const existing = balances.find(b => b.symbol === currency);
          if (existing) {
            existing.free += fundingBalance.free[currency] || 0;
            existing.used += fundingBalance.used[currency] || 0;
            existing.total += total;
            console.log(`[IMPORTER]     ✓ ${currency}: ${total} (funding merged)`);
          } else {
            balances.push({
              symbol: currency,
              free: fundingBalance.free[currency] || 0,
              used: fundingBalance.used[currency] || 0,
              total: total,
            });
            console.log(`[IMPORTER]     ✓ ${currency}: ${total} (funding)`);
          }
        }
      }
    } catch (err) {
      console.error(`[IMPORTER]     ❌ Funding account error: ${err.message}`);
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
 * Only updates assets with auto_sync flag to avoid interfering with manual entries
 */
function importAsset(walletId, balance) {
  const assets = getAllAssets();
  
  // Find existing auto-synced asset (must have auto_sync = true)
  let existing = assets.find(a => 
    a.wallet_id === walletId && 
    a.symbol.toLowerCase() === balance.symbol.toLowerCase() &&
    a.auto_sync === true
  );
  
  // Migration: If no auto_sync asset found, check for old assets without the flag
  if (!existing) {
    const oldAssets = assets.filter(a => 
      a.wallet_id === walletId && 
      a.symbol.toLowerCase() === balance.symbol.toLowerCase() &&
      a.auto_sync === undefined  // Old asset without flag
    );
    
    // If there's exactly one old asset without manual indicators (no notes, no earn config)
    // assume it's an old auto-sync asset and migrate it
    if (oldAssets.length === 1 && !oldAssets[0].notes && !oldAssets[0].earnConfig) {
      existing = oldAssets[0];
      // Mark it as auto-synced
      updateAsset(existing.id, { auto_sync: true });
      console.log(`[IMPORTER]     🔄 Migrated old asset ${balance.symbol} to auto-sync`);
    }
  }
  
  if (existing) {
    // Update existing auto-synced asset
    if (Math.abs(existing.amount - balance.total) > 0.00000001) {
      updateAsset(existing.id, { amount: balance.total });
      console.log(`[IMPORTER]     🔄 Updated ${balance.symbol}: ${balance.total}`);
      return true;
    }
    return false;
  } else {
    // Create new asset with auto_sync flag
    createAsset(
      walletId,
      balance.symbol,
      balance.total,
      null, // tags
      null, // notes
      null, // earnConfig
      true  // autoSync = true
    );
    console.log(`[IMPORTER]     ➕ Added ${balance.symbol}: ${balance.total} (auto-sync)`);
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
 * Trigger manual import (for API endpoint)
 */
export async function triggerManualImport() {
  console.log('[IMPORTER] 🔄 Manual import triggered by user');
  return await importAllExchangeBalances();
}

/**
 * Export the main import function for direct use
 */
export { importAllExchangeBalances };
