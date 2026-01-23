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

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
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
          createdAt: new Date(asset.created_at * 1000),
          updatedAt: new Date(asset.updated_at * 1000),
        });
      }

      console.log(
        `[SyncHydration] Hydration complete: ${result.data.wallets.length} wallets, ${result.data.assets.length} assets`
      );

      setSyncStatus({
        isInitialSync: false,
        isSyncing: false,
        lastSyncTime: Date.now(),
        error: null,
        isOnline: true,
      });
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

      const result = await syncService.pushLocalState(wallets, assets);

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
