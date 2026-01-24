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
   * For OKX: fetches from all account types (funding, trading, financial)
   */
  async fetchBalances(exchangeName: string): Promise<ExchangeBalance[]> {
    try {
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
      
      // OKX has multiple account types: funding, trading, financial (earn)
      // We need to fetch from all account types and merge them
      const allBalances: ExchangeBalance[] = [];
      
      if (exchangeName.toLowerCase() === 'okx') {
        // Fetch from all OKX account types
        const accountTypes = ['funding', 'trading', 'financial']; // financial = earn
        
        for (const accountType of accountTypes) {
          try {
            console.log(`[OKX] Fetching balance from ${accountType} account...`);
            const balance = await exchange.fetchBalance({ type: accountType });
            
            // Convert to our format and add account type info
            const currencies = Object.keys(balance.total);
            for (const currency of currencies) {
              const total = balance.total[currency];
              if (total && total > 0) {
                // Check if we already have this currency from another account type
                const existingIndex = allBalances.findIndex(b => b.symbol === currency);
                if (existingIndex >= 0) {
                  // Merge with existing balance
                  allBalances[existingIndex].free += balance.free[currency] || 0;
                  allBalances[existingIndex].used += balance.used[currency] || 0;
                  allBalances[existingIndex].total += total;
                } else {
                  // Add new balance entry
                  allBalances.push({
                    symbol: currency,
                    free: balance.free[currency] || 0,
                    used: balance.used[currency] || 0,
                    total: total,
                  });
                }
                console.log(`  ✓ ${currency}: ${total} (in ${accountType})`);
              }
            }
          } catch (accountError) {
            console.warn(`[OKX] Failed to fetch ${accountType} balance:`, accountError);
            // Continue with other account types even if one fails
          }
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

    // Check if API key already exists
    const existing = await dbOperations.getApiKeyByExchange(exchange);
    
    if (existing) {
      await dbOperations.updateApiKey(existing.id!, {
        apiKey: finalApiKey,
        apiSecret: finalApiSecret,
        password: finalPassword,
        isEncrypted: shouldEncrypt,
      });
    } else {
      await dbOperations.addApiKey({
        exchange,
        apiKey: finalApiKey,
        apiSecret: finalApiSecret,
        password: finalPassword,
        isEncrypted: shouldEncrypt,
      });
    }
  }
}

export const exchangeService = ExchangeService.getInstance();
