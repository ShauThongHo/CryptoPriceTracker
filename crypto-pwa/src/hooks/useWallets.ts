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
    // Optimistic UI: Add to local database immediately
    const localId = await dbOperations.addWallet(wallet);
    
    // Push to server in background
    if (syncService.isSyncEnabled()) {
      try {
        const serverWallet = await syncService.createWallet(wallet) as { id: number } | null;
        // Update local ID to match server ID if different
        if (serverWallet && serverWallet.id !== localId) {
          console.log(`[Wallet] Syncing ID: local=${localId}, server=${serverWallet.id}`);
          // Note: In production, you might want to handle ID conflicts more carefully
        }
      } catch (error) {
        console.error('[Wallet] Failed to sync to server:', error);
        // Local data is still saved, will sync later
      }
    }
    
    return localId;
  };

  const deleteWallet = async (id: number) => {
    // Optimistic UI: Delete from local database immediately
    await dbOperations.deleteWallet(id);
    
    // Push to server in background
    if (syncService.isSyncEnabled()) {
      try {
        await syncService.deleteWallet(id);
      } catch (error) {
        console.error('[Wallet] Failed to delete on server:', error);
        // Local deletion is done, server will sync later
      }
    }
  };

  return {
    addWallet,
    deleteWallet,
  };
}
