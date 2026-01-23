import { Wallet as WalletIcon, Trash2, ChevronDown, ChevronUp, Plus, Edit2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Wallet, Asset } from '../db/db';
import { priceService } from '../services/priceService';

interface WalletCardProps {
  wallet: Wallet;
  assets: Asset[];
  onDelete: () => void;
  onAddAsset: () => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (assetId: number) => void;
}

interface AssetWithValue extends Asset {
  priceUsd?: number;
  totalValue?: number;
}

export default function WalletCard({
  wallet,
  assets,
  onDelete,
  onAddAsset,
  onEditAsset,
  onDeleteAsset,
}: WalletCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [assetsWithValues, setAssetsWithValues] = useState<AssetWithValue[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // Fetch prices for assets
  useEffect(() => {
    async function fetchPrices() {
      if (assets.length === 0) {
        setAssetsWithValues([]);
        return;
      }

      setIsLoadingPrices(true);
      const enrichedAssets: AssetWithValue[] = [];

      for (const asset of assets) {
        const result = await priceService.getPrice(asset.symbol);
        const price = result?.price;
        enrichedAssets.push({
          ...asset,
          priceUsd: price || undefined,
          totalValue: price ? price * asset.amount : undefined,
        });
      }

      setAssetsWithValues(enrichedAssets);
      setIsLoadingPrices(false);
    }

    fetchPrices();
  }, [assets]);

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
    hot: 'bg-orange-100 text-orange-700',
    cold: 'bg-blue-100 text-blue-700',
    exchange: 'bg-purple-100 text-purple-700',
  };

  const walletTypeLabels = {
    hot: 'Hot',
    cold: 'Cold',
    exchange: 'Exchange',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Wallet Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <WalletIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{wallet.name}</h3>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  walletTypeColors[wallet.type]
                }`}
              >
                {walletTypeLabels[wallet.type]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-500 hover:text-red-700 transition-colors"
              aria-label="Delete wallet"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Asset Count */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
        </div>
      </div>

      {/* Assets List (Expandable) */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {assets.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
              No assets in this wallet yet
            </div>
          ) : (
            assetsWithValues.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatNumber(asset.amount)} {asset.symbol}
                      </span>
                      {asset.tags && (
                        <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                          {asset.tags}
                        </span>
                      )}
                    </div>
                    {asset.totalValue !== undefined ? (
                      <div className="font-semibold text-primary-600 dark:text-primary-400">
                        {formatCurrency(asset.totalValue)}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 dark:text-gray-500">
                        {isLoadingPrices ? 'Loading...' : 'Price N/A'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Added {new Date(asset.createdAt).toLocaleDateString()}</span>
                    {asset.priceUsd !== undefined && (
                      <span>@ {formatCurrency(asset.priceUsd)}</span>
                    )}
                  </div>
                  {asset.notes && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                      {asset.notes}
                    </div>
                  )}
                </div>
                <div className="ml-3 flex items-center gap-1">
                  <button
                    onClick={() => onEditAsset(asset)}
                    className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                    aria-label={`Edit ${asset.symbol}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => asset.id && onDeleteAsset(asset.id)}
                    className="p-2 text-red-500 hover:text-red-700 transition-colors"
                    aria-label={`Delete ${asset.symbol}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Add Asset Button */}
          <button
            onClick={onAddAsset}
            className="w-full py-2.5 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Asset to {wallet.name}
          </button>
        </div>
      )}
    </div>
  );
}
