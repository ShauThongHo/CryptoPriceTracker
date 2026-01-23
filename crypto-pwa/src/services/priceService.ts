import { dbOperations } from '../db/db';

// Backend API Configuration
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';
const BACKEND_API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const FALLBACK_TO_COINGECKO = import.meta.env.VITE_FALLBACK_TO_COINGECKO === 'true';

// CoinGecko API endpoints (free tier)
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Common crypto symbol to CoinGecko ID mapping
const SYMBOL_TO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  WETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  SOL: 'solana',
  USDC: 'usd-coin',
  COMP: 'compound-governance-token',
  CRO: 'crypto-com-chain',
  POL: 'polygon-ecosystem-token',
  XPIN: 'xpin-network',
  XAUT: 'tether-gold',
  USD1: 'usd1-wlfi',
  XDAI: 'xdai',
  // Add common wrapped/derivative tokens
  OPETH: 'ethereum', // OP ETH likely refers to Optimism ETH, map to ETH
  STETH: 'staked-ether',
  WBTC: 'wrapped-bitcoin',
  MATIC: 'matic-network',
};

// Reverse mapping: CoinGecko ID to Symbol (for backend responses)
// Note: Currently unused as we now use /prices/batch with direct symbol mapping
// Kept for backward compatibility
/*
const ID_TO_SYMBOL_MAP: Record<string, string> = {
  'bitcoin': 'BTC',
  'ethereum': 'ETH',
  'tether': 'USDT',
  'binancecoin': 'BNB',
  'solana': 'SOL',
  'usd-coin': 'USDC',
  'compound-governance-token': 'COMP',
  'crypto-com-chain': 'CRO',
  'polygon-ecosystem-token': 'POL',
  'xpin-network': 'XPIN',
  'tether-gold': 'XAUT',
  'usd1-wlfi': 'USD1',
  'xdai': 'XDAI',
  'staked-ether': 'STETH',
  'wrapped-bitcoin': 'WBTC',
  'matic-network': 'MATIC',
};
*/

interface CoinGeckoPriceResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

interface BackendPriceResponse {
  success: boolean;
  data: Array<{
    coin_id: string;
    price_usd: number;
    last_updated: number;
  }>;
}

export class PriceService {
  private static instance: PriceService;
  // private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  // private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  // private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes interval
  // private lastFetchTime: Record<string, number> = {};
  private lastRefreshSlot: number = 0; // Last 5-minute time slot that was refreshed

  private constructor() {}

  static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  /**
   * Get the next 5-minute time slot (e.g., 1:05, 1:10, 1:15, 1:20)
   * Returns timestamp of next slot in milliseconds
   */
  private getNextRefreshSlot(now: number = Date.now()): number {
    const date = new Date(now);
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();
    
    // Calculate minutes until next 5-minute mark
    const minutesUntilNext = 5 - (minutes % 5);
    
    // If we're exactly at a 5-minute mark (0 seconds, 0 ms), next slot is now
    if (minutes % 5 === 0 && seconds === 0 && milliseconds === 0) {
      return now;
    }
    
    // Calculate next slot timestamp
    const nextSlot = new Date(date);
    nextSlot.setMinutes(minutes + minutesUntilNext, 0, 0);
    return nextSlot.getTime();
  }

  /**
   * Get current 5-minute time slot
   */
  private getCurrentRefreshSlot(now: number = Date.now()): number {
    const date = new Date(now);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    const slotTime = new Date(date);
    slotTime.setMinutes(roundedMinutes, 0, 0);
    return slotTime.getTime();
  }

  /**
   * Check if we're in a new 5-minute time slot and can refresh
   */
  canRefresh(): boolean {
    // First load: always allow
    if (this.lastRefreshSlot === 0) {
      return true;
    }
    const currentSlot = this.getCurrentRefreshSlot();
    return currentSlot > this.lastRefreshSlot;
  }

  /**
   * Get remaining time in milliseconds until next refresh slot
   */
  getRemainingCooldown(): number {
    const now = Date.now();
    const nextSlot = this.getNextRefreshSlot(now);
    return Math.max(0, nextSlot - now);
  }

