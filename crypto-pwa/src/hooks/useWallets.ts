import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbOperations, type Wallet } from '../db/db';
import { syncService } from '../services/syncService';

/**
 * Hook to get all wallets with live reactivity
 * Automatically re-renders when wallets change
 */
export function useWallets() {
  const wallets = useLiveQuery(() => db.wallets.toArray(), []);

  return {
    wallets: wallets ?? [],
    isLoading: wallets === undefined,
  };
}

/**
 * Hook to get a single wallet by ID with live reactivity
 */
export function useWallet(id: number | undefined) {
  const wallet = useLiveQuery(
    () => (id ? db.wallets.get(id) : undefined),
    [id]
  );

  return {
    wallet,
    isLoading: wallet === undefined && id !== undefined,
  };
}

/**
 * Hook to perform wallet operations
 */
export function useWalletOperations() {
  const addWallet = async (wallet: Omit<Wallet, 'id' | 'createdAt'>) => {
    // Server-first approach: Try to save to server first if sync is enabled
    if (syncService.isSyncEnabled()) {
      try {
        const serverWallet = await syncService.createWallet(wallet) as { id: number } | null;
        if (serverWallet && serverWallet.id) {
          // Save to local with server ID
          await db.wallets.add({
            id: serverWallet.id,
            ...wallet,
            createdAt: new Date(),
          });
          console.log(`[Wallet] ✅ Saved to server and local (ID: ${serverWallet.id})`);
          return serverWallet.id;
        }
      } catch (error) {
        console.error('[Wallet] ⚠️ Server save failed, saving locally only:', error);
        // Fall back to local-only save
      }
    }
    
    // Fallback: Save to local database only
    const localId = await dbOperations.addWallet(wallet);
    console.warn(`[Wallet] ⚠️ Saved locally only (ID: ${localId}) - sync to server later`);
    return localId;
  };

  const deleteWallet = async (id: number) => {
    // Server-first approach: Try to delete from server first if sync is enabled
    if (syncService.isSyncEnabled()) {
      try {
        await syncService.deleteWallet(id);
        console.log(`[Wallet] ✅ Deleted from server (ID: ${id})`);
      } catch (error) {
        console.error('[Wallet] ⚠️ Server delete failed:', error);
        // Continue to delete locally anyway
      }
    }
    
    // Always delete from local database
    await dbOperations.deleteWallet(id);
  };

  return {
    addWallet,
    deleteWallet,
  };
}
