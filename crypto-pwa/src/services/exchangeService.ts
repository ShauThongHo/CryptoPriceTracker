// Dynamic import of CCXT to avoid loading WebSocket modules in browser
import { dbOperations } from '../db/db';
import { encryptionService } from './encryptionService';

// Type-only import to avoid runtime loading
import type * as CCXT from 'ccxt';

// Lazy-loaded CCXT instance
let ccxtModule: typeof CCXT | null = null;

async function getCCXT(): Promise<typeof CCXT> {
  if (!ccxtModule) {
    ccxtModule = await import('ccxt');
  }
  return ccxtModule;
}

export interface ExchangeBalance {
  symbol: string;
  free: number;
  used: number;
  total: number;
}

export interface ExchangeConfig {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  password?: string; // passphrase for exchanges like OKX, KuCoin
  isEncrypted: boolean;
}

/**
 * Service for interacting with cryptocurrency exchanges via CCXT
 * Handles API key management, balance fetching, and data synchronization
 */
class ExchangeService {
  private static instance: ExchangeService;

  // Supported exchanges (browser-compatible)
  private readonly SUPPORTED_EXCHANGES = [
    'binance',
    'coinbase',
    'kraken',
    'bybit',
    'okx',
    'gateio',
    'huobi',
    'kucoin',
  ];

  private constructor() {}

  static getInstance(): ExchangeService {
    if (!ExchangeService.instance) {
      ExchangeService.instance = new ExchangeService();
    }
    return ExchangeService.instance;
  }

  /**
   * Get list of supported exchanges
   */
  getSupportedExchanges(): string[] {
    return [...this.SUPPORTED_EXCHANGES];
  }

