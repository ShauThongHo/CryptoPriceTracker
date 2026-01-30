import axios from 'axios';
import { insertPriceHistory, upsertLatestPrice, getAllAssets, getAllTrackedCoinIds } from './db.js';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

/**
 * Fetch current prices from CoinGecko API
 * Now uses dynamic coin list from database
 */
async function fetchPricesFromCoinGecko() {
  try {
    // Get dynamic list of coins to track
    const TRACKED_COINS = getAllTrackedCoinIds();
    
    if (TRACKED_COINS.length === 0) {
      console.log('[FETCHER] ⚠️  No coins to track');
      return {};
    }
    
    const coinIds = TRACKED_COINS.join(',');
    const url = `${COINGECKO_API_BASE}/simple/price`;
    
    console.log(`[FETCHER] 🔄 Fetching prices for ${TRACKED_COINS.length} coins from CoinGecko...`);
    console.log(`[FETCHER] 📋 Tracking: ${TRACKED_COINS.slice(0, 5).join(', ')}${TRACKED_COINS.length > 5 ? '...' : ''}`);
    
    const response = await axios.get(url, {
      params: {
        ids: coinIds,
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_last_updated_at: true
      },
      timeout: 10000 // 10 second timeout
    });
    
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('[FETCHER] ❌ Request timeout');
    } else if (error.response) {
      console.error(`[FETCHER] ❌ API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      console.error('[FETCHER] ❌ Network error: No response received');
    } else {
      console.error('[FETCHER] ❌ Error:', error.message);
    }
    return null;
  }
}

/**
 * Update prices in database
 */
function updateDatabase(priceData) {
  let successCount = 0;
  let failCount = 0;
  
  // Get dynamic list of coins to track
  const TRACKED_COINS = getAllTrackedCoinIds();
  
  for (const coinId of TRACKED_COINS) {
    const coinData = priceData[coinId];
    
    if (coinData && coinData.usd) {
      const price = coinData.usd;
      const dataJson = JSON.stringify({
        price_usd: price,
        change_24h: coinData.usd_24h_change || null,
        last_updated: coinData.last_updated_at || null
      });
      
      // Insert into history
      const historySuccess = insertPriceHistory(coinId, price, dataJson);
      
      // Update latest price
      const latestSuccess = upsertLatestPrice(coinId, price);
      
      if (historySuccess && latestSuccess) {
        successCount++;
        console.log(`[FETCHER]   ✅ ${coinId}: $${price.toFixed(2)}`);
      } else {
        failCount++;
        console.log(`[FETCHER]   ⚠️ ${coinId}: Failed to save`);
      }
    } else {
      failCount++;
      console.log(`[FETCHER]   ❌ ${coinId}: No data received`);
    }
  }
  
  return { successCount, failCount };
}

/**
 * Main update function - fetches prices and updates database
 */
export async function updatePrices() {
  const startTime = Date.now();
  console.log(`\n[FETCHER] ⏰ Starting price update at ${new Date().toLocaleString()}`);
  
  try {
    // Fetch from CoinGecko
    const priceData = await fetchPricesFromCoinGecko();
    
    if (!priceData) {
      console.error('[FETCHER] ❌ Failed to fetch prices - will retry at next interval');
      return { success: false, error: 'Failed to fetch from API' };
    }
    
    // Update database
    const { successCount, failCount } = updateDatabase(priceData);
    
    const duration = Date.now() - startTime;
    console.log(`[FETCHER] ✅ Update complete in ${duration}ms (${successCount} success, ${failCount} failed)`);
    
    return {
      success: true,
      updated: successCount,
      failed: failCount,
      duration
    };
    
  } catch (error) {
    console.error('[FETCHER] ❌ Unexpected error during update:', error);
    return { success: false, error: error.message };
  }
}

// ==================== EARN INTEREST CALCULATOR ====================

/**
 * Background task: Calculate interest for all Earn/Staking positions
 * Runs every hour to ensure timely payouts even when API is not accessed
 */
function startEarnCalculator() {
  const CALC_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  console.log('[EARN] 💰 Interest calculator started (runs hourly)');
  
  setInterval(() => {
    try {
      // Calling getAllAssets() triggers calculateInterest() internally
      getAllAssets();
      console.log('[EARN] ⏰ Hourly interest check completed');
    } catch (error) {
      console.error('[EARN] Error calculating interest:', error);
    }
  }, CALC_INTERVAL);
}

// Start the interest calculator
startEarnCalculator();
