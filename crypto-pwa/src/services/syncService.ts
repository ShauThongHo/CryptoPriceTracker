// Backend API Configuration
const BACKEND_API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const SYNC_ENABLED = import.meta.env.VITE_SYNC_ENABLED !== 'false'; // Default true
const SYNC_TIMEOUT = 10000; // 10 seconds

export interface SyncState {
  wallets: Array<{
    id: number;
    name: string;
    type: 'hot' | 'cold' | 'exchange';
    exchange_name?: string;
    exchangeName?: string;
    color?: string;
    created_at: number;
    createdAt?: Date;
  }>;
  assets: Array<{
    id: number;
    wallet_id: number;
    walletId?: number;
    symbol: string;
    amount: number;
    tags?: string;
    notes?: string;
    created_at: number;
    createdAt?: Date;
    updated_at: number;
    updatedAt?: Date;
  }>;
  timestamp: number;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  data?: SyncState;
}

export class SyncService {
  private static instance: SyncService;
  private syncInProgress = false;
  private lastSyncTime = 0;
  private readonly MIN_SYNC_INTERVAL = 1000; // Minimum 1 second between syncs

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Check if sync is enabled
   */
  isSyncEnabled(): boolean {
    return SYNC_ENABLED;
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    if (!SYNC_ENABLED) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${BACKEND_API_BASE}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('[SyncService] Backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Fetch full sync state from backend
   */
  async fetchServerState(): Promise<SyncResult> {
    if (!SYNC_ENABLED) {
      return { success: false, error: 'Sync is disabled' };
    }

    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    try {
      this.syncInProgress = true;
      console.log('[SyncService] Fetching server state...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT);

      const response = await fetch(`${BACKEND_API_BASE}/api/sync`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Server returned unsuccessful response');
      }

      console.log(
        `[SyncService] Received ${result.data.wallets.length} wallets, ${result.data.assets.length} assets`
      );

      this.lastSyncTime = Date.now();
      return { success: true, data: result.data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SyncService] Fetch failed:', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Push local state to backend (overwrites server data)
   */
  async pushLocalState(wallets: unknown[], assets: unknown[]): Promise<SyncResult> {
    if (!SYNC_ENABLED) {
      return { success: false, error: 'Sync is disabled' };
    }

    // Rate limiting
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    if (timeSinceLastSync < this.MIN_SYNC_INTERVAL) {
      console.warn('[SyncService] Rate limited, skipping sync');
      return { success: false, error: 'Rate limited' };
    }

    try {
      console.log(`[SyncService] Pushing ${wallets.length} wallets, ${assets.length} assets...`);

      // Convert frontend format to backend format
      const backendWallets = wallets.map((w: any) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        exchange_name: w.exchangeName || null,
        color: null, // Not used in current frontend
        created_at: w.createdAt ? Math.floor(w.createdAt.getTime() / 1000) : Math.floor(Date.now() / 1000),
      }));

      const backendAssets = assets.map((a: any) => ({
        id: a.id,
        wallet_id: a.walletId,
        symbol: a.symbol,
        amount: a.amount,
        tags: a.tags || null,
        notes: a.notes || null,
        created_at: a.createdAt ? Math.floor(a.createdAt.getTime() / 1000) : Math.floor(Date.now() / 1000),
        updated_at: a.updatedAt ? Math.floor(a.updatedAt.getTime() / 1000) : Math.floor(Date.now() / 1000),
      }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT);

      const response = await fetch(`${BACKEND_API_BASE}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallets: backendWallets,
          assets: backendAssets,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Server returned unsuccessful response');
      }

      console.log('[SyncService] Push successful:', result.message);
      this.lastSyncTime = Date.now();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SyncService] Push failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create a wallet on the backend
   */
  async createWallet(wallet: { name: string; type: 'hot' | 'cold' | 'exchange'; exchangeName?: string }): Promise<unknown> {
    if (!SYNC_ENABLED) return null;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wallet.name,
          type: wallet.type,
          exchangeName: wallet.exchangeName || null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('[SyncService] Wallet created on server:', result.data);
        return result.data;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error('[SyncService] Create wallet failed:', error);
      throw error;
    }
  }

  /**
   * Delete a wallet on the backend
   */
  async deleteWallet(id: number): Promise<boolean> {
    if (!SYNC_ENABLED) return false;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/wallets/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        console.log('[SyncService] Wallet deleted on server:', id);
        return true;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error('[SyncService] Delete wallet failed:', error);
      throw error;
    }
  }

  /**
   * Create an asset on the backend
   */
  async createAsset(asset: {
    walletId: number;
    symbol: string;
    amount: number;
    tags?: string;
    notes?: string;
  }): Promise<unknown> {
    if (!SYNC_ENABLED) return null;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset),
      });

      const result = await response.json();
      if (result.success) {
        console.log('[SyncService] Asset created on server:', result.data);
        return result.data;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error('[SyncService] Create asset failed:', error);
      throw error;
    }
  }

  /**
   * Update an asset on the backend
   */
  async updateAsset(id: number, updates: { symbol?: string; amount?: number; tags?: string; notes?: string }): Promise<boolean> {
    if (!SYNC_ENABLED) return false;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      if (result.success) {
        console.log('[SyncService] Asset updated on server:', id);
        return true;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error('[SyncService] Update asset failed:', error);
      throw error;
    }
  }

  /**
   * Delete an asset on the backend
   */
  async deleteAsset(id: number): Promise<boolean> {
    if (!SYNC_ENABLED) return false;

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/assets/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        console.log('[SyncService] Asset deleted on server:', id);
        return true;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error('[SyncService] Delete asset failed:', error);
      throw error;
    }
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