  /**
   * Initialize an exchange connection
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async initializeExchange(config: ExchangeConfig): Promise<any> {
    const { exchange, apiKey, apiSecret, password, isEncrypted } = config;

    // Lazy load CCXT
    const ccxt = await getCCXT();

    // Decrypt keys if encrypted
    let actualApiKey = apiKey;
    let actualApiSecret = apiSecret;
    let actualPassword = password;

    if (isEncrypted) {
      if (!encryptionService.isUnlocked()) {
        throw new Error('Encryption service is locked. Please unlock first.');
      }
      actualApiKey = encryptionService.decrypt(apiKey);
      actualApiSecret = encryptionService.decrypt(apiSecret);
      if (password) {
        actualPassword = encryptionService.decrypt(password);
      }
    }

    // Create exchange instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ExchangeClass = (ccxt as any)[exchange];
    if (!ExchangeClass) {
      throw new Error(`Exchange ${exchange} not supported`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exchangeConfig: any = {
      apiKey: actualApiKey,
      secret: actualApiSecret,
      enableRateLimit: true,
    };

    // Add password for exchanges that require it
    if (actualPassword) {
      exchangeConfig.password = actualPassword;
    }

    const exchangeInstance = new ExchangeClass(exchangeConfig);

    return exchangeInstance;
  }

  /**
   * Test API key connection
   */
  async testConnection(config: ExchangeConfig): Promise<{ success: boolean; message: string }> {
    try {
      const exchange = await this.initializeExchange(config);
      await exchange.fetchBalance();
      return { success: true, message: 'Connection successful!' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Fetch balances from an exchange
   * Uses backend API if available, falls back to direct CCXT if not
   */
  async fetchBalances(exchangeName: string): Promise<ExchangeBalance[]> {
    const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

    try {
      // Try backend API first if enabled
      if (USE_BACKEND) {
        try {
          console.log(`[Exchange] Fetching ${exchangeName} balance from backend...`);
          const response = await fetch(`${API_BASE_URL}/api/exchange/${exchangeName}/balance`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
              console.log(`[Exchange] ✅ Got ${data.count} assets from backend for ${exchangeName}`);
              return data.data.map((item: any) => ({
                symbol: item.symbol,
                free: item.free || 0,
                used: item.used || 0,
                total: item.total || 0,
              }));
            }
          } else if (response.status === 404) {
            console.warn(`[Exchange] API key not found in backend for ${exchangeName}`);
          } else {
            console.warn(`[Exchange] Backend API failed: ${response.status}`);
          }
        } catch (backendError) {
          console.warn('[Exchange] Backend unavailable, falling back to direct CCXT:', backendError);
        }
      }

      // Fallback to direct CCXT call (original logic)
      console.log(`[Exchange] Using direct CCXT for ${exchangeName}...`);
      
      // Get API key from database
      const apiKeyRecord = await dbOperations.getApiKeyByExchange(exchangeName);
      if (!apiKeyRecord) {
        throw new Error(`No API key found for ${exchangeName}`);
      }

      const config: ExchangeConfig = {
        exchange: exchangeName,
        apiKey: apiKeyRecord.apiKey,
        apiSecret: apiKeyRecord.apiSecret,
        password: apiKeyRecord.password,
        isEncrypted: apiKeyRecord.isEncrypted,
      };

      const exchange = await this.initializeExchange(config);
      
      // OKX has multiple account types: trading and funding
      // We need to fetch from both account types and merge them
      const allBalances: ExchangeBalance[] = [];
      
      if (exchangeName.toLowerCase() === 'okx') {
        // OKX API endpoints:
        // - Trading account: GET /api/v5/account/balance
        // - Funding account: GET /api/v5/asset/balances
        
        // Fetch trading account balance
        try {
          console.log('[OKX] Fetching trading account balance...');
          const tradingBalance = await exchange.fetchBalance();
          console.log('[OKX] Trading balance raw response:', JSON.stringify(tradingBalance, null, 2));
          
          const currencies = Object.keys(tradingBalance.total || {});
          for (const currency of currencies) {
            const total = tradingBalance.total[currency];
            if (total && total > 0) {
              allBalances.push({
                symbol: currency,
                free: tradingBalance.free[currency] || 0,
                used: tradingBalance.used[currency] || 0,
                total: total,
              });
              console.log(`  ✓ ${currency}: ${total} (trading account)`);
            }
          }
        } catch (tradingError) {
          console.error('[OKX] Failed to fetch trading account:', tradingError);
        }
        
        // Fetch funding account balance
        try {
          console.log('[OKX] Fetching funding account balance...');
          const fundingBalance = await exchange.fetchBalance({ type: 'funding' });
          console.log('[OKX] Funding balance raw response:', JSON.stringify(fundingBalance, null, 2));
          
          const currencies = Object.keys(fundingBalance.total || {});
          for (const currency of currencies) {
            const total = fundingBalance.total[currency];
            if (total && total > 0) {
              // Check if we already have this currency from trading account
              const existingIndex = allBalances.findIndex(b => b.symbol === currency);
              if (existingIndex >= 0) {
                // Merge with existing balance
                allBalances[existingIndex].free += fundingBalance.free[currency] || 0;
                allBalances[existingIndex].used += fundingBalance.used[currency] || 0;
                allBalances[existingIndex].total += total;
                console.log(`  ✓ ${currency}: ${total} (funding account) - merged with existing`);
              } else {
                // Add new balance entry
                allBalances.push({
                  symbol: currency,
                  free: fundingBalance.free[currency] || 0,
                  used: fundingBalance.used[currency] || 0,
                  total: total,
                });
                console.log(`  ✓ ${currency}: ${total} (funding account)`);
              }
            }
          }
        } catch (fundingError) {
          console.error('[OKX] Failed to fetch funding account:', fundingError);
        }
        
        console.log(`[OKX] Total unique assets found: ${allBalances.length}`);
      } else {
        // For other exchanges, use standard fetchBalance
        const balance = await exchange.fetchBalance();
        
        const currencies = Object.keys(balance.total);
        for (const currency of currencies) {
          const total = balance.total[currency];
          if (total && total > 0) {
            allBalances.push({
              symbol: currency,
              free: balance.free[currency] || 0,
              used: balance.used[currency] || 0,
              total: total,
            });
          }
        }
      }

      // Update last used timestamp
      await dbOperations.updateApiKey(apiKeyRecord.id!, {});

      return allBalances;
    } catch (error) {
      console.error(`Error fetching balances from ${exchangeName}:`, error);
      throw error;
    }
  }

  /**
   * Sync exchange balances to wallet assets
   */
  async syncExchangeToWallet(walletId: number, exchangeName: string): Promise<number> {
    try {
      const balances = await this.fetchBalances(exchangeName);
      let synced = 0;

      for (const balance of balances) {
        // Check if asset already exists
        const existingAssets = await dbOperations.getAssetsByWallet(walletId);
        const existingAsset = existingAssets.find(
          (a) => a.symbol.toUpperCase() === balance.symbol.toUpperCase()
        );

        if (existingAsset) {
          // Update existing asset
          await dbOperations.updateAsset(existingAsset.id!, {
            amount: balance.total,
          });
        } else {
          // Add new asset
          await dbOperations.addAsset({
            walletId,
            symbol: balance.symbol.toUpperCase(),
            amount: balance.total,
          });
        }
        synced++;
      }

      return synced;
    } catch (error) {
      console.error(`Error syncing ${exchangeName} to wallet ${walletId}:`, error);
      throw error;
    }
  }

  /**
   * Save API key (encrypted or plain)
   */
  async saveApiKey(
    exchange: string,
    apiKey: string,
    apiSecret: string,
    shouldEncrypt: boolean,
    password?: string
  ): Promise<void> {
    const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
    
    let finalApiKey = apiKey;
    let finalApiSecret = apiSecret;
    let finalPassword = password;

    if (shouldEncrypt) {
      if (!encryptionService.isUnlocked()) {
        throw new Error('Please set a master password before encrypting API keys');
      }
      finalApiKey = encryptionService.encrypt(apiKey);
      finalApiSecret = encryptionService.encrypt(apiSecret);
      if (password) {
        finalPassword = encryptionService.encrypt(password);
      }
    }

    // 1️⃣ First: Save to backend server (server-first strategy)
    if (USE_BACKEND) {
      try {
        console.log(`[Exchange] 🔑 Saving API key for ${exchange} to backend...`);
        const response = await fetch(`${API_BASE_URL}/api/exchange/apikey`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exchange,
            apiKey,  // Save plain text to backend (backend doesn't need encryption)
            apiSecret,
            password: password || null,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Backend save failed: ${error.error}`);
        }

        const result = await response.json();
        console.log(`[Exchange] ✅ Backend saved API key for ${exchange}:`, result);
      } catch (backendError) {
        console.error('[Exchange] ❌ Failed to save API key to backend:', backendError);
        // Don't throw - continue to save locally even if backend fails
      }
    }

    // 2️⃣ Second: Save to local IndexedDB
    const existing = await dbOperations.getApiKeyByExchange(exchange);
    
    if (existing) {
      await dbOperations.updateApiKey(existing.id!, {
        apiKey: finalApiKey,
        apiSecret: finalApiSecret,
        password: finalPassword,
        isEncrypted: shouldEncrypt,
      });
      console.log(`[Exchange] 💾 Updated API key in local IndexedDB for ${exchange}`);
    } else {
      await dbOperations.addApiKey({
        exchange,
        apiKey: finalApiKey,
        apiSecret: finalApiSecret,
        password: finalPassword,
        isEncrypted: shouldEncrypt,
      });
      console.log(`[Exchange] 💾 Added API key to local IndexedDB for ${exchange}`);
    }
  }
}

export const exchangeService = ExchangeService.getInstance();
