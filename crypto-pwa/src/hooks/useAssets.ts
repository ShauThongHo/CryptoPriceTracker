import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbOperations, type Asset } from '../db/db';
import { syncService } from '../services/syncService';

export { useWallets } from './useWallets';

/**
 * Hook to get all assets with live reactivity
 * Automatically re-renders when assets change
 */
export function useAssets() {
  const assets = useLiveQuery(() => db.assets.toArray(), []);

  return {
    assets: assets ?? [],
    isLoading: assets === undefined,
  };
}

/**
 * Hook to get assets for a specific wallet with live reactivity
 */
export function useAssetsByWallet(walletId: number | undefined) {
  const assets = useLiveQuery(
    async () => {
      if (!walletId) return [];
      return await db.assets.where('walletId').equals(walletId).toArray();
    },
    [walletId]
  );

  return {
    assets: assets ?? [],
    isLoading: assets === undefined && walletId !== undefined,
  };
}

/**
 * Hook to get a single asset by ID with live reactivity
 */
export function useAsset(id: number | undefined) {
  const asset = useLiveQuery(() => (id ? db.assets.get(id) : undefined), [id]);

  return {
    asset,
    isLoading: asset === undefined && id !== undefined,
  };
}

/**
 * Hook to perform asset operations
 */
export function useAssetOperations() {
  const addAsset = async (
    asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    // Optimistic UI: Add to local database immediately
    const localId = await dbOperations.addAsset(asset);
    
    // Push to server in background
    if (syncService.isSyncEnabled()) {
      try {
        const serverAsset = await syncService.createAsset(asset);
        // Update local ID to match server ID if different
        if (serverAsset && serverAsset.id !== localId) {
          console.log(`[Asset] Syncing ID: local=${localId}, server=${serverAsset.id}`);
        }
      } catch (error) {
        console.error('[Asset] Failed to sync to server:', error);
      }
    }
    
    return localId;
  };

  const updateAsset = async (
    id: number,
    updates: Partial<Omit<Asset, 'id'>>
  ) => {
    // Optimistic UI: Update local database immediately
    await dbOperations.updateAsset(id, updates);
    
    // Push to server in background
    if (syncService.isSyncEnabled()) {
      try {
        await syncService.updateAsset(id, {
          symbol: updates.symbol,
          amount: updates.amount,
          tags: updates.tags,
          notes: updates.notes,
        });
      } catch (error) {
        console.error('[Asset] Failed to update on server:', error);
      }
    }
  };

  const deleteAsset = async (id: number) => {
    // Optimistic UI: Delete from local database immediately
    await dbOperations.deleteAsset(id);
    
    // Push to server in background
    if (syncService.isSyncEnabled()) {
      try {
        await syncService.deleteAsset(id);
      } catch (error) {
        console.error('[Asset] Failed to delete on server:', error);
      }
    }
  };

  return {
    addAsset,
    updateAsset,
    deleteAsset,
  };
}

/**
 * Hook to get aggregated portfolio data
 */
export function usePortfolioSummary() {
  const assets = useLiveQuery(() => db.assets.toArray(), []);
  const wallets = useLiveQuery(() => db.wallets.toArray(), []);

  // Group assets by symbol and calculate total amounts
  const assetSummary = assets?.reduce(
    (acc, asset) => {
      if (!acc[asset.symbol]) {
        acc[asset.symbol] = {
          symbol: asset.symbol,
          totalAmount: 0,
          walletCount: 0,
        };
      }
      acc[asset.symbol].totalAmount += asset.amount;
      acc[asset.symbol].walletCount += 1;
      return acc;
    },
    {} as Record<
      string,
      { symbol: string; totalAmount: number; walletCount: number }
    >
  );

  return {
    totalAssets: assets?.length ?? 0,
    totalWallets: wallets?.length ?? 0,
    assetSummary: assetSummary ? Object.values(assetSummary) : [],
    assets: assets ?? [],
    isLoading: assets === undefined || wallets === undefined,
  };
}
