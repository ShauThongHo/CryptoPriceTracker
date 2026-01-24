import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import ccxt from 'ccxt';
import { 
  initDatabase, 
  closeDatabase, 
  getLatestPrices, 
  getPriceHistory, 
  getDatabaseStats,
  // Wallet operations
  createWallet,
  getAllWallets,
  getWalletById,
  updateWallet,
  deleteWallet,
  // Asset operations
  createAsset,
  getAllAssets,
  getAssetsByWallet,
  getAssetById,
  updateAsset,
  deleteAsset,
  // Sync operations
  getFullSyncState,
  replaceFullSyncState,
  // Portfolio history operations
  insertPortfolioSnapshot,
  getPortfolioHistory,
  getRecentPortfolioHistory,
  getPortfolioHistoryCount,
  cleanupOldPortfolioHistory,
  // API key operations
  createApiKey,
  getAllApiKeys,
  getApiKeyByExchange,
  updateApiKey,
  deleteApiKey
} from './db.js';
import { updatePrices, getTrackedCoins } from './fetcher.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const FETCH_INTERVAL = process.env.FETCH_INTERVAL || 5; // minutes

// Simple in-memory rate limiter per endpoint
const requestCounts = new Map(); // key: `${ip}:${endpoint}`, value: { count, resetTime }
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30; // Max 30 requests per minute per endpoint

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const endpoint = req.path;
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  
  let record = requestCounts.get(key);
  
  // Reset if window expired
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    requestCounts.set(key, record);
  }
  
  // Check limit
  if (record.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    console.warn(`[RATE LIMIT] ${ip} exceeded limit for ${endpoint} (${record.count}/${RATE_LIMIT_MAX})`);
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter,
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`
    });
  }
  
  // Increment counter
  record.count++;
  next();
}

// Initialize database
try {
  initDatabase();
} catch (error) {
  console.error('[SERVER] Failed to initialize database:', error);
  process.exit(1);
}

// Schedule price fetching (every 5 minutes)
console.log(`[CRON] 📅 Scheduling price updates every ${FETCH_INTERVAL} minutes`);
const cronExpression = `*/${FETCH_INTERVAL} * * * *`; // Every N minutes
cron.schedule(cronExpression, async () => {
  await updatePrices();
  // Also update portfolio snapshot
  await calculateAndSavePortfolioSnapshot();
});

// Schedule daily cleanup of old portfolio history (at 3 AM)
console.log('[CRON] 🗑️  Scheduling daily portfolio history cleanup at 3:00 AM');
cron.schedule('0 3 * * *', () => {
  console.log('[CRON] Running daily portfolio history cleanup...');
  const removed = cleanupOldPortfolioHistory(30); // Keep last 30 days
  console.log(`[CRON] Cleanup complete: ${removed} old snapshots removed`);
});

// Calculate and save portfolio snapshot based on current assets and prices
async function calculateAndSavePortfolioSnapshot() {
  try {
    console.log('[PORTFOLIO] 📊 Calculating portfolio snapshot...');
    
    // Get all assets and latest prices
    const assets = getAllAssets();
    const prices = getLatestPrices();
    
    if (assets.length === 0) {
      console.log('[PORTFOLIO] ⚠️  No assets found, skipping snapshot');
      return;
    }
    
    // Symbol to CoinGecko ID mapping (same as frontend)
    const SYMBOL_TO_ID_MAP = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'WETH': 'ethereum',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'USDC': 'usd-coin',
      'COMP': 'compound-governance-token',
      'CRO': 'crypto-com-chain',
      'POL': 'polygon-ecosystem-token',
      'XPIN': 'xpin-network',
      'XAUT': 'tether-gold',
      'USD1': 'usd1-wlfi',
      'XDAI': 'xdai',
      'OPETH': 'ethereum',
      'STETH': 'staked-ether',
      'WBTC': 'wrapped-bitcoin',
      'MATIC': 'matic-network',
    };
    
    // Create price lookup map
    const priceMap = {};
    for (const priceRow of prices) {
      priceMap[priceRow.coin_id] = priceRow.price_usd;
    }
    
    // Calculate wallet values and coin data
    const walletValues = {};
    const coinData = {};
    let totalValue = 0;
    let matchedAssets = 0;
    
    for (const asset of assets) {
      const symbolUpper = asset.symbol.toUpperCase();
      const coinId = SYMBOL_TO_ID_MAP[symbolUpper] || asset.symbol.toLowerCase();
      const price = priceMap[coinId] || 0;
      
      if (price > 0) {
        matchedAssets++;
      }
      
      const value = asset.amount * price;
      
      // Aggregate by wallet
      walletValues[asset.wallet_id] = (walletValues[asset.wallet_id] || 0) + value;
      
      // Aggregate by coin
      if (!coinData[asset.symbol]) {
        coinData[asset.symbol] = { amount: 0, value: 0 };
      }
      coinData[asset.symbol].amount += asset.amount;
      coinData[asset.symbol].value += value;
      
      totalValue += value;
    }
    
    // Save snapshot
    const snapshotData = JSON.stringify({
      wallets: walletValues,
      coins: coinData
    });
    
    const success = insertPortfolioSnapshot(Date.now(), totalValue, snapshotData);
    
    if (success) {
      const totalSnapshots = getPortfolioHistoryCount();
      console.log(`[PORTFOLIO] ✅ Snapshot saved: $${totalValue.toFixed(2)} (${matchedAssets}/${assets.length} assets with prices, ${totalSnapshots} total snapshots)`);
    } else {
      console.log('[PORTFOLIO] ❌ Failed to save snapshot');
    }
    
  } catch (error) {
    console.error('[PORTFOLIO] ❌ Error calculating snapshot:', error);
  }
}

// Fetch prices immediately on startup
console.log('[STARTUP] 🚀 Fetching initial prices...');
updatePrices().then(async result => {
  if (result.success) {
    console.log('[STARTUP] ✅ Initial price fetch complete');
    // Also calculate initial portfolio snapshot
    await calculateAndSavePortfolioSnapshot();
  } else {
    console.log('[STARTUP] ⚠️ Initial price fetch failed, will retry at next interval');
  }
});

// Middleware
app.use(cors({ origin: '*' })); // Allow all origins for LAN access
app.use(express.json({ limit: '10mb' })); // Support large sync payloads

// Apply rate limiting to all requests (except static files)
app.use(rateLimitMiddleware);

// Serve static files from React build (if available)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
console.log(`[STATIC] 📁 Serving frontend from: ${distPath}`);

// Request logging middleware (after static to avoid logging static files)
app.use((req, res, next) => {
  // Skip logging for static assets
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|woff|woff2|ttf|svg)$/)) {
    return next();
  }
  
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${ip}`);
  
  // Log response time
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Phase 1: Basic status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'Server running on Android',
    timestamp: Date.now(),
    uptime: process.uptime(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    healthy: true,
    timestamp: Date.now()
  });
});

