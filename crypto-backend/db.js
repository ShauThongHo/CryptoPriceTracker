import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, 'crypto.db');

let db = null;

/**
 * Initialize SQLite database and create tables if they don't exist
 */
export function initDatabase() {
  try {
    console.log(`[DB] Initializing database at: ${DB_PATH}`);
    
    // Open database connection
    db = new Database(DB_PATH, { verbose: console.log });
    
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    
    // Create price_history table
    db.exec(`
      CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        coin_id TEXT NOT NULL,
        price_usd REAL NOT NULL,
        data_json TEXT,
        UNIQUE(timestamp, coin_id)
      )
    `);
    
    // Create index for faster queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_price_history_coin_timestamp 
      ON price_history(coin_id, timestamp DESC)
    `);
    
    // Create latest_prices table (key-value store for instant access)
    db.exec(`
      CREATE TABLE IF NOT EXISTS latest_prices (
        coin_id TEXT PRIMARY KEY,
        price_usd REAL NOT NULL,
        last_updated INTEGER NOT NULL
      )
    `);
    
    // Create wallets table (for data sync)
    db.exec(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('hot', 'cold', 'exchange')),
        exchange_name TEXT,
        color TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    
    // Create assets table (for data sync)
    db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        amount REAL NOT NULL,
        tags TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes for assets
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_assets_wallet_id 
      ON assets(wallet_id)
    `);
    
    console.log('[DB] ✅ Database initialized successfully');
    console.log('[DB] Tables: price_history, latest_prices, wallets, assets');
    
    return db;
  } catch (error) {
    console.error('[DB] ❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Insert price data into price_history table
 */
export function insertPriceHistory(coinId, priceUsd, dataJson = null) {
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  
  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO price_history (timestamp, coin_id, price_usd, data_json)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(timestamp, coinId, priceUsd, dataJson);
    return result.changes > 0;
  } catch (error) {
    console.error(`[DB] Error inserting price history for ${coinId}:`, error);
    return false;
  }
}

/**
 * Update or insert latest price
 */
export function upsertLatestPrice(coinId, priceUsd) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  try {
    const stmt = db.prepare(`
      INSERT INTO latest_prices (coin_id, price_usd, last_updated)
      VALUES (?, ?, ?)
      ON CONFLICT(coin_id) DO UPDATE SET
        price_usd = excluded.price_usd,
        last_updated = excluded.last_updated
    `);
    
    stmt.run(coinId, priceUsd, timestamp);
    return true;
  } catch (error) {
    console.error(`[DB] Error upserting latest price for ${coinId}:`, error);
    return false;
  }
}

/**
 * Get all latest prices
 */
export function getLatestPrices() {
  try {
    const stmt = db.prepare('SELECT * FROM latest_prices');
    return stmt.all();
  } catch (error) {
    console.error('[DB] Error fetching latest prices:', error);
    return [];
  }
}

/**
 * Get price history for a specific coin
 * @param {string} coinId - Coin identifier
 * @param {number} limit - Number of records to return (default: 7 days * 288 records/day = 2016)
 */