  /**
   * Convert crypto symbol to CoinGecko ID
   * Checks custom coins in database first, then falls back to hardcoded map
   */
  private async symbolToId(symbol: string): Promise<string> {
    const upperSymbol = symbol.toUpperCase();
    
    // Check custom coins in database first
    const customCoin = await dbOperations.getCoinBySymbol(upperSymbol);
    if (customCoin) {
      console.log(`[priceService] symbolToId: ${symbol} -> ${customCoin.coinGeckoId} (from DB)`);
      return customCoin.coinGeckoId;
    }
    
    // Fall back to hardcoded map
    const coinId = SYMBOL_TO_ID_MAP[upperSymbol] || symbol.toLowerCase();
    console.log(`[priceService] symbolToId: ${symbol} -> ${coinId} (${SYMBOL_TO_ID_MAP[upperSymbol] ? 'mapped' : 'fallback'})`);
    return coinId;
  }

  /**
   * Check if cached price is still valid
   */
  // private async isCacheValid(symbol: string): Promise<boolean> {
  //   const cachedPrice = await dbOperations.getPrice(symbol);
  //   if (!cachedPrice) return false;
  //   
  //   return !dbOperations.isPriceStale(cachedPrice);
  // }

  /**
   * Fetch prices from backend server
   */
  private async fetchPricesFromBackend(symbols: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    
    if (symbols.length === 0) return priceMap;
    
    try {
      // Convert symbols to CoinGecko IDs
      const coinIds: string[] = [];
      const symbolToCoinId = new Map<string, string>();
      
      for (const symbol of symbols) {
        const coinId = await this.symbolToId(symbol);
        symbolToCoinId.set(symbol, coinId);
        if (!coinIds.includes(coinId)) {
          coinIds.push(coinId);
        }
      }
      
      const url = `${BACKEND_API_BASE}/prices/batch`;
      console.log(`[priceService] Fetching ${symbols.length} coins from backend:`, url);
      console.log(`[priceService] Symbols:`, symbols);
      console.log(`[priceService] CoinGecko IDs:`, coinIds);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coin_ids: coinIds })
      });
      
      if (!response.ok) {
        throw new Error(`Backend error! status: ${response.status}`);
      }
      
      const result: BackendPriceResponse = await response.json();
      console.log(`[priceService] Backend response:`, result);
      
      if (!result.success || !result.data) {
        throw new Error('Invalid backend response format');
      }
      
      // Map prices back to symbols
      for (const item of result.data) {
        // Find all symbols that map to this coin_id
        for (const [symbol, coinId] of symbolToCoinId.entries()) {
          if (coinId === item.coin_id) {
            priceMap.set(symbol, item.price_usd);
            
            // Cache the price
            await dbOperations.upsertPrice({
              id: symbol,
              symbol: symbol,
              priceUsd: item.price_usd,
            });
          }
        }
      }
      
      console.log(`[priceService] Mapped ${priceMap.size}/${symbols.length} prices from backend`);
      return priceMap;
    } catch (error) {
      console.error(`[priceService] Backend fetch error:`, error);
      return priceMap;
    }
  }

  /**
   * Batch fetch prices for multiple symbols from CoinGecko API
   * This is much more efficient - 1 request for all coins instead of N requests
   */
  private async fetchBatchPricesFromCoinGecko(symbols: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    
    if (symbols.length === 0) return priceMap;
    
    try {
      // Convert all symbols to CoinGecko IDs
      const coinIdMap = new Map<string, string>(); // symbol -> coinGeckoId
      const coinIds: string[] = [];
      
      for (const symbol of symbols) {
        const coinId = await this.symbolToId(symbol);
        coinIdMap.set(symbol, coinId);
        if (!coinIds.includes(coinId)) {
          coinIds.push(coinId);
        }
      }
      
      // Build batch request URL
      const idsParam = coinIds.join(',');
      const url = `${COINGECKO_API_BASE}/simple/price?ids=${idsParam}&vs_currencies=usd`;
      
      console.log(`[priceService] Batch fetching ${symbols.length} symbols (${coinIds.length} unique IDs)`);
      console.log(`[priceService] URL:`, url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CoinGeckoPriceResponse = await response.json();
      console.log(`[priceService] Batch response:`, data);
      
      // Map results back to symbols
      for (const symbol of symbols) {
        const coinId = coinIdMap.get(symbol);
        if (coinId && data[coinId] && data[coinId].usd) {
          const price = data[coinId].usd;
          priceMap.set(symbol, price);
          
          // Cache the price
          await dbOperations.upsertPrice({
            id: symbol,
            symbol: symbol,
            priceUsd: price,
          });
        }
      }
      
      // Update refresh slot after successful batch fetch
      if (priceMap.size > 0) {
        this.lastRefreshSlot = this.getCurrentRefreshSlot();
        
        // Trigger portfolio snapshot save (async, don't await)
        this.savePortfolioSnapshot().catch(err => 
          console.error('Failed to save portfolio snapshot:', err)
        );
      }
      
      return priceMap;
    } catch (error) {
      console.error(`Error batch fetching prices from CoinGecko:`, error);
      return priceMap;
    }
  }

  /**
   * Main batch fetch method with smart backend/CoinGecko fallback
   */
  private async fetchBatchPricesFromAPI(symbols: string[]): Promise<Map<string, number>> {
    let priceMap = new Map<string, number>();
    
    if (symbols.length === 0) return priceMap;
    
    // Strategy 1: Try backend first if enabled
    if (USE_BACKEND) {
      console.log(`[priceService] Using backend for ${symbols.length} symbols`);
      priceMap = await this.fetchPricesFromBackend(symbols);
      
      if (priceMap.size > 0) {
        console.log(`[priceService] Backend returned ${priceMap.size} prices`);
        
        // Update refresh slot after successful fetch
        this.lastRefreshSlot = this.getCurrentRefreshSlot();
        
        // Trigger portfolio snapshot save
        this.savePortfolioSnapshot().catch(err => 
          console.error('Failed to save portfolio snapshot:', err)
        );
        
        return priceMap;
      }
      
      // Backend failed, try fallback if enabled
      if (FALLBACK_TO_COINGECKO) {
        console.warn(`[priceService] Backend failed, falling back to CoinGecko`);
      } else {
        console.warn(`[priceService] Backend failed, no fallback enabled`);
        return priceMap;
      }
    }
    
    // Strategy 2: Use CoinGecko directly or as fallback
    if (!USE_BACKEND || FALLBACK_TO_COINGECKO) {
      console.log(`[priceService] Using CoinGecko for ${symbols.length} symbols`);
      priceMap = await this.fetchBatchPricesFromCoinGecko(symbols);
      
      if (priceMap.size > 0) {
        console.log(`[priceService] CoinGecko returned ${priceMap.size} prices`);
        
        // Update refresh slot after successful fetch
        this.lastRefreshSlot = this.getCurrentRefreshSlot();
        
        // Trigger portfolio snapshot save
        this.savePortfolioSnapshot().catch(err => 
          console.error('Failed to save portfolio snapshot:', err)
        );
      }
    }
    
    return priceMap;
  }

  /**
   * Fetch price from CoinGecko API (single coin - use for fallback only)
   */
  // private async fetchPriceFromAPI(symbol: string): Promise<{ price: number; isFallback: boolean } | null> {
  //   try {
  //     const coinId = await this.symbolToId(symbol);
  //     const url = `${COINGECKO_API_BASE}/simple/price?ids=${coinId}&vs_currencies=usd`;
  //     
  //     const response = await fetch(url);
  //     if (!response.ok) {
  //       // On error, return cached price as fallback
  //       const cachedPrice = await dbOperations.getPrice(symbol);
  //       if (cachedPrice) {
  //         return { price: cachedPrice.priceUsd, isFallback: true };
  //       }
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }

  //     const data: CoinGeckoPriceResponse = await response.json();
  //     
  //     if (data[coinId] && data[coinId].usd) {
  //       const price = data[coinId].usd;
  //       
  //       // Cache the price
  //       await dbOperations.upsertPrice({
  //         id: symbol,
  //         symbol: symbol,
  //         priceUsd: price,
  //       });
  //       
  //       // Update to current time slot
  //       this.lastRefreshSlot = this.getCurrentRefreshSlot();
  //       
  //       // Trigger portfolio snapshot save (async, don't await)
  //       this.savePortfolioSnapshot().catch(err => 
  //         console.error('Failed to save portfolio snapshot:', err)
  //       );
  //       
  //       return { price, isFallback: false };
  //     }
  //     
  //     // Try fallback if no data
  //     const cachedPrice = await dbOperations.getPrice(symbol);
  //     if (cachedPrice) {
  //       return { price: cachedPrice.priceUsd, isFallback: true };
  //     }
  //     
  //     return null;
  //   } catch (error) {
  //     console.error(`Error fetching price for ${symbol}:`, error);
  //     // Return cached price as fallback
  //     const cachedPrice = await dbOperations.getPrice(symbol);
  //     if (cachedPrice) {
  //       return { price: cachedPrice.priceUsd, isFallback: true };
  //     }
  //     return null;
  //   }
  // }

  /**
   * Get price for a single crypto symbol
   * NOTE: This method only reads from cache. 
   * Use refreshAllPrices() to fetch new prices via batch API.
   */
  async getPrice(symbol: string): Promise<{ price: number; isFallback: boolean } | null> {
    const cachedPrice = await dbOperations.getPrice(symbol);
    if (cachedPrice) {
      return { price: cachedPrice.priceUsd, isFallback: false };
    }
    return null;
  }

  /**
   * Get prices for multiple symbols (from cache only)
   * Use refreshAllPrices() to fetch fresh data
   */
  async getPrices(symbols: string[]): Promise<Map<string, { price: number; isFallback: boolean }>> {
    const prices = new Map<string, { price: number; isFallback: boolean }>();
    
    for (const symbol of symbols) {
      const result = await this.getPrice(symbol);
      if (result !== null) {
        prices.set(symbol, result);
      }
    }
    
    return prices;
  }

  /**
   * Refresh all cached prices with ONE batch API request
   * This is the main method to update prices - much more efficient!
   */
  async refreshAllPrices(symbols: string[]): Promise<void> {
    if (symbols.length === 0) return;
    
    // Check if we can refresh
    if (!this.canRefresh()) {
      const remaining = Math.ceil(this.getRemainingCooldown() / 1000);
      console.log(`[priceService] Cannot refresh yet, ${remaining}s remaining`);
      return;
    }
    
    console.log(`[priceService] Batch refreshing ${symbols.length} symbols with ONE API request`);
    await this.fetchBatchPricesFromAPI(symbols);
  }



  /**
   * Save portfolio snapshot after successful price fetch
   */
  private async savePortfolioSnapshot(): Promise<void> {
    // Portfolio snapshots are now calculated and saved by the backend server
    // Clients only read the data, they don't save snapshots locally
    console.log('[priceService] Portfolio snapshots are managed by backend server');
    return;
  }

  /**
   * Get price with change percentage (requires fresh fetch)
   */
  async getPriceWithChange(symbol: string): Promise<{ price: number; change24h: number; isFallback: boolean } | null> {
    // Check if we can refresh (new time slot)
    if (!this.canRefresh()) {
      // Return cached data during same time slot
      const cachedPrice = await dbOperations.getPrice(symbol);
      if (cachedPrice) {
        return { price: cachedPrice.priceUsd, change24h: 0, isFallback: true };
      }
      return null;
    }
    
    try {
      const coinId = await this.symbolToId(symbol);
      const url = `${COINGECKO_API_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
      
      const response = await fetch(url);
      if (!response.ok) {
        // Fallback to cached
        const cachedPrice = await dbOperations.getPrice(symbol);
        if (cachedPrice) {
          return { price: cachedPrice.priceUsd, change24h: 0, isFallback: true };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CoinGeckoPriceResponse = await response.json();
      
      if (data[coinId] && data[coinId].usd) {
        return {
          price: data[coinId].usd,
          change24h: data[coinId].usd_24h_change || 0,
          isFallback: false,
        };
      }
      
      // Fallback
      const cachedPrice = await dbOperations.getPrice(symbol);
      if (cachedPrice) {
        return { price: cachedPrice.priceUsd, change24h: 0, isFallback: true };
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching price with change for ${symbol}:`, error);
      // Fallback to cached
      const cachedPrice = await dbOperations.getPrice(symbol);
      if (cachedPrice) {
        return { price: cachedPrice.priceUsd, change24h: 0, isFallback: true };
      }
      return null;
    }
  }
}

export const priceService = PriceService.getInstance();
