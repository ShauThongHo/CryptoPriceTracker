import Dexie, { type EntityTable } from 'dexie';

// Define TypeScript interfaces for our data models
export interface Wallet {
  id?: number;
  name: string;
  type: 'hot' | 'cold' | 'exchange';
  exchangeName?: string; // For exchange wallets, store the exchange name
  createdAt: Date;
}

export interface Asset {
  id?: number;
  walletId: number;
  symbol: string;
  amount: number;
  tags?: string; // e.g., 'Staked', 'Liquid', 'DeFi', 'Trading', 'HODL'
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Price {
  id?: string; // symbol as id (e.g., 'bitcoin')
  symbol: string;
  priceUsd: number;
  lastUpdated: Date;
}

export interface CustomCoin {
  id?: number;
  symbol: string; // e.g., 'BTC'
  name: string; // e.g., 'Bitcoin'
  coinGeckoId: string; // e.g., 'bitcoin'
  isCustom: boolean; // true if user-added, false if predefined
  createdAt: Date;
}

export interface ApiKey {
  id?: number;
  exchange: string; // e.g., 'binance', 'coinbase'
  apiKey: string; // encrypted or plain
  apiSecret: string; // encrypted or plain
  password?: string; // passphrase for exchanges like OKX, KuCoin (encrypted or plain)
  isEncrypted: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface PortfolioHistory {
  id?: number;
  timestamp: Date;
  totalValue: number; // Total portfolio value in USD
  snapshotData: string; // JSON stringified: { wallets: { [walletId]: value }, coins: { [symbol]: { amount, value } } }
}

// Define the database class
class CryptoPortfolioDB extends Dexie {
  wallets!: EntityTable<Wallet, 'id'>;
  assets!: EntityTable<Asset, 'id'>;
  prices!: EntityTable<Price, 'id'>;
  customCoins!: EntityTable<CustomCoin, 'id'>;
  apiKeys!: EntityTable<ApiKey, 'id'>;
  portfolioHistory!: EntityTable<PortfolioHistory, 'id'>;

  constructor() {
    super('CryptoPortfolioDB');

    // Define database schema (version 2 adds customCoins and apiKeys)
    this.version(1).stores({
      wallets: '++id, name, type, createdAt',
      assets: '++id, walletId, symbol, amount, createdAt, updatedAt',
      prices: 'id, symbol, priceUsd, lastUpdated',
    });

    this.version(2).stores({
      wallets: '++id, name, type, createdAt',
      assets: '++id, walletId, symbol, amount, createdAt, updatedAt',
      prices: 'id, symbol, priceUsd, lastUpdated',
      customCoins: '++id, symbol, name, coinGeckoId, isCustom, createdAt',
      apiKeys: '++id, exchange, createdAt',
    });

    this.version(3).stores({
      wallets: '++id, name, type, createdAt',
      assets: '++id, walletId, symbol, amount, tags, createdAt, updatedAt',
      prices: 'id, symbol, priceUsd, lastUpdated',
      customCoins: '++id, symbol, name, coinGeckoId, isCustom, createdAt',
      apiKeys: '++id, exchange, createdAt',
      portfolioHistory: '++id, timestamp, totalValue',
    });
  }
}

// Export a singleton instance
export const db = new CryptoPortfolioDB();

// Export database operations
export const dbOperations = {
  // Wallet operations
  async addWallet(wallet: Omit<Wallet, 'id' | 'createdAt'>) {
    return await db.wallets.add({
      ...wallet,
      createdAt: new Date(),
    });
  },

  async getWallets() {
    return await db.wallets.toArray();
  },

  async deleteWallet(id: number) {
    // Delete wallet and all associated assets
    await db.assets.where('walletId').equals(id).delete();
    await db.wallets.delete(id);
  },

  // Asset operations
  async addAsset(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date();
    return await db.assets.add({
      ...asset,
      createdAt: now,
      updatedAt: now,
    });
  },

  async updateAsset(id: number, updates: Partial<Omit<Asset, 'id'>>) {
    return await db.assets.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async getAssetsByWallet(walletId: number) {
    return await db.assets.where('walletId').equals(walletId).toArray();
  },

  async getAllAssets() {
    return await db.assets.toArray();
  },

  async deleteAsset(id: number) {
    return await db.assets.delete(id);
  },

  // Price operations
  async upsertPrice(price: Omit<Price, 'lastUpdated'>) {
    return await db.prices.put({
      ...price,
      id: price.symbol,
      lastUpdated: new Date(),
    });
  },

  async getPrice(symbol: string) {
    return await db.prices.get(symbol);
  },

  async getAllPrices() {
    return await db.prices.toArray();
  },

  // Utility: Check if price cache is stale (older than 5 minutes)
  isPriceStale(price: Price): boolean {
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - price.lastUpdated.getTime() > fiveMinutes;
  },

  // CustomCoin operations
  async addCustomCoin(coin: Omit<CustomCoin, 'id' | 'createdAt'>) {
    return await db.customCoins.add({
      ...coin,
      createdAt: new Date(),
    });
  },

  async getCustomCoins() {
    return await db.customCoins.toArray();
  },

  async getCoinBySymbol(symbol: string) {
    return await db.customCoins.where('symbol').equalsIgnoreCase(symbol).first();
  },

  async updateCustomCoin(id: number, updates: Partial<Omit<CustomCoin, 'id' | 'createdAt'>>) {
    return await db.customCoins.update(id, updates);
  },

  async deleteCustomCoin(id: number) {
    return await db.customCoins.delete(id);
  },

  // ApiKey operations
  async addApiKey(apiKey: Omit<ApiKey, 'id' | 'createdAt'>) {
    return await db.apiKeys.add({
      ...apiKey,
      createdAt: new Date(),
    });
  },

  async getApiKeys() {
    return await db.apiKeys.toArray();
  },

  async getApiKeyByExchange(exchange: string) {
    return await db.apiKeys.where('exchange').equals(exchange).first();
  },

  async updateApiKey(id: number, updates: Partial<Omit<ApiKey, 'id' | 'createdAt'>>) {
    return await db.apiKeys.update(id, {
      ...updates,
      lastUsed: new Date(),
    });
  },

  async deleteApiKey(id: number) {
    return await db.apiKeys.delete(id);
  },

  // Portfolio History operations
  async savePortfolioSnapshot(totalValue: number, snapshotData: { wallets: Record<number, number>; coins: Record<string, { amount: number; value: number }> }) {
    // Auto-prune: Keep only last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    await db.portfolioHistory.where('timestamp').below(ninetyDaysAgo).delete();

    // Save new snapshot
    return await db.portfolioHistory.add({
      timestamp: new Date(),
      totalValue,
      snapshotData: JSON.stringify(snapshotData),
    });
  },

  async getHistoryRange(startDate: Date, endDate: Date) {
    return await db.portfolioHistory
      .where('timestamp')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  async getRecentHistory(hours: number) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);
    return await db.portfolioHistory
      .where('timestamp')
      .above(startDate)
      .toArray();
  },

  async getHistoryCount() {
    return await db.portfolioHistory.count();
  },
};
