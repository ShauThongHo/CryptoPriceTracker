import { X, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Wallet, Asset } from '../db/db';
import { priceService } from '../services/priceService';
import { usePrices } from '../hooks/usePrices';
import PortfolioChart from './PortfolioChart';
import { useTranslation } from 'react-i18next';

interface PlatformDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: Wallet | null;
  assets: Asset[];
  onAddAsset: () => void;
}

interface AssetWithValue extends Asset {
  priceUsd?: number;
  totalValue?: number;
}

export default function PlatformDetailModal({
  isOpen,
  onClose,
  wallet,
  assets,
  onAddAsset,
}: PlatformDetailModalProps) {
  const { t } = useTranslation();
  const [assetsWithValues, setAssetsWithValues] = useState<AssetWithValue[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const { prices } = usePrices(); // Monitor price changes

  useEffect(() => {
    async function calculateValues() {
      if (!wallet || assets.length === 0) {
        setAssetsWithValues([]);
        setTotalValue(0);
        return;
      }

      const enrichedAssets: AssetWithValue[] = [];
      let total = 0;

      for (const asset of assets) {
        const result = await priceService.getPrice(asset.symbol);
        const price = result?.price;
        const value = price ? price * asset.amount : 0;
        
        enrichedAssets.push({
          ...asset,
          priceUsd: price,
          totalValue: value,
        });
        total += value;
      }

      setAssetsWithValues(enrichedAssets);
      setTotalValue(total);
    }

    calculateValues();
  }, [wallet, assets, prices]); // Recalculate when prices update

  if (!isOpen || !wallet) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value);
  };

  const walletTypeColors = {
    hot: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    cold: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    exchange: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 pb-4 border-b border-gray-200 dark:border-gray-700 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{wallet.name}</h2>
              <span
                className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                  walletTypeColors[wallet.type]
                }`}
              >
                {wallet.type.charAt(0).toUpperCase() + wallet.type.slice(1)} Wallet
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-4 text-white">
            <div className="text-sm text-primary-100 mb-1">{t('platformDetail.totalValue')}</div>
            <div className="text-3xl font-bold">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-sm text-primary-100 mt-1">
              {assets.length} {assets.length === 1 ? t('common.asset') : t('common.assets')}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Historical Chart for this wallet */}
          {wallet.id && <PortfolioChart walletId={wallet.id} />}

          {/* Assets List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('platformDetail.assets')}</h3>
            {assets.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                {t('portfolio.noAssets')}
              </div>
            ) : (
              <div className="space-y-2">
                {assetsWithValues.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatNumber(asset.amount)} {asset.symbol}
                        </span>
                        {asset.tags && (
                          <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                            {asset.tags}
                          </span>
                        )}
                      </div>
                      {asset.notes && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 italic mb-1">
                          {asset.notes}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {asset.priceUsd ? `@ ${formatCurrency(asset.priceUsd)}` : 'Price N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      {asset.totalValue !== undefined ? (
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(asset.totalValue)}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 dark:text-gray-500">
                          {t('common.loading')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Asset Button */}
          <button
            onClick={() => {
              onClose();
              onAddAsset();
            }}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Asset to {wallet.name}
          </button>
        </div>
      </div>
    </div>
  );
}
