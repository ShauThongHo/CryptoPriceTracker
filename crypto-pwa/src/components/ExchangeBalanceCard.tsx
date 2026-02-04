import { RefreshCw, TrendingUp, Wallet } from 'lucide-react';
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

  // Calculate USD values
  useEffect(() => {
    const enriched = balances.map(balance => {
      const priceData = prices.find(p => p.symbol.toUpperCase() === balance.symbol.toUpperCase());
      const priceUsd = priceData?.price;
      
      return {
        ...balance,
        priceUsd,
        valueUsd: priceUsd ? balance.total * priceUsd : undefined,
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

  const formatNumber = (value: number, decimals = 8) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Group by exchange
  const groupedByExchange = assetsWithPrices.reduce((acc, asset) => {
    if (!acc[asset.exchange]) {
      acc[asset.exchange] = [];
    }
    acc[asset.exchange].push(asset);
    return acc;
  }, {} as Record<string, ExchangeAssetWithPrice[]>);

  // Calculate total value per exchange
  const exchangeTotals = Object.entries(groupedByExchange).map(([exchange, assets]) => {
    const total = assets.reduce((sum, asset) => sum + (asset.valueUsd || 0), 0);
    return { exchange, total, assetCount: assets.length };
  });

  const grandTotal = exchangeTotals.reduce((sum, ex) => sum + ex.total, 0);

  if (balances.length === 0 && !isSyncing) {
    return null; // Don't show if no exchange balances
  }

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
          <button
            onClick={refresh}
            disabled={isSyncing}
            className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Refresh balances"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Total Value */}
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

      {/* Exchange Balances */}
      <div className="p-4 space-y-4">
        {Object.entries(groupedByExchange).map(([exchange, assets]) => {
          const exchangeTotal = assets.reduce((sum, asset) => sum + (asset.valueUsd || 0), 0);

          return (
            <div key={exchange} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Exchange Header */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 uppercase">
                      {exchange}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({assets.length} assets)
                    </span>
                  </div>
                  {exchangeTotal > 0 && (
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {formatCurrency(exchangeTotal)}
                    </span>
                  )}
                </div>
              </div>

              {/* Assets */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {assets.map((asset, idx) => (
                  <div key={`${asset.symbol}-${idx}`} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {asset.symbol}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatNumber(asset.total)} {asset.symbol}
                        </div>
                        {asset.free > 0 || asset.used > 0 ? (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Free: {formatNumber(asset.free, 4)} | 
                            Used: {formatNumber(asset.used, 4)}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right">
                        {asset.valueUsd !== undefined ? (
                          <>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(asset.valueUsd)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              @ {formatCurrency(asset.priceUsd || 0)}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Price unavailable
                          </div>
                        )}
                      </div>
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
