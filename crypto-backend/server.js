import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
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
  replaceFullSyncState
} from './db.js';
import { updatePrices, getTrackedCoins } from './fetcher.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const FETCH_INTERVAL = process.env.FETCH_INTERVAL || 5; // minutes

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
});

// Fetch prices immediately on startup
console.log('[STARTUP] 🚀 Fetching initial prices...');
updatePrices().then(result => {
  if (result.success) {
    console.log('[STARTUP] ✅ Initial price fetch complete');
  } else {
    console.log('[STARTUP] ⚠️ Initial price fetch failed, will retry at next interval');
  }
});

// Middleware
app.use(cors({ origin: '*' })); // Allow all origins for LAN access
app.use(express.json({ limit: '10mb' })); // Support large sync payloads

// Serve static files from React build (if available)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
console.log(`[STATIC] 📁 Serving frontend from: ${distPath}`);

// Request logging middleware (after static to avoid logging static files)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
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
    const { walletId, symbol, amount, tags, notes } = req.body;
    
    if (!walletId || !symbol || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: walletId, symbol, amount'
      });
    }
    
    const asset = createAsset(walletId, symbol, amount, tags, notes);
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