// Phase 2: Database endpoints
app.get('/prices', (req, res) => {
  try {
    const prices = getLatestPrices();
    res.json({
      success: true,
      count: prices.length,
      data: prices,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// New endpoint: Batch fetch prices for any coins (on-demand)
app.post('/prices/batch', async (req, res) => {
  try {
    const { coin_ids } = req.body; // Array of CoinGecko IDs
    
    if (!coin_ids || !Array.isArray(coin_ids) || coin_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'coin_ids array is required'
      });
    }

    // Limit to 100 coins per request to avoid API abuse
    if (coin_ids.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 coins per request'
      });
    }

    console.log(`[API] 🔄 Fetching prices for ${coin_ids.length} coins:`, coin_ids.join(', '));

    // Fetch from CoinGecko API
    const idsParam = coin_ids.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price`;
    
    const response = await axios.get(url, {
      params: {
        ids: idsParam,
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_last_updated_at: true
      },
      timeout: 15000 // 15 second timeout
    });

    const priceData = response.data;
    const results = [];
    
    // Convert to our format
    for (const coinId of coin_ids) {
      if (priceData[coinId] && priceData[coinId].usd) {
        results.push({
          coin_id: coinId,
          price_usd: priceData[coinId].usd,
          change_24h: priceData[coinId].usd_24h_change || null,
          last_updated: priceData[coinId].last_updated_at || Math.floor(Date.now() / 1000)
        });
      }
    }

    console.log(`[API] ✅ Successfully fetched ${results.length}/${coin_ids.length} prices`);

    res.json({
      success: true,
      count: results.length,
      data: results,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[API] ❌ Batch price fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/history/:coin', (req, res) => {
  try {
    const { coin } = req.params;
    const limit = parseInt(req.query.limit) || 2016; // Default: 7 days
    
    const history = getPriceHistory(coin, limit);
    res.json({
      success: true,
      coin,
      count: history.length,
      data: history,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/db/stats', (req, res) => {
  try {
    const stats = getDatabaseStats();
    res.json({
      success: true,
      stats,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Portfolio History endpoints
app.get('/portfolio/history', (req, res) => {
  try {
    const { start, end, hours } = req.query;
    
    let history;
    if (hours) {
      // Get recent history by hours
      history = getRecentPortfolioHistory(parseInt(hours));
    } else if (start && end) {
      // Get history by time range
      history = getPortfolioHistory(parseInt(start), parseInt(end));
    } else {
      // Default: last 24 hours
      history = getRecentPortfolioHistory(24);
    }
    
    // Get total count across all time
    const totalCount = getPortfolioHistoryCount();
    
    res.json({
      success: true,
      count: history.length,
      totalCount: totalCount,  // Total snapshots in database
      data: history,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/portfolio/history', (req, res) => {
  // This endpoint is deprecated - portfolio snapshots are now calculated by server
  res.status(410).json({
    success: false,
    error: 'Portfolio snapshots are now automatically calculated by server',
    message: 'Use POST /portfolio/snapshot/calculate to manually trigger calculation'
  });
});

// New endpoint: Manually trigger portfolio snapshot calculation
app.post('/portfolio/snapshot/calculate', async (req, res) => {
  try {
    await calculateAndSavePortfolioSnapshot();
    res.json({
      success: true,
      message: 'Portfolio snapshot calculated and saved',
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/portfolio/history/count', (req, res) => {
  try {
    const count = getPortfolioHistoryCount();
    res.json({
      success: true,
      count,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// Phase 3: Fetcher management endpoints
app.get('/coins', (req, res) => {
  try {
    const coins = getTrackedCoins();
    res.json({
      success: true,
      count: coins.length,
      coins,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/fetch/now', async (req, res) => {
  try {
    console.log('[API] Manual price fetch triggered');
    const result = await updatePrices();
    res.json({
      success: result.success,
      result,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== DATA SYNC ENDPOINTS ====================

// Get full sync state (all wallets and assets)
app.get('/api/sync', (req, res) => {
  try {
    const syncState = getFullSyncState();
    res.json({
      success: true,
      data: syncState,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[API] Sync GET error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Replace full sync state (overwrites all wallets and assets)
app.post('/api/sync', (req, res) => {
  try {
    const { wallets, assets } = req.body;
    
    if (!wallets || !assets) {
      return res.status(400).json({
        success: false,
        error: 'Missing wallets or assets in request body'
      });
    }
    
    replaceFullSyncState({ wallets, assets });
    
    res.json({
      success: true,
      message: `Synced ${wallets.length} wallets and ${assets.length} assets`,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('[API] Sync POST error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== WALLET ENDPOINTS ====================

// Get all wallets
app.get('/api/wallets', (req, res) => {
  try {
    const wallets = getAllWallets();
    res.json({
      success: true,
      count: wallets.length,
      data: wallets,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get wallet by ID
app.get('/api/wallets/:id', (req, res) => {
  try {
    const wallet = getWalletById(parseInt(req.params.id));
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }
    res.json({
      success: true,
      data: wallet,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create wallet
app.post('/api/wallets', (req, res) => {
  try {
    const { name, type, exchangeName, color } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type'
      });
    }
    
    const wallet = createWallet(name, type, exchangeName, color);
    res.status(201).json({
      success: true,
      data: wallet,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update wallet
app.put('/api/wallets/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const success = updateWallet(id, updates);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found or no changes made'
      });
    }
    
    const wallet = getWalletById(id);
    res.json({
      success: true,
      data: wallet,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete wallet
app.delete('/api/wallets/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = deleteWallet(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }
    
    res.json({
      success: true,
      message: `Wallet ${id} deleted`,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ASSET ENDPOINTS ====================

// Get all assets
app.get('/api/assets', (req, res) => {
  try {
    const walletId = req.query.walletId;
    const assets = walletId ? getAssetsByWallet(parseInt(walletId)) : getAllAssets();
    
    res.json({
      success: true,
      count: assets.length,
      data: assets,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get asset by ID
app.get('/api/assets/:id', (req, res) => {
  try {
    const asset = getAssetById(parseInt(req.params.id));
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    res.json({
      success: true,
      data: asset,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create asset
app.post('/api/assets', (req, res) => {
  try {
    const { walletId, symbol, amount, tags, notes, earnConfig } = req.body;
    
    if (!walletId || !symbol || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: walletId, symbol, amount'
      });
    }
    
    const asset = createAsset(walletId, symbol, amount, tags, notes, earnConfig);
    res.status(201).json({
      success: true,
      data: asset,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update asset
app.put('/api/assets/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const success = updateAsset(id, updates);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found or no changes made'
      });
    }
    
    const asset = getAssetById(id);
    res.json({
      success: true,
      data: asset,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete asset
app.delete('/api/assets/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = deleteAsset(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    res.json({
      success: true,
      message: `Asset ${id} deleted`,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Earn/Staking positions only (filters assets with earnConfig)
app.get('/api/assets/earn', (req, res) => {
  try {
    const allAssets = getAllAssets(); // This triggers interest calculation
    const earnAssets = allAssets.filter(asset => asset.earnConfig && asset.earnConfig.enabled);
    
    // Calculate next payout time for each position
    const earnPositions = earnAssets.map(asset => {
      const config = asset.earnConfig;
      const intervalMs = (config.payoutIntervalHours || 24) * 3600 * 1000;
      const lastPayout = config.lastPayoutAt || (asset.created_at * 1000);
      const nextPayoutAt = lastPayout + intervalMs;
      const timeUntilPayout = Math.max(0, nextPayoutAt - Date.now());
      
      return {
        ...asset,
        nextPayoutAt,
        timeUntilPayoutMs: timeUntilPayout,
        timeUntilPayoutHours: (timeUntilPayout / 3600000).toFixed(2)
      };
    });
    
    res.json({
      success: true,
      count: earnPositions.length,
      data: earnPositions,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== EXCHANGE API KEY ENDPOINTS ====================

// Save API key
app.post('/api/exchange/apikey', (req, res) => {
  try {
    const { exchange, apiKey, apiSecret, password } = req.body;
    
    if (!exchange || !apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: exchange, apiKey, apiSecret'
      });
    }
    
    // Check if API key already exists for this exchange
    const existing = getApiKeyByExchange(exchange);
    if (existing) {
      // Update existing
      updateApiKey(existing.id, { apiKey, apiSecret, password });
      console.log(`[SERVER] 🔑 Updated API key for ${exchange}`);
      return res.json({
        success: true,
        message: 'API key updated',
        exchange
      });
    } else {
      // Create new
      const record = createApiKey(exchange, apiKey, apiSecret, password);
      console.log(`[SERVER] 🔑 Saved API key for ${exchange}`);
      return res.status(201).json({
        success: true,
        message: 'API key saved',
        exchange,
        id: record.id
      });
    }
  } catch (error) {
    console.error('[SERVER] Error saving API key:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get list of exchanges with API keys (without exposing keys)
app.get('/api/exchange/list', (req, res) => {
  try {
    const keys = getAllApiKeys();
    const list = keys.map(k => ({
      id: k.id,
      exchange: k.exchange,
      createdAt: k.createdAt,
      lastUsed: k.lastUsed
    }));
    
    res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete API key
app.delete('/api/exchange/apikey/:exchange', (req, res) => {
  try {
    const { exchange } = req.params;
    const record = getApiKeyByExchange(exchange);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }
    
    deleteApiKey(record.id);
    console.log(`[SERVER] 🗑️  Deleted API key for ${exchange}`);
    
    res.json({
      success: true,
      message: 'API key deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Fetch exchange balances (OKX-specific handling)
app.get('/api/exchange/:exchange/balance', async (req, res) => {
  try {
    const { exchange: exchangeName } = req.params;
    
    console.log(`[SERVER] 📊 Fetching balance for ${exchangeName}...`);
    
    // Get API key from database
    const apiKeyRecord = getApiKeyByExchange(exchangeName);
    if (!apiKeyRecord) {
      return res.status(404).json({
        success: false,
        error: `No API key found for ${exchangeName}`
      });
    }
    
    // Initialize exchange
    const ExchangeClass = ccxt[exchangeName];
    if (!ExchangeClass) {
      return res.status(400).json({
        success: false,
        error: `Exchange ${exchangeName} not supported`
      });
    }
    
    const exchangeConfig = {
      apiKey: apiKeyRecord.apiKey,
      secret: apiKeyRecord.apiSecret,
      enableRateLimit: true
    };
    
    if (apiKeyRecord.password) {
      exchangeConfig.password = apiKeyRecord.password;
    }
    
    const exchangeInstance = new ExchangeClass(exchangeConfig);
    const balances = [];
    
    // OKX-specific: fetch from multiple account types
    if (exchangeName.toLowerCase() === 'okx') {
      console.log('[SERVER] [OKX] Fetching from trading and funding accounts...');
      
      // Trading account (default)
      try {
        console.log('[SERVER] [OKX] Fetching trading account...');
        const tradingBalance = await exchangeInstance.fetchBalance();
        console.log('[SERVER] [OKX] Trading balance:', JSON.stringify(tradingBalance.total));
        
        for (const [currency, total] of Object.entries(tradingBalance.total || {})) {
          if (total > 0) {
            balances.push({
              symbol: currency,
              free: tradingBalance.free[currency] || 0,
              used: tradingBalance.used[currency] || 0,
              total: total,
              account: 'trading'
            });
            console.log(`[SERVER] [OKX]   ✓ ${currency}: ${total} (trading)`);
          }
        }
      } catch (err) {
        console.error('[SERVER] [OKX] Trading account error:', err.message);
      }
      
      // Funding account
      try {
        console.log('[SERVER] [OKX] Fetching funding account...');
        const fundingBalance = await exchangeInstance.fetchBalance({ type: 'funding' });
        console.log('[SERVER] [OKX] Funding balance:', JSON.stringify(fundingBalance.total));
        
        for (const [currency, total] of Object.entries(fundingBalance.total || {})) {
          if (total > 0) {
            const existing = balances.find(b => b.symbol === currency);
            if (existing) {
              existing.free += fundingBalance.free[currency] || 0;
              existing.used += fundingBalance.used[currency] || 0;
              existing.total += total;
              existing.account = 'trading+funding';
              console.log(`[SERVER] [OKX]   ✓ ${currency}: ${total} (funding) - merged`);
            } else {
              balances.push({
                symbol: currency,
                free: fundingBalance.free[currency] || 0,
                used: fundingBalance.used[currency] || 0,
                total: total,
                account: 'funding'
              });
              console.log(`[SERVER] [OKX]   ✓ ${currency}: ${total} (funding)`);
            }
          }
        }
      } catch (err) {
        console.error('[SERVER] [OKX] Funding account error:', err.message);
      }
      
      console.log(`[SERVER] [OKX] Total unique assets: ${balances.length}`);
    } else {
      // Standard exchange balance fetch
      const balance = await exchangeInstance.fetchBalance();
      
      for (const [currency, total] of Object.entries(balance.total || {})) {
        if (total > 0) {
          balances.push({
            symbol: currency,
            free: balance.free[currency] || 0,
            used: balance.used[currency] || 0,
            total: total
          });
        }
      }
    }
    
    // Update last used timestamp
    updateApiKey(apiKeyRecord.id, { lastUsed: Date.now() });
    
    console.log(`[SERVER] ✅ Found ${balances.length} assets for ${exchangeName}`);
    
    res.json({
      success: true,
      exchange: exchangeName,
      count: balances.length,
      data: balances,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error(`[SERVER] Error fetching balance:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== SPA CATCH-ALL ====================
// This MUST be after all API routes but before 404 handler
// Serves index.html for any route not matched above (React Router support)
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api') && 
      !req.path.startsWith('/prices') && 
      !req.path.startsWith('/history') && 
      !req.path.startsWith('/status') && 
      !req.path.startsWith('/health') && 
      !req.path.startsWith('/coins') && 
      !req.path.startsWith('/fetch') && 
      !req.path.startsWith('/db')) {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('[SPA] Error serving index.html:', err);
        res.status(404).json({
          error: 'Frontend not deployed',
          message: 'Run build-and-deploy script first',
        });
      }
    });
  } else {
    // API routes that don't exist fall through to 404 handler
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
    });
  }
});

