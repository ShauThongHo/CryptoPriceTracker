import { useState, useEffect, useCallback } from 'react';
import { syncService } from '../services/syncService';
import { db, dbOperations } from '../db/db';

export interface SyncStatus {
  isInitialSync: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
  isOnline: boolean;
}

export function useSyncHydration() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isInitialSync: true,
    isSyncing: false,
    lastSyncTime: null,
    error: null,
    isOnline: false,
  });

  /**
   * Hydrate local database from server on app startup
   */
  const hydrateFromServer = useCallback(async () => {
    if (!syncService.isSyncEnabled()) {
      console.log('[SyncHydration] Sync disabled, using local storage only');
      setSyncStatus({
        isInitialSync: false,
        isSyncing: false,
        lastSyncTime: null,
        error: null,
        isOnline: false,
      });
      return;
    }

    // Check if local DB has data
    const localWalletCount = await db.wallets.count();
    const localAssetCount = await db.assets.count();
    const hasLocalData = localWalletCount > 0 || localAssetCount > 0;

    if (hasLocalData) {
      console.log('[SyncHydration] 📦 Local data found, loading immediately...');
      // Show local data first, sync in background
      setSyncStatus({
        isInitialSync: false,
        isSyncing: true, // Background sync
        lastSyncTime: null,
        error: null,
        isOnline: false,
      });
    } else {
      setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    }

    // Maximum total timeout (connection test + sync)
    const MAX_TOTAL_TIMEOUT = 60000; // 60 seconds for slow networks
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sync timeout - using local data')), MAX_TOTAL_TIMEOUT);
    });

    try {
      await Promise.race([
        (async () => {
          // Test connection first
          const isOnline = await syncService.testConnection();
          setSyncStatus((prev) => ({ ...prev, isOnline }));

          if (!isOnline) {
            console.warn('[SyncHydration] Backend offline, using local cache');
            setSyncStatus((prev) => ({
              ...prev,
              isInitialSync: false,
              isSyncing: false,
              error: 'Backend offline - using local data',
            }));
            return;
          }

      // Fetch server state
      const result = await syncService.fetchServerState();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch server state');
      }

      if (!result.data) {
        throw new Error('No data received from server');
      }

      // Clear local database
      await db.wallets.clear();
      await db.assets.clear();
      await db.customCoins.clear();

      // Hydrate wallets
      for (const wallet of result.data.wallets) {
        await db.wallets.add({
          id: wallet.id,
          name: wallet.name,
          type: wallet.type,
          exchangeName: wallet.exchange_name || wallet.exchangeName,
          createdAt: new Date(wallet.created_at * 1000),
        });
      }

      // Hydrate assets
      for (const asset of result.data.assets) {
        await db.assets.add({
          id: asset.id,
          walletId: asset.wallet_id || asset.walletId || 0,
          symbol: asset.symbol,
          amount: asset.amount,
          tags: asset.tags,
          notes: asset.notes,
          autoSync: asset.auto_sync || false,
          createdAt: new Date(asset.created_at * 1000),
          updatedAt: new Date(asset.updated_at * 1000),
        });
      }

      // Hydrate custom coins
      for (const coin of result.data.customCoins || []) {
        await db.customCoins.add({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          coinGeckoId: coin.coin_gecko_id || coin.coinGeckoId || '',
          isCustom: coin.is_custom !== undefined ? coin.is_custom : true,
          createdAt: new Date(coin.created_at * 1000),
        });
      }

      console.log(
        `[SyncHydration] Hydration complete: ${result.data.wallets.length} wallets, ${result.data.assets.length} assets, ${result.data.customCoins?.length || 0} custom coins`
      );

      setSyncStatus({
        isInitialSync: false,
        isSyncing: false,
        lastSyncTime: Date.now(),
        error: null,
        isOnline: true,
      });
        })(),
        timeoutPromise
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SyncHydration] Hydration failed:', errorMessage);

      setSyncStatus({
        isInitialSync: false,
        isSyncing: false,
        lastSyncTime: null,
        error: errorMessage,
        isOnline: false,
      });
    }
  }, []);

  /**
   * Push current local state to server
   */
  const pushToServer = useCallback(async () => {
    if (!syncService.isSyncEnabled()) {
      return { success: false, error: 'Sync disabled' };
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const wallets = await dbOperations.getWallets();
      const assets = await dbOperations.getAllAssets();
      const customCoins = await db.customCoins.toArray();

      const result = await syncService.pushLocalState(wallets, assets, customCoins);

      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: result.success ? Date.now() : prev.lastSyncTime,
        error: result.error || null,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Manual sync trigger (refresh from server)
   */
  const syncFromServer = useCallback(async () => {
    return await hydrateFromServer();
  }, [hydrateFromServer]);

  // Auto-hydrate on mount
  useEffect(() => {
    hydrateFromServer();
  }, [hydrateFromServer]);

  return {
    syncStatus,
    hydrateFromServer,
    pushToServer,
    syncFromServer,
  };
}
