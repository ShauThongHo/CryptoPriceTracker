import { useEffect, useState, useCallback } from 'react';
import { exchangeService } from '../services/exchangeService';
import { dbOperations } from '../db/db';

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

      // Get all saved API keys from database
      const apiKeys = await dbOperations.getAllApiKeys();
      
      if (apiKeys.length === 0) {
        console.log('[ExchangeSync] No exchange API keys found');
        setStatus(prev => ({ 
          ...prev, 
          isSyncing: false, 
          lastSyncTime: Date.now(),
          balances: [] 
        }));
        return;
      }

      const allBalances: any[] = [];

      // Fetch balances for each exchange
      for (const apiKey of apiKeys) {
        try {
          console.log(`[ExchangeSync] Fetching ${apiKey.exchange} balances...`);
          
          // Use backend API endpoint
          const response = await fetch(`${API_BASE_URL}/api/exchange/${apiKey.exchange}/balance`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
              console.log(`[ExchangeSync] ✅ ${apiKey.exchange}: ${data.count} assets`);
              
              // Add exchange name to each balance
              const exchangeBalances = data.data.map((item: any) => ({
                exchange: apiKey.exchange,
                symbol: item.symbol,
                total: item.total || 0,
                free: item.free || 0,
                used: item.used || 0,
              }));
              
              allBalances.push(...exchangeBalances);
            }
          } else {
            console.warn(`[ExchangeSync] Failed to fetch ${apiKey.exchange}: ${response.status}`);
          }
        } catch (error) {
          console.error(`[ExchangeSync] Error fetching ${apiKey.exchange}:`, error);
        }
      }

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
      return;
    }

    // Initial sync
    syncExchangeBalances();

    // Set up interval for periodic sync (every 5 seconds)
    const intervalId = setInterval(() => {
      syncExchangeBalances();
    }, SYNC_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [syncExchangeBalances]);

  return {
    ...status,
    refresh: syncExchangeBalances,
  };
}