// 404 handler (rarely hit now due to catch-all above)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Crypto Portfolio Backend - LAN Sync Ready   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`🚀 Server running on: http://0.0.0.0:${PORT}`);
  console.log(`📱 Platform: ${process.platform} (${process.arch})`);
  console.log(`📦 Node.js: ${process.version}`);
  console.log('─────────────────────────────────────────────────────');
  console.log('🔄 DATA SYNC ENDPOINTS:');
  console.log(`   GET  /api/sync              - Get full sync state`);
  console.log(`   POST /api/sync              - Replace full sync state`);
  console.log('💼 WALLET ENDPOINTS:');
  console.log(`   GET    /api/wallets         - Get all wallets`);
  console.log(`   GET    /api/wallets/:id     - Get wallet by ID`);
  console.log(`   POST   /api/wallets         - Create wallet`);
  console.log(`   PUT    /api/wallets/:id     - Update wallet`);
  console.log(`   DELETE /api/wallets/:id     - Delete wallet`);
  console.log('💰 ASSET ENDPOINTS:');
  console.log(`   GET    /api/assets          - Get all assets`);
  console.log(`   GET    /api/assets/:id      - Get asset by ID`);
  console.log(`   POST   /api/assets          - Create asset`);
  console.log(`   PUT    /api/assets/:id      - Update asset`);
  console.log(`   DELETE /api/assets/:id      - Delete asset`);
  console.log('📊 PRICE ENDPOINTS:');
  console.log(`   GET  /prices                - Latest prices`);
  console.log(`   GET  /history/:coin         - Price history`);
  console.log(`   POST /fetch/now             - Manual fetch`);
  console.log('─────────────────────────────────────────────────────');
  console.log(`⏰ Auto-fetch: Every ${FETCH_INTERVAL} minutes`);
  console.log('Press Ctrl+C to stop');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  closeDatabase();
  process.exit(0);
});
