import { useEffect, useState, useCallback } from 'react';

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const SYNC_INTERVAL = 5000; // 5 seconds

interface ExchangeSyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
  balances: Array<{
    exchange: string;
    symbol: string;
    total: number;
    free: number;
    used: number;
  }>;
}

/**
 * Hook to automatically sync exchange balances
 * Fetches OKX and other exchange balances every 5 seconds
 */
export function useExchangeSync() {
  const [status, setStatus] = useState<ExchangeSyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    error: null,
    balances: [],
  });

  const syncExchangeBalances = useCallback(async () => {
    if (!USE_BACKEND) {
      console.log('[ExchangeSync] Backend disabled, skipping sync');
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

      const allBalances: any[] = [];

      // Hardcode OKX for now - we know it exists
      const exchanges = ['okx'];
      
      // Fetch balances for each exchange
      for (const exchange of exchanges) {
        try {
          console.log(`[ExchangeSync] Fetching ${exchange} balances from ${API_BASE_URL}/api/exchange/${exchange}/balance`);
          
          // Use backend API endpoint
          const url = `${API_BASE_URL}/api/exchange/${exchange}/balance`;
          const response = await fetch(url);
          
          console.log(`[ExchangeSync] Response status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[ExchangeSync] Response data:`, data);
            
            if (data.success && Array.isArray(data.data)) {
              console.log(`[ExchangeSync] ✅ ${exchange}: ${data.count} assets found`);
              
              // Add exchange name to each balance
              const exchangeBalances = data.data.map((item: any) => ({
                exchange: exchange,
                symbol: item.symbol,
                total: item.total || 0,
                free: item.free || 0,
                used: item.used || 0,
              }));
              
              allBalances.push(...exchangeBalances);
              console.log(`[ExchangeSync] Added ${exchangeBalances.length} balances`);
            } else {
              console.warn(`[ExchangeSync] Invalid data format from ${exchange}`);
            }
          } else {
            const errorText = await response.text();
            console.warn(`[ExchangeSync] Failed to fetch ${exchange}: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          console.error(`[ExchangeSync] Error fetching ${exchange}:`, error);
        }
      }

      console.log(`[ExchangeSync] Total balances collected: ${allBalances.length}`);

      setStatus({
        isSyncing: false,
        lastSyncTime: Date.now(),
        error: null,
        balances: allBalances,
      });

    } catch (error) {
      console.error('[ExchangeSync] Sync error:', error);
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  // Initial sync and periodic sync
  useEffect(() => {
    if (!USE_BACKEND) {
      console.log('[ExchangeSync] Backend is disabled (VITE_USE_BACKEND=false)');
      return;
    }

    console.log('[ExchangeSync] Starting auto-sync with interval:', SYNC_INTERVAL);

    // Initial sync
    syncExchangeBalances();

    // Set up interval for periodic sync (every 5 seconds)
    const intervalId = setInterval(() => {
      syncExchangeBalances();
    }, SYNC_INTERVAL);

    return () => {
      console.log('[ExchangeSync] Cleaning up interval');
      clearInterval(intervalId);
    };
  }, [syncExchangeBalances]);

  return {
    ...status,
    refresh: syncExchangeBalances,
  };
}
