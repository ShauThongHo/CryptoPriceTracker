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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[ExchangeSync] 🚀 开始同步 | Starting sync...');
    console.log('[ExchangeSync] 环境配置:');
    console.log('  - USE_BACKEND:', USE_BACKEND);
    console.log('  - API_BASE_URL:', API_BASE_URL);
    
    if (!USE_BACKEND) {
      console.warn('[ExchangeSync] ⚠️ Backend未启用，跳过同步');
      setStatus(prev => ({ ...prev, error: 'Backend未启用 (VITE_USE_BACKEND=false)' }));
      return;
    }

    if (!API_BASE_URL) {
      console.warn('[ExchangeSync] ⚠️ API_BASE_URL为空，使用相对路径');
    }

    try {
      setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

      const allBalances: any[] = [];

      // Hardcode OKX for now - we know it exists
      const exchanges = ['okx'];
      console.log('[ExchangeSync] 准备获取交易所:', exchanges);
      
      // Fetch balances for each exchange
      for (const exchange of exchanges) {
        try {
          const url = `${API_BASE_URL}/api/exchange/${exchange}/balance`;
          console.log(`[ExchangeSync] 🌐 请求 ${exchange} 余额:`);
          console.log(`  完整URL: ${url}`);
          
          // Use backend API endpoint
          const response = await fetch(url);
          
          console.log(`[ExchangeSync] 📡 响应状态: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`[ExchangeSync] 📦 收到数据:`, data);
            
            if (data.success && Array.isArray(data.data)) {
              console.log(`[ExchangeSync] ✅ ${exchange}: ${data.count} 个资产`);
              data.data.forEach((asset: any, idx: number) => {
                console.log(`  [${idx + 1}] ${asset.symbol}: ${asset.total} (free: ${asset.free}, used: ${asset.used})`);
              });
              
              // Add exchange name to each balance
              const exchangeBalances = data.data.map((item: any) => ({
                exchange: exchange,
                symbol: item.symbol,
                total: item.total || 0,
                free: item.free || 0,
                used: item.used || 0,
              }));
              
              allBalances.push(...exchangeBalances);
              console.log(`[ExchangeSync] 添加了 ${exchangeBalances.length} 条余额记录`);
            } else {
              console.warn(`[ExchangeSync] ⚠️ ${exchange} 响应格式异常:`, data);
              throw new Error(`Invalid data format: success=${data.success}, isArray=${Array.isArray(data.data)}`);
            }
          } else {
            const errorText = await response.text();
            console.error(`[ExchangeSync] ❌ HTTP错误 ${exchange}: ${response.status}`);
            console.error(`  错误内容:`, errorText.substring(0, 200));
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[ExchangeSync] ❌ ${exchange} 获取失败:`, errorMsg);
          console.error(`[ExchangeSync] 错误详情:`, error);
          setStatus(prev => ({ ...prev, error: `${exchange}: ${errorMsg}` }));
        }
      }

      console.log(`[ExchangeSync] 📊 总计余额数: ${allBalances.length}`);
      console.log('[ExchangeSync] ✅ 同步完成');

      setStatus({
        isSyncing: false,
        lastSyncTime: Date.now(),
        error: allBalances.length === 0 ? '未找到余额数据' : null,
        balances: allBalances,
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ExchangeSync] ❌ 同步失败:', errorMsg);
      console.error('[ExchangeSync] 错误对象:', error);
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMsg,
      }));
    } finally {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }, []);

  // Initial sync and periodic sync
  useEffect(() => {
    console.log('[ExchangeSync] 🎬 组件挂载 | Component mounted');
    console.log('[ExchangeSync] 配置检查:');
    console.log('  - USE_BACKEND:', USE_BACKEND);
    console.log('  - API_BASE_URL:', API_BASE_URL);
    console.log('  - SYNC_INTERVAL:', SYNC_INTERVAL, 'ms');
    
    if (!USE_BACKEND) {
      console.warn('[ExchangeSync] ⚠️ Backend已禁用 (VITE_USE_BACKEND=false)');
      console.warn('[ExchangeSync] 请检查 .env 文件中的 VITE_USE_BACKEND 设置');
      return;
    }

    console.log('[ExchangeSync] ✅ 启动自动同步...');

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
