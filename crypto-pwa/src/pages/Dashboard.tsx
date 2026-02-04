import { TrendingUp, RefreshCw, Wallet, PieChart as PieChartIcon, Clock, Coins } from 'lucide-react';
import { usePortfolioSummary, useWallets } from '../hooks/useAssets';
import { DashboardSkeleton } from '../components/LoadingSkeletons';
import { usePortfolioValue, usePriceSync } from '../hooks/usePriceSync';
import { usePrices } from '../hooks/usePrices';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useState, useEffect } from 'react';
import type { Asset, Wallet as WalletType } from '../db/db';
import { priceService } from '../services/priceService';
import PortfolioChart from '../components/PortfolioChart';
import PlatformDetailModal from '../components/PlatformDetailModal';
import ExchangeBalanceCard from '../components/ExchangeBalanceCard';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  const { totalAssets, totalWallets, isLoading, assets } = usePortfolioSummary();
  const { totalValue, valueBySymbol, isLoading: valueLoading, hasAssets } = usePortfolioValue();
  const { isLoading: syncingPrices, lastUpdate, refreshPrices } = usePriceSync();
  const { prices } = usePrices(); // Add this to trigger updates when prices change
  const { wallets } = useWallets();
  const [nextRefreshIn, setNextRefreshIn] = useState<number>(300); // seconds
  const [canRefresh, setCanRefresh] = useState<boolean>(false);
  const [walletValues, setWalletValues] = useState<Map<number, number>>(new Map());
  const [coinAggregates, setCoinAggregates] = useState<Map<string, { amount: number; value: number }>>(new Map());
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);

  // Calculate wallet values and coin aggregates
  useEffect(() => {
    async function calculateWalletValues() {
      console.log('[Dashboard] calculateWalletValues started');
      console.log('[Dashboard] wallets:', wallets.length, 'assets:', assets.length);
      const values = new Map<number, number>();
      const coinTotals = new Map<string, { amount: number; value: number }>();
      
      for (const wallet of wallets) {
        const walletAssets = assets.filter((a: Asset) => a.walletId === wallet.id);
        let walletTotal = 0;
        
        for (const asset of walletAssets) {
          try {
            const result = await priceService.getPrice(asset.symbol);
            if (result) {
              const value = result.price * asset.amount;
              walletTotal += value;
              
              // Aggregate by coin across all wallets
              const existing = coinTotals.get(asset.symbol) || { amount: 0, value: 0 };
              coinTotals.set(asset.symbol, {
                amount: existing.amount + asset.amount,
                value: existing.value + value,
              });
            }
          } catch (error) {
            console.error(`[Dashboard] Failed to get price for ${asset.symbol}:`, error);
            console.error('[Dashboard] Error stack:', error instanceof Error ? error.stack : 'No stack');
          }
        }
        
        if (wallet.id) {
          values.set(wallet.id, walletTotal);
        }
      }
      
      setWalletValues(values);
      setCoinAggregates(coinTotals);
    }
    
    if (wallets.length > 0 && assets.length > 0) {
      calculateWalletValues();
    }
  }, [wallets, assets, prices]); // Add prices to trigger recalculation

  // Real-time countdown timer (updates every second)
  useEffect(() => {
    const updateTimer = () => {
      const remaining = priceService.getRemainingCooldown();
      const canRefreshNow = priceService.canRefresh();
      
      setNextRefreshIn(Math.ceil(remaining / 1000)); // Convert ms to seconds
      setCanRefresh(canRefreshNow);
    };
    
    // Update immediately
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, []); // Empty deps - always run

  // Auto-refresh when time slot changes
  useEffect(() => {
    if (!hasAssets || syncingPrices || !canRefresh) return;
    
    console.log('[Dashboard] Auto-refreshing prices at new time slot');
    refreshPrices();
  }, [canRefresh, hasAssets, syncingPrices, refreshPrices]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const handleOpenPlatformDetail = (wallet: WalletType) => {
    setSelectedWallet(wallet);
    setIsPlatformModalOpen(true);
  };

  const handleAddAssetToWallet = () => {
    // This would trigger add asset modal with preselected wallet
    // For now, we just close the platform modal
    // You can enhance this to navigate to Portfolio or open AddAssetModal
    setIsPlatformModalOpen(false);
  };

  const getWalletAssets = (walletId: number | undefined): Asset[] => {
    if (!walletId) return [];
    return assets.filter((asset: Asset) => asset.walletId === walletId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('dashboard.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('dashboard.subtitle')}</p>
      </div>

      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-white shadow-lg mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-primary-100 text-sm">{t('dashboard.totalBalance')}</span>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-100" />
            {hasAssets && (
              <button
                onClick={refreshPrices}
                disabled={syncingPrices || !canRefresh}
                className="p-1 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Refresh prices"
                title={
                  canRefresh 
                    ? 'Refresh prices now' 
                    : `Next refresh at ${new Date(Date.now() + (nextRefreshIn * 1000)).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                }
              >
                <RefreshCw className={`w-4 h-4 ${syncingPrices ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
        <div className="text-4xl font-bold mb-1">
          {valueLoading ? (
            <span className="animate-pulse">{t('common.loading')}</span>
          ) : (
            formatCurrency(totalValue)
          )}
        </div>
        <div className="text-primary-100 text-sm">
          {totalAssets === 0
            ? t('dashboard.noAssets')
            : `${totalAssets} ${t('dashboard.totalAssets').toLowerCase()} ${t('common.in')} ${totalWallets} ${t('dashboard.totalWallets').toLowerCase()}`}
        </div>
        {hasAssets && (
          <div className="flex items-center justify-between text-primary-100 text-xs mt-2 opacity-75">
            {lastUpdate && <span>{t('dashboard.lastUpdated')} {formatLastUpdate(lastUpdate)}</span>}
            {nextRefreshIn > 0 && (
              <span className="flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" />
                {t('dashboard.nextRefresh')}: {Math.floor(nextRefreshIn / 60)}:{String(nextRefreshIn % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        )}
      </div>

      {hasAssets ? (
        <div className="space-y-6">
          {/* Exchange Balances Card (Auto-updating every 5s) */}
          <ExchangeBalanceCard />

          {/* Asset Allocation Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.assetAllocation')}</h3>
            </div>
            
            {valueBySymbol.size > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Array.from(valueBySymbol.entries()).map(([symbol, value]) => ({
                        name: symbol,
                        value: value,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Array.from(valueBySymbol.entries()).map((_, index) => {
                        const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">Loading allocation data...</p>
            )}  
          </div>

          {/* Portfolio History Chart */}
          <PortfolioChart />

          {/* Total Holdings by Coin */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.byCoin')}</h3>
            </div>
            
            {coinAggregates.size > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{t('common.symbol')}</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{t('common.amount')}</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{t('common.value')}</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-gray-900 dark:text-gray-100">% {t('dashboard.ofPortfolio')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(coinAggregates.entries())
                      .sort((a, b) => b[1].value - a[1].value) // Sort by value descending
                      .map(([symbol, data]) => {
                        const percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
                        return (
                          <tr key={symbol} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="py-3 px-2">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{symbol}</span>
                            </td>
                            <td className="text-right py-3 px-2 text-gray-600 dark:text-gray-400">
                              {data.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                            </td>
                            <td className="text-right py-3 px-2 font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(data.value)}
                            </td>
                            <td className="text-right py-3 px-2">
                              <span className="inline-flex items-center px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                                {percentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">Loading coin data...</p>
            )}
          </div>

          {/* Platform Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.byPlatform')}</h3>
            </div>
            
            <div className="space-y-3">
              {wallets.map((wallet: WalletType) => {
                const value = walletValues.get(wallet.id!) || 0;
                const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                
                return (
                  <button
                    key={wallet.id}
                    onClick={() => handleOpenPlatformDetail(wallet)}
                    className="w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{wallet.name}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(value)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{percentage.toFixed(1)}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Welcome to Crypto Tracker
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Start by adding your wallets and assets in the Portfolio tab
          </p>
        </div>
      )}

      {/* Platform Detail Modal */}
      <PlatformDetailModal
        isOpen={isPlatformModalOpen}
        onClose={() => {
          setIsPlatformModalOpen(false);
          setSelectedWallet(null);
        }}
        wallet={selectedWallet}
        assets={selectedWallet ? getWalletAssets(selectedWallet.id) : []}
        onAddAsset={handleAddAssetToWallet}
      />
    </div>
  );
}