export function getPriceHistory(coinId, limit = 2016) {
  try {
    const stmt = db.prepare(`
      SELECT timestamp, price_usd, data_json
      FROM price_history
      WHERE coin_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    return stmt.all(coinId, limit);
  } catch (error) {
    console.error(`[DB] Error fetching price history for ${coinId}:`, error);
    return [];
  }
}

/**
 * Get price history for a specific coin within a time range
 * @param {string} coinId - Coin identifier
 * @param {number} startTime - Start timestamp (Unix seconds)
 * @param {number} endTime - End timestamp (Unix seconds)
 */
export function getPriceHistoryRange(coinId, startTime, endTime) {
  try {
    const stmt = db.prepare(`
      SELECT timestamp, price_usd, data_json
      FROM price_history
      WHERE coin_id = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `);
    
    return stmt.all(coinId, startTime, endTime);
  } catch (error) {
    console.error(`[DB] Error fetching price history range for ${coinId}:`, error);
    return [];
  }
}

/**
 * Clean up old price history data (keep last N days)
 * @param {number} daysToKeep - Number of days to retain (default: 30)
 */
export function cleanupOldHistory(daysToKeep = 30) {
  const cutoffTimestamp = Math.floor(Date.now() / 1000) - (daysToKeep * 24 * 60 * 60);
  
  try {
    const stmt = db.prepare('DELETE FROM price_history WHERE timestamp < ?');
    const result = stmt.run(cutoffTimestamp);
    
    console.log(`[DB] Cleaned up ${result.changes} old price history records`);
    return result.changes;
  } catch (error) {
    console.error('[DB] Error cleaning up old history:', error);
    return 0;
  }
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  try {
    const historyCount = db.prepare('SELECT COUNT(*) as count FROM price_history').get();
    const latestCount = db.prepare('SELECT COUNT(*) as count FROM latest_prices').get();
    const oldestRecord = db.prepare('SELECT MIN(timestamp) as oldest FROM price_history').get();
    const newestRecord = db.prepare('SELECT MAX(timestamp) as newest FROM price_history').get();
    
    return {
      historyRecords: historyCount.count,
      latestPricesCount: latestCount.count,
      oldestTimestamp: oldestRecord.oldest,
      newestTimestamp: newestRecord.newest
    };
  } catch (error) {
    console.error('[DB] Error fetching database stats:', error);
    return null;
  }
}

// ==================== WALLET OPERATIONS ====================

/**
 * Create a new wallet
 */
export function createWallet(name, type, exchangeName = null, color = null) {
  const createdAt = Math.floor(Date.now() / 1000);
  
  try {
    const stmt = db.prepare(`
      INSERT INTO wallets (name, type, exchange_name, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(name, type, exchangeName, color, createdAt);
    return { id: result.lastInsertRowid, name, type, exchangeName, color, createdAt };
  } catch (error) {
    console.error('[DB] Error creating wallet:', error);
    throw error;
  }
}

/**
 * Get all wallets
 */
export function getAllWallets() {
  try {
    const stmt = db.prepare('SELECT * FROM wallets ORDER BY created_at DESC');
    return stmt.all();
  } catch (error) {
    console.error('[DB] Error fetching wallets:', error);
    return [];
  }
}

/**
 * Get wallet by ID
 */
export function getWalletById(id) {
  try {
    const stmt = db.prepare('SELECT * FROM wallets WHERE id = ?');
    return stmt.get(id);
  } catch (error) {
    console.error(`[DB] Error fetching wallet ${id}:`, error);
    return null;
  }
}

/**
 * Update wallet
 */
export function updateWallet(id, updates) {
  try {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.exchangeName !== undefined) {
      fields.push('exchange_name = ?');
      values.push(updates.exchangeName);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    
    if (fields.length === 0) return false;
    
    values.push(id);
    const stmt = db.prepare(`UPDATE wallets SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    
    return result.changes > 0;
  } catch (error) {
    console.error(`[DB] Error updating wallet ${id}:`, error);
    throw error;
  }
}

/**
 * Delete wallet (cascades to assets)
 */
export function deleteWallet(id) {
  try {
    // Delete associated assets first
    const deleteAssets = db.prepare('DELETE FROM assets WHERE wallet_id = ?');
    deleteAssets.run(id);
    
    // Delete wallet
    const stmt = db.prepare('DELETE FROM wallets WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  } catch (error) {
    console.error(`[DB] Error deleting wallet ${id}:`, error);
    throw error;
  }
}

// ==================== ASSET OPERATIONS ====================

/**
 * Create a new asset
 */
export function createAsset(walletId, symbol, amount, tags = null, notes = null) {
  const now = Math.floor(Date.now() / 1000);
  
  try {
    const stmt = db.prepare(`
      INSERT INTO assets (wallet_id, symbol, amount, tags, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(walletId, symbol, amount, tags, notes, now, now);
    return { id: result.lastInsertRowid, walletId, symbol, amount, tags, notes, createdAt: now, updatedAt: now };
  } catch (error) {
    console.error('[DB] Error creating asset:', error);
    throw error;
  }
}

/**
 * Get all assets
 */
export function getAllAssets() {
  try {
    const stmt = db.prepare('SELECT * FROM assets ORDER BY created_at DESC');
    return stmt.all();
  } catch (error) {
    console.error('[DB] Error fetching assets:', error);
    return [];
  }
}

/**
 * Get assets by wallet ID
 */
export function getAssetsByWallet(walletId) {
  try {
    const stmt = db.prepare('SELECT * FROM assets WHERE wallet_id = ? ORDER BY created_at DESC');
    return stmt.all(walletId);
  } catch (error) {
    console.error(`[DB] Error fetching assets for wallet ${walletId}:`, error);
    return [];
  }
}

/**
 * Get asset by ID
 */
export function getAssetById(id) {
  try {
    const stmt = db.prepare('SELECT * FROM assets WHERE id = ?');
    return stmt.get(id);
  } catch (error) {
    console.error(`[DB] Error fetching asset ${id}:`, error);
    return null;
  }
}

/**
 * Update asset
 */
export function updateAsset(id, updates) {
  const updatedAt = Math.floor(Date.now() / 1000);
  
  try {
    const fields = [];
    const values = [];
    
    if (updates.symbol !== undefined) {
      fields.push('symbol = ?');
      values.push(updates.symbol);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(updates.tags);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = ?');
    values.push(updatedAt);
    values.push(id);
    
    const stmt = db.prepare(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    
    return result.changes > 0;
  } catch (error) {
    console.error(`[DB] Error updating asset ${id}:`, error);
    throw error;
  }
}

/**
 * Delete asset
 */
export function deleteAsset(id) {
  try {
    const stmt = db.prepare('DELETE FROM assets WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  } catch (error) {
    console.error(`[DB] Error deleting asset ${id}:`, error);
    throw error;
  }
}

// ==================== SYNC OPERATIONS ====================

/**
 * Get full sync state (all wallets and assets)
 */
export function getFullSyncState() {
  try {
    const wallets = getAllWallets();
    const assets = getAllAssets();
    
    return {
      wallets,
      assets,
      timestamp: Math.floor(Date.now() / 1000)
    };
  } catch (error) {
    console.error('[DB] Error getting full sync state:', error);
    throw error;
  }
}

/**
 * Replace full sync state (overwrites all wallets and assets)
 */
export function replaceFullSyncState(data) {
  try {
    // Use a transaction for atomic operation
    const transaction = db.transaction(() => {
      // Clear existing data
      db.prepare('DELETE FROM assets').run();
      db.prepare('DELETE FROM wallets').run();
      
      // Insert wallets
      const insertWallet = db.prepare(`
        INSERT INTO wallets (id, name, type, exchange_name, color, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const wallet of data.wallets || []) {
        insertWallet.run(
          wallet.id,
          wallet.name,
          wallet.type,
          wallet.exchange_name || wallet.exchangeName || null,
          wallet.color || null,
          wallet.created_at || wallet.createdAt || Math.floor(Date.now() / 1000)
        );
      }
      
      // Insert assets
      const insertAsset = db.prepare(`
        INSERT INTO assets (id, wallet_id, symbol, amount, tags, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const asset of data.assets || []) {
        insertAsset.run(
          asset.id,
          asset.wallet_id || asset.walletId,
          asset.symbol,
          asset.amount,
          asset.tags || null,
          asset.notes || null,
          asset.created_at || asset.createdAt || Math.floor(Date.now() / 1000),
          asset.updated_at || asset.updatedAt || Math.floor(Date.now() / 1000)
        );
      }
    });
    
    transaction();
    console.log(`[DB] Sync complete: ${data.wallets?.length || 0} wallets, ${data.assets?.length || 0} assets`);
    return true;
  } catch (error) {
    console.error('[DB] Error replacing sync state:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    console.log('[DB] Closing database connection...');
    db.close();
    db = null;
  }
}
