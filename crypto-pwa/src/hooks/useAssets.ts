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
    // Server-first approach: Try to save to server first if sync is enabled
    if (syncService.isSyncEnabled()) {
      try {
        const serverAsset = await syncService.createAsset(asset) as { id: number } | null;
        if (serverAsset && serverAsset.id) {
          // Save to local with server ID
          const now = new Date();
          await db.assets.add({
            id: serverAsset.id,
            ...asset,
            createdAt: now,
            updatedAt: now,
          });
          console.log(`[Asset] ✅ Saved to server and local (ID: ${serverAsset.id})`);
          return serverAsset.id;
        }
      } catch (error) {
        console.error('[Asset] ⚠️ Server save failed, saving locally only:', error);
        // Fall back to local-only save
      }
    }
    
    // Fallback: Save to local database only
    const localId = await dbOperations.addAsset(asset);
    console.warn(`[Asset] ⚠️ Saved locally only (ID: ${localId}) - sync to server later`);
    return localId;
  };

  const updateAsset = async (
    id: number,
    updates: Partial<Omit<Asset, 'id'>>
  ) => {
    // Server-first approach: Try to update server first if sync is enabled
    if (syncService.isSyncEnabled()) {
      try {
        await syncService.updateAsset(id, {
          symbol: updates.symbol,
          amount: updates.amount,
          tags: updates.tags,
          notes: updates.notes,
          earnConfig: updates.earnConfig,
        });
        console.log(`[Asset] ✅ Updated on server (ID: ${id})`);
      } catch (error) {
        console.error('[Asset] ⚠️ Server update failed:', error);
        // Continue to update locally anyway
      }
    }
    
    // Always update local database
    await dbOperations.updateAsset(id, updates);
  };

  const deleteAsset = async (id: number) => {
    // Server-first approach: Try to delete from server first if sync is enabled
    if (syncService.isSyncEnabled()) {
      try {
        await syncService.deleteAsset(id);
        console.log(`[Asset] ✅ Deleted from server (ID: ${id})`);
      } catch (error) {
        console.error('[Asset] ⚠️ Server delete failed:', error);
        // Continue to delete locally anyway
      }
    }
    
    // Always delete from local database
    await dbOperations.deleteAsset(id);
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
