import { RefreshCw, TrendingUp, Wallet, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { useExchangeSync } from '../hooks/useExchangeSync';
import { usePrices } from '../hooks/usePrices';
import { useEffect, useState } from 'react';

interface ExchangeAssetWithPrice {
  exchange: string;
  symbol: string;
  total: number;
  free: number;
  used: number;
  priceUsd?: number;
  valueUsd?: number;
}

export default function ExchangeBalanceCard() {
  const { balances, isSyncing, lastSyncTime, error, refresh } = useExchangeSync();
  const { prices } = usePrices();
  const [assetsWithPrices, setAssetsWithPrices] = useState<ExchangeAssetWithPrice[]>([]);
  const [showDebug, setShowDebug] = useState(true); // 默认显示调试信息
  
  // 环境变量检查
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

  // Enrich balances with price data
  useEffect(() => {
    if (balances.length === 0 || prices.length === 0) {
      setAssetsWithPrices([]);
      return;
    }

    const enriched = balances.map(balance => {
      const priceData = prices.find(p => p.symbol === balance.symbol);
      const priceUsd = priceData?.priceUsd || 0;
      const valueUsd = balance.total * priceUsd;

      return {
        ...balance,
        priceUsd,
        valueUsd,
      };
    });

    setAssetsWithPrices(enriched);
  }, [balances, prices]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  // Group assets by exchange
  const groupedByExchange = assetsWithPrices.reduce((acc, asset) => {
    if (!acc[asset.exchange]) {
      acc[asset.exchange] = [];
    }
    acc[asset.exchange].push(asset);
    return acc;
  }, {} as Record<string, ExchangeAssetWithPrice[]>);

  // Calculate totals per exchange
  const exchangeTotals = Object.entries(groupedByExchange).map(([exchange, assets]) => {
    const total = assets.reduce((sum, asset) => sum + (asset.valueUsd || 0), 0);
    return { exchange, total, assetCount: assets.length };
  });

  const grandTotal = exchangeTotals.reduce((sum, ex) => sum + ex.total, 0);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-purple-200 dark:border-purple-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Exchange Balances
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Auto-updating every 5s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-lg transition-colors"
              aria-label="Toggle debug"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={refresh}
              disabled={isSyncing}
              className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Refresh balances"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Grand Total */}
        {grandTotal > 0 && (
          <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(grandTotal)}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
          {isSyncing ? 'Syncing...' : `Last updated: ${formatTime(lastSyncTime)}`}
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="p-4 bg-gray-900 text-gray-100 border-b border-purple-700/50">
          <div className="text-sm font-mono space-y-2">
            <div className="font-bold text-purple-400 mb-2">🔍 调试信息 (Debug Info)</div>
            
            {/* 环境配置 */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {USE_BACKEND ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                <span>Backend Enabled: {USE_BACKEND ? 'true' : 'false'}</span>
              </div>
              <div className="flex items-center gap-2">
                {API_BASE_URL ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-yellow-400" />}
                <span>API URL: {API_BASE_URL || '(empty - using relative)'}</span>
              </div>
            </div>

            {/* 同步状态 */}
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="text-purple-400 font-semibold mb-1">同步状态:</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                <span>{isSyncing ? 'Syncing...' : 'Ready'}</span>
              </div>
              <div>Last Sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}</div>
            </div>

            {/* 余额数据 */}
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="text-purple-400 font-semibold mb-1">余额数据:</div>
              <div>Balances Count: {balances.length}</div>
              {balances.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {balances.map((b, i) => (
                    <div key={i} className="text-xs">
                      {b.exchange}/{b.symbol}: {b.total}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-yellow-400">⚠️ 没有余额数据！检查控制台日志</div>
              )}
            </div>

            {/* 价格数据 */}
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="text-purple-400 font-semibold mb-1">价格数据:</div>
              <div>Prices Count: {prices.length}</div>
              {prices.length > 0 && (
                <div className="text-xs">
                  {prices.slice(0, 3).map(p => `${p.symbol}:$${p.priceUsd}`).join(', ')}
                  {prices.length > 3 && '...'}
                </div>
              )}
            </div>

            {/* 错误信息 */}
            {error && (
              <div className="border-t border-gray-700 pt-2 mt-2">
                <div className="text-red-400 font-semibold mb-1">错误:</div>
                <div className="text-red-300 text-xs">{error}</div>
              </div>
            )}

            {/* 检查清单 */}
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="text-purple-400 font-semibold mb-1">检查清单:</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  {USE_BACKEND ? '✅' : '❌'}
                  <span>VITE_USE_BACKEND = true</span>
                </div>
                <div className="flex items-center gap-2">
                  {API_BASE_URL ? '✅' : '⚠️'}
                  <span>VITE_API_BASE_URL 已设置</span>
                </div>
                <div className="flex items-center gap-2">
                  {balances.length > 0 ? '✅' : '❌'}
                  <span>收到余额数据</span>
                </div>
                <div className="flex items-center gap-2">
                  {!error ? '✅' : '❌'}
                  <span>无错误</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-2 mt-2 text-xs text-gray-400">
              💡 提示: 打开浏览器控制台(F12)查看 [ExchangeSync] 日志
            </div>
          </div>
        </div>
      )}

      {/* Exchange Balances */}
      <div className="p-4 space-y-4">
        {balances.length === 0 && !isSyncing && (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <div className="text-gray-700 dark:text-gray-300 font-semibold mb-2">
              未找到交易所余额
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>请检查上方的调试信息</div>
              <div>确保:</div>
              <div>1. 后端服务器正在运行</div>
              <div>2. OKX API key 已保存</div>
              <div>3. 环境变量配置正确</div>
            </div>
          </div>
        )}
        
        {Object.entries(groupedByExchange).map(([exchange, assets]) => {
          const exchangeTotal = assets.reduce((sum, asset) => sum + (asset.valueUsd || 0), 0);
          
          return (
            <div key={exchange} className="space-y-2">
              {/* Exchange Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100 uppercase">
                    {exchange}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {assets.length} assets
                  </span>
                </div>
                <div className="font-semibold text-purple-600 dark:text-purple-400">
                  {formatCurrency(exchangeTotal)}
                </div>
              </div>

              {/* Assets List */}
              <div className="space-y-1.5">
                {assets.map((asset, idx) => (
                  <div
                    key={`${asset.exchange}-${asset.symbol}-${idx}`}
                    className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {asset.symbol}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {asset.total.toFixed(8)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(asset.valueUsd || 0)}
                      </div>
                      {asset.priceUsd && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          @ {formatCurrency(asset.priceUsd)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
