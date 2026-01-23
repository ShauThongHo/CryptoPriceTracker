import { Wallet, Plus } from 'lucide-react';
import { useState } from 'react';
import { useWallets, useWalletOperations } from '../hooks/useWallets';
import { useAssets, useAssetOperations } from '../hooks/useAssets';
import AddWalletModal from '../components/AddWalletModal';
import AddAssetModal from '../components/AddAssetModal';
import EditAssetModal from '../components/EditAssetModal';
import WalletCard from '../components/WalletCard';
import { PortfolioSkeleton } from '../components/LoadingSkeletons';
import type { Asset } from '../db/db';
import { useTranslation } from 'react-i18next';

export default function Portfolio() {
  const { t } = useTranslation();
  const { wallets, isLoading: walletsLoading } = useWallets();
  const { assets } = useAssets();
  const { addWallet, deleteWallet } = useWalletOperations();
  const { addAsset, updateAsset, deleteAsset } = useAssetOperations();

  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isEditAssetOpen, setIsEditAssetOpen] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const handleAddWallet = async (wallet: { name: string; type: 'hot' | 'cold' | 'exchange' }) => {
    await addWallet(wallet);
  };

  const handleDeleteWallet = async (id: number) => {
    if (confirm(t('portfolio.deleteWalletConfirm'))) {
      await deleteWallet(id);
    }
  };

  const handleAddAsset = async (asset: {
    walletId: number;
    symbol: string;
    amount: number;
    tags?: string;
    notes?: string;
  }) => {
    await addAsset(asset);
  };

  const handleDeleteAsset = async (id: number) => {
    if (confirm(t('portfolio.deleteAssetConfirm'))) {
      await deleteAsset(id);
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsEditAssetOpen(true);
  };

  const handleUpdateAsset = async (id: number, updates: { amount: number; tags?: string; notes?: string }) => {
    await updateAsset(id, updates);
  };

  const openAddAssetForWallet = (walletId: number) => {
    setSelectedWalletId(walletId);
    setIsAddAssetOpen(true);
  };

  const getWalletAssets = (walletId: number | undefined) => {
    if (!walletId) return [];
    return assets.filter((asset) => asset.walletId === walletId);
  };

  return (
    <div className="p-6 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('portfolio.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('portfolio.subtitle')}</p>
      </div>

      {/* Add Wallet Button */}
      <button
        onClick={() => setIsAddWalletOpen(true)}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl p-4 flex items-center justify-center gap-2 font-medium shadow-lg transition-colors mb-6"
      >
        <Plus className="w-5 h-5" />
        {t('portfolio.addWallet')}
      </button>

      {/* Loading State */}
      {walletsLoading && <PortfolioSkeleton />}

      {/* Wallets List */}
      {!walletsLoading && wallets.length > 0 && (
        <div className="space-y-4">
          {wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              assets={getWalletAssets(wallet.id)}
              onDelete={() => wallet.id && handleDeleteWallet(wallet.id)}
              onAddAsset={() => wallet.id && openAddAssetForWallet(wallet.id)}
              onEditAsset={handleEditAsset}
              onDeleteAsset={handleDeleteAsset}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!walletsLoading && wallets.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-3">
            <Wallet className="w-16 h-16 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Wallets Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Create your first wallet to start tracking your crypto assets
          </p>
        </div>
      )}

      {/* Modals */}
      <AddWalletModal
        isOpen={isAddWalletOpen}
        onClose={() => setIsAddWalletOpen(false)}
        onAdd={handleAddWallet}
      />

      <AddAssetModal
        isOpen={isAddAssetOpen}
        onClose={() => {
          setIsAddAssetOpen(false);
          setSelectedWalletId(null);
        }}
        wallets={wallets}
        onAdd={handleAddAsset}
        preselectedWalletId={selectedWalletId || undefined}
      />

      <EditAssetModal
        isOpen={isEditAssetOpen}
        onClose={() => {
          setIsEditAssetOpen(false);
          setEditingAsset(null);
        }}
        asset={editingAsset}
        onUpdate={handleUpdateAsset}
      />
    </div>
  );
}

