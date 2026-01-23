import axios from 'axios';
import { insertPriceHistory, upsertLatestPrice } from './db.js';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Coins to track (CoinGecko IDs) - expanded list
const TRACKED_COINS = [
  'bitcoin',
  'ethereum',
  'crypto-com-chain',
  'solana',
  'binancecoin',
  'tether',
  'usd-coin',
  'compound-governance-token',
  'polygon-ecosystem-token',
  'xpin-network',
  'tether-gold',
  'usd1-wlfi',
  'xdai',
  'staked-ether',
  'wrapped-bitcoin',
  'matic-network'
];

/**
 * Fetch current prices from CoinGecko API
 */
async function fetchPricesFromCoinGecko() {
  try {
    const coinIds = TRACKED_COINS.join(',');
    const url = `${COINGECKO_API_BASE}/simple/price`;
    
    console.log(`[FETCHER] 🔄 Fetching prices from CoinGecko...`);
    
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

/**
 * Get list of tracked coins
 */
export function getTrackedCoins() {
  return [...TRACKED_COINS];
}

/**
 * Add a coin to tracking list
 */
export function addTrackedCoin(coinId) {
  if (!TRACKED_COINS.includes(coinId)) {
    TRACKED_COINS.push(coinId);
    console.log(`[FETCHER] ➕ Added ${coinId} to tracking list`);
    return true;
  }
  return false;
}

/**
 * Remove a coin from tracking list
 */
export function removeTrackedCoin(coinId) {
  const index = TRACKED_COINS.indexOf(coinId);
  if (index > -1) {
    TRACKED_COINS.splice(index, 1);
    console.log(`[FETCHER] ➖ Removed ${coinId} from tracking list`);
    return true;
  }
  return false;
}
